import { createHash } from 'node:crypto';
import { Redis } from 'ioredis';
import type { FastifyBaseLogger } from 'fastify';

/**
 * A short-lived cache for successful per-source results. The Termennetwerk queries sources live
 * (bestek F2.12), so this cache only smooths repeated identical requests within a few minutes:
 * errors and timeouts are never stored, and clients can bypass it with `Cache-Control: no-cache`.
 */
export interface ResultCache {
  readonly backend: 'off' | 'memory' | 'valkey';
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  stats(): CacheStats;
  close(): Promise<void>;
}

export interface CacheStats {
  backend: ResultCache['backend'];
  connection?: {
    host: string;
    port: number;
    tls: boolean;
    ready: boolean;
    lastError?: string;
  };
  hits: number;
  misses: number;
  writes: number;
  errors: number;
}

export interface CacheConfig {
  CACHE_TTL_TERMS: number;
  CACHE_TTL_LOOKUP: number;
  CACHE_MAX_ENTRIES: number;
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT: number;
  REDIS_USERNAME?: string;
  REDIS_PASSWORD?: string;
  REDIS_TLS: string;
  REDIS_SCHEME?: string;
}

const PREFIX = 'vtn:cache:v1:';
// Laravel Valkey force-closes connections that send oversized messages; stay well below.
const MAX_VALUE_BYTES = 512 * 1024;

export function cacheKey(kind: string, parts: unknown[]): string {
  return (
    PREFIX +
    kind +
    ':' +
    createHash('sha1').update(JSON.stringify(parts)).digest('hex')
  );
}

abstract class CountingCache implements ResultCache {
  abstract readonly backend: ResultCache['backend'];
  protected counters = { hits: 0, misses: 0, writes: 0, errors: 0 };

  abstract get<T>(key: string): Promise<T | undefined>;
  abstract set(key: string, value: unknown, ttlSeconds: number): Promise<void>;

  stats(): CacheStats {
    return { backend: this.backend, ...this.counters };
  }

  async close(): Promise<void> {
    // Nothing to release by default.
  }
}

export class NoCache extends CountingCache {
  readonly backend = 'off' as const;
  async get<T>(): Promise<T | undefined> {
    return undefined;
  }
  async set(): Promise<void> {
    // Caching is off: nothing is stored.
  }
}

/** In-process cache for a single replica or local development. Oldest entries go first. */
export class MemoryCache extends CountingCache {
  readonly backend = 'memory' as const;
  private readonly entries = new Map<
    string,
    { value: string; expires: number }
  >();

  constructor(
    private readonly maxEntries = 5000,
    private readonly now: () => number = Date.now,
  ) {
    super();
  }

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.entries.get(key);
    if (entry === undefined || entry.expires <= this.now()) {
      if (entry !== undefined) {
        this.entries.delete(key);
      }
      this.counters.misses++;
      return undefined;
    }
    // Re-insert so the map's insertion order doubles as least-recently-used order.
    this.entries.delete(key);
    this.entries.set(key, entry);
    this.counters.hits++;
    return JSON.parse(entry.value) as T;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds <= 0 || serialized.length > MAX_VALUE_BYTES) {
      return;
    }
    this.entries.delete(key);
    this.entries.set(key, {
      value: serialized,
      expires: this.now() + ttlSeconds * 1000,
    });
    while (this.entries.size > this.maxEntries) {
      this.entries.delete(this.entries.keys().next().value!);
    }
    this.counters.writes++;
  }
}

/**
 * Shared cache for several replicas: Laravel Valkey on Laravel Cloud (which injects REDIS_HOST,
 * REDIS_PORT, REDIS_USERNAME and REDIS_PASSWORD when a cache is attached), or any Redis/Valkey.
 * A cache that is down or slow never fails a request: every error counts as a miss.
 */
export interface ValkeyTarget {
  host: string;
  port: number;
  username?: string;
  password?: string;
  /** true, false, or 'auto': try TLS first and fall back to plain TCP if the server resets it. */
  tls: boolean | 'auto';
}

export class ValkeyCache extends CountingCache {
  readonly backend = 'valkey' as const;
  private client: Redis;
  private tls: boolean;
  private ready = false;
  private lastError?: string;

