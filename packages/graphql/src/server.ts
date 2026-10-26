import fastify, {
  FastifyInstance,
  FastifyLoggerOptions,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import mercurius from 'mercurius';
import { resolvers } from './resolvers.js';
import { schema } from './schema.js';
import fastifyCors from '@fastify/cors';
import { Server } from 'http';
import {
  Catalog,
  getHttpLogger,
} from '@netwerk-digitaal-erfgoed/network-of-terms-query';
import { EnvSchemaData } from 'env-schema';
import mercuriusLogging from 'mercurius-logging';
import fastifyAccepts from '@fastify/accepts';
import { StatusClient } from './status.js';
import { CacheConfig, createCache } from './cache.js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Version of this package, read from package.json next to the bundle (production image) or one
 * level up (development).
 */
function packageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const candidate of [
    join(here, 'package.json'),
    join(here, '..', 'package.json'),
  ]) {
    if (existsSync(candidate)) {
      try {
        return (
          JSON.parse(readFileSync(candidate, 'utf-8')).version ?? 'unknown'
        );
      } catch {
        return 'unknown';
      }
    }
  }
  return 'unknown';
}

export async function server(
  catalog: Catalog,
  config: EnvSchemaData,
): Promise<FastifyInstance<Server>> {
  const logger: FastifyLoggerOptions = getHttpLogger({
    name: 'http',
    level: config.LOG_LEVEL as string,
  });
  const server = fastify({ logger, trustProxy: config.TRUST_PROXY as boolean });

  // Initialize status client for fetching source availability (refreshes on demand)
  const statusClient = new StatusClient(
    config.STATUS_SERVICE_URL as string,
    server.log,
  );

  const cache = createCache(config as unknown as CacheConfig, server.log);
  const cacheTtl = {
    terms: Number(config.CACHE_TTL_TERMS ?? 0),
    lookup: Number(config.CACHE_TTL_LOOKUP ?? 0),
  };
  server.addHook('onClose', async () => cache.close());

  await server.register(fastifyAccepts);
  await server.register(mercurius, {
    schema: schema(catalog.getLanguages()),
    resolvers,
    graphiql: true,
    context: async (req: FastifyRequest) => {
      return {
        catalog,
        catalogLanguage: req.language(['nl', 'en']) || 'nl',
        statusClient,
        cache,
        cacheTtl,
        // Clients that need a live answer (monitoring, the simulator) can skip cached results.
        cacheBypass: (req.headers['cache-control'] ?? '').includes('no-cache'),
      };
    },
  });
  await server.register(fastifyCors);
  await server.register(mercuriusLogging, {
    logBody: true,
  });
  server.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => {
      void reply.redirect('/graphiql');
    },
  });

  // Health check for liveness/readiness probes and central monitoring: the API is up when it can
  // answer this, the catalog is loaded, and the status service was reached at least once (the
  // latter is informational: a stale status service degrades `Source.status`, not search).
  const version = packageVersion();
  server.route({
    method: 'GET',
    url: '/health',
    handler: (req, reply) => {
      const lastStatusRefresh = statusClient.lastRefreshedAt;
      void reply.send({
        status: 'ok',
        version,
        catalog: { sources: catalog.datasets.length },
        cache: {
          ...cache.stats(),
          ttlTerms: cacheTtl.terms,
          ttlLookup: cacheTtl.lookup,
        },
        statusService: {
          url: config.STATUS_SERVICE_URL,
          reachable: lastStatusRefresh !== null,
          lastRefreshedAt: lastStatusRefresh?.toISOString() ?? null,
          sources: statusClient.size,
        },
      });
    },
  });

  // The status service runs next to this server without a public port, so its LDES (stream
  // metadata at `/`, observations at `/observations/latest`) is served here under `/status`.
  // Accept and the response content type pass through, so content negotiation keeps working.
  const statusBase = (config.STATUS_SERVICE_URL as string).replace(/\/$/, '');
  server.route({
    method: 'GET',
    url: '/status/*',
    handler: async (req, reply) => {
      const path = '/' + ((req.params as { '*': string })['*'] ?? '');
      await proxyStatus(path, req, reply);
    },
  });
  server.route({
    method: 'GET',
    url: '/status',
    handler: async (req, reply) => {
      await proxyStatus('/', req, reply);
    },
  });
  async function proxyStatus(
    path: string,
    req: FastifyRequest,
    reply: FastifyReply,
  ) {
    const query = req.url.includes('?')
      ? req.url.slice(req.url.indexOf('?'))
      : '';
    try {
      const upstream = await fetch(statusBase + path + query, {
        headers: { Accept: req.headers.accept ?? '*/*' },
        signal: AbortSignal.timeout(10_000),
      });
      const contentType = upstream.headers.get('content-type');
      if (contentType) {
        void reply.header('Content-Type', contentType);
      }
      void reply.header('Cache-Control', 'public, max-age=60');
      return reply.status(upstream.status).send(await upstream.text());
    } catch (error) {
      req.log.warn({ err: error }, 'Status service unreachable');
      return reply.status(502).send({ error: 'Status service unreachable' });
    }
  }

  // Acceptance scenarios and their runner, so the simulator in the search interface runs exactly
  // the suite the CLI runs (see docs/vlaams-termennetwerk/testplan.md).
  const scenariosDir = [
    join(dirname(fileURLToPath(import.meta.url)), 'scenarios'),
    join(dirname(fileURLToPath(import.meta.url)), '..', 'scenarios'),
  ].find((dir) => existsSync(join(dir, 'scenarios.json')));
  const testFiles: Record<string, string> = {
    'scenarios.json': 'application/json; charset=utf-8',
    'runner.mjs': 'text/javascript; charset=utf-8',
  };
  server.route({
    method: 'GET',
    url: '/tests/:file',
    handler: (req, reply) => {
      const file = (req.params as { file: string }).file;
      if (!scenariosDir || !(file in testFiles)) {
        return reply.status(404).send({ error: 'Not found' });
      }
      return reply
        .header('Content-Type', testFiles[file])
        .header('Cache-Control', 'public, max-age=300')
        .send(readFileSync(join(scenariosDir, file), 'utf-8'));
    },
  });

  // Redirect /playground to /graphiql for BC.
  server.route({
    method: 'GET',
    url: '/playground',
    handler: (req, reply) => {
      void reply.redirect('/graphiql', 301);
    },
  });

  return server;
}
