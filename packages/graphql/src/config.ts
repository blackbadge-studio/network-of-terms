import { envSchema, JSONSchemaType } from 'env-schema';

const schema = {
  type: 'object',
  properties: {
    TRUST_PROXY: {
      type: 'boolean',
      default: false,
    },
    STATUS_SERVICE_URL: {
      type: 'string',
      default: 'https://status.termennetwerk.netwerkdigitaalerfgoed.nl',
      description: 'Base URL of the status service',
    },
    LOG_LEVEL: {
      type: 'string',
      default: 'info',
    },
    CACHE_TTL_TERMS: {
      type: 'number',
      default: 0,
      description:
        'Seconds a successful search result per source stays cached; 0 disables it. Sources are ' +
        'queried live (F2.12), so keep this short.',
    },
    CACHE_TTL_LOOKUP: {
      type: 'number',
      default: 0,
      description:
        'Seconds a successful lookup per URI stays cached; 0 disables it.',
    },
    CACHE_MAX_ENTRIES: {
      type: 'number',
      default: 5000,
      description:
        'Entries kept by the in-memory cache (used when no Redis/Valkey is configured).',
    },
    REDIS_URL: {
      type: 'string',
      description: 'Redis/Valkey URL; takes precedence over REDIS_HOST.',
    },
    REDIS_HOST: {
      type: 'string',
      description: 'Injected by Laravel Cloud when a Valkey cache is attached.',
    },
    REDIS_PORT: { type: 'number', default: 6379 },
    REDIS_USERNAME: { type: 'string' },
    REDIS_PASSWORD: { type: 'string' },
    REDIS_TLS: {
      type: 'string',
      default: 'auto',
      description:
        "'true', 'false', or 'auto' (TLS unless the host is localhost).",
    },
    MAX_LOOKUP_URIS: {
      type: 'number',
      default: 1000,
      description:
        'Maximum number of URIs in a single lookup. Not a limit anyone should meet in normal use: ' +
        'the query service splits a lookup into batches per source and sizes them to what each ' +
        'source will take. It is there so that one request cannot occupy a source indefinitely - ' +
        'a thousand URIs is already minutes of work at the slowest source.',
    },
  },
};

interface Env {
  TRUST_PROXY: boolean;
  STATUS_SERVICE_URL: string;
  LOG_LEVEL: string;
  MAX_LOOKUP_URIS: number;
  CACHE_TTL_TERMS: number;
  CACHE_TTL_LOOKUP: number;
  CACHE_MAX_ENTRIES: number;
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT: number;
  REDIS_USERNAME?: string;
  REDIS_PASSWORD?: string;
  REDIS_TLS: string;
}

export const config: JSONSchemaType<Env> = envSchema({
  schema,
});
