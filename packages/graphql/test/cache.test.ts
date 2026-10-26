import { describe, expect, it } from 'vitest';
import { MemoryCache, NoCache, cacheKey, createCache } from '../src/cache.js';

describe('MemoryCache', () => {
  it('returns what it stored until the TTL runs out', async () => {
    let now = 1_000;
    const cache = new MemoryCache(10, () => now);
    await cache.set('a', { v: 1 }, 60);
    expect(await cache.get('a')).toEqual({ v: 1 });
    now += 61_000;
    expect(await cache.get('a')).toBeUndefined();
    expect(cache.stats()).toMatchObject({ hits: 1, misses: 1, writes: 1 });
  });

  it('evicts the least recently used entry past its size', async () => {
    const cache = new MemoryCache(2);
    await cache.set('a', 1, 60);
    await cache.set('b', 2, 60);
    await cache.get('a'); // a is now more recent than b
    await cache.set('c', 3, 60);
    expect(await cache.get('b')).toBeUndefined();
    expect(await cache.get('a')).toBe(1);
    expect(await cache.get('c')).toBe(3);
  });

  it('stores nothing with a zero TTL', async () => {
    const cache = new MemoryCache();
    await cache.set('a', 1, 0);
    expect(await cache.get('a')).toBeUndefined();
  });
});

describe('createCache', () => {
  const base = {
    CACHE_TTL_TERMS: 0,
    CACHE_TTL_LOOKUP: 0,
    CACHE_MAX_ENTRIES: 100,
    REDIS_PORT: 6379,
    REDIS_TLS: 'auto',
  };

  it('is off when no TTL is set', () => {
    expect(createCache(base)).toBeInstanceOf(NoCache);
  });

  it('uses memory without Redis settings', () => {
    expect(createCache({ ...base, CACHE_TTL_TERMS: 60 }).backend).toBe(
      'memory',
    );
  });
});

describe('cacheKey', () => {
  it('is stable and depends on every part', () => {
    expect(cacheKey('terms', ['a', 1])).toBe(cacheKey('terms', ['a', 1]));
    expect(cacheKey('terms', ['a', 1])).not.toBe(cacheKey('terms', ['a', 2]));
    expect(cacheKey('terms', ['a'])).not.toBe(cacheKey('lookup', ['a']));
  });
});