  constructor(
    private readonly target: ValkeyTarget | string,
    private readonly logger?: FastifyBaseLogger,
  ) {
    super();
    this.tls =
      typeof target === 'string'
        ? target.startsWith('rediss:')
        : target.tls !== false;
    this.client = this.connect();
  }

  private connect(): Redis {
    const common = {
      // Fail fast instead of queueing: a slow cache must not slow down search.
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      commandTimeout: 500,
    };
    const client =
      typeof this.target === 'string'
        ? new Redis(this.target, common)
        : new Redis({
            ...common,
            host: this.target.host,
            port: this.target.port,
            username: this.target.username || undefined,
            password: this.target.password || undefined,
            tls: this.tls ? { servername: this.target.host } : undefined,
          });
    client.on('ready', () => {
      this.ready = true;
      this.logger?.info({ tls: this.tls }, 'Cache connected');
    });
    client.on('error', (error: NodeJS.ErrnoException) => {
      this.counters.errors++;
      this.lastError = error.code ?? error.message;
      // Laravel Cloud's private Valkey endpoint may speak plain TCP: a TLS handshake against it is
      // reset before the first ready. Switch once, then keep whatever works.
      if (
        !this.ready &&
        typeof this.target !== 'string' &&
        this.target.tls === 'auto' &&
        this.tls &&
        (error.code === 'ECONNRESET' || /SSL|TLS|EPROTO/i.test(error.message))
      ) {
        this.logger?.warn('Cache TLS handshake reset; retrying without TLS');
        this.tls = false;
        const old = this.client;
        this.client = this.connect();
        old.disconnect();
        return;
      }
      this.logger?.warn({ err: error }, 'Cache connection error');
    });
    return client;
  }

  override stats(): CacheStats {
    return {
      ...super.stats(),
      connection: {
        host:
          typeof this.target === 'string'
            ? new URL(this.target).hostname
            : this.target.host,
        port:
          typeof this.target === 'string'
            ? Number(new URL(this.target).port || 6379)
            : this.target.port,
        tls: this.tls,
        ready: this.ready,
        lastError: this.lastError,
      },
    };
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.client.get(key);
      if (value === null) {
        this.counters.misses++;
        return undefined;
      }
      this.counters.hits++;
      return JSON.parse(value) as T;
    } catch (error) {
      this.counters.errors++;
      this.counters.misses++;
      this.lastError = (error as Error).message;
      return undefined;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds <= 0 || serialized.length > MAX_VALUE_BYTES) {
      return;
    }
    try {
      await this.client.set(key, serialized, 'EX', ttlSeconds);
      this.counters.writes++;
    } catch (error) {
      this.counters.errors++;
      this.lastError = (error as Error).message;
    }
  }

  override async close(): Promise<void> {
    this.client.disconnect();
  }
}

export function createCache(
  config: CacheConfig,
  logger?: FastifyBaseLogger,
): ResultCache {
  if (config.CACHE_TTL_TERMS <= 0 && config.CACHE_TTL_LOOKUP <= 0) {
    return new NoCache();
  }
  if (!config.REDIS_URL && !config.REDIS_HOST) {
    return new MemoryCache(config.CACHE_MAX_ENTRIES);
  }
  if (config.REDIS_URL) {
    return new ValkeyCache(config.REDIS_URL, logger);
  }
  const host = config.REDIS_HOST!;
  const local = host === 'localhost' || host === '127.0.0.1';
  // REDIS_SCHEME (as Laravel uses it: tcp or tls) wins over REDIS_TLS.
  const scheme = (config.REDIS_SCHEME ?? '').toLowerCase();
  const tls: boolean | 'auto' =
    scheme === 'tls' || scheme === 'rediss'
      ? true
      : scheme === 'tcp' || scheme === 'redis'
        ? false
        : config.REDIS_TLS === 'true'
          ? true
          : config.REDIS_TLS === 'false' || local
            ? false
            : 'auto';
  return new ValkeyCache(
    {
      host,
      port: config.REDIS_PORT,
      username: config.REDIS_USERNAME,
      password: config.REDIS_PASSWORD,
      tls,
    },
    logger,
  );
}
