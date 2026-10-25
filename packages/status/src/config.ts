import { envSchema } from 'env-schema';

const schema = {
  type: 'object',
  required: ['DATABASE_URL'],
  properties: {
    DATABASE_URL: {
      type: 'string',
      description: 'PostgreSQL connection string',
    },
    PORT: {
      type: 'number',
      default: 3000,
      description: 'Port for HTTP server',
    },
    POLLING_INTERVAL_SECONDS: {
      type: 'number',
      default: 300,
      description: 'Polling interval in seconds (default: 300 = 5 minutes)',
    },
    RUN_ON_START: {
      type: 'boolean',
      default: true,
      description: 'Whether to run polling immediately on start',
    },
    LDES_BASE_URL: {
      type: 'string',
      default: 'https://status.termennetwerk.netwerkdigitaalerfgoed.nl',
      description: 'Base URL for LDES stream',
    },
  },
};

interface Env {
  DATABASE_URL: string;
  PORT: number;
  POLLING_INTERVAL_SECONDS: number;
  RUN_ON_START: boolean;
  LDES_BASE_URL: string;
}

const env: Env = envSchema({
  dotenv: true,
  schema,
});

/**
 * Default to `sslmode=prefer` when the connection string does not say
 * otherwise: postgres.js disables TLS unless the URL asks for it, and managed
 * Postgres (e.g. Laravel Cloud's Neon-backed clusters) refuses plain
 * connections with SQLSTATE 28000 "connection is insecure". `prefer` still
 * falls back to plaintext for a local Postgres without TLS.
 */
export function withDefaultSslMode(databaseUrl: string): string {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    return databaseUrl;
  }
  if (!url.searchParams.has('sslmode') && !url.searchParams.has('ssl')) {
    url.searchParams.set('sslmode', 'prefer');
  }
  return url.toString();
}

export const config: Env = {
  ...env,
  DATABASE_URL: withDefaultSslMode(env.DATABASE_URL),
};
