import fastify, {
  FastifyInstance,
  FastifyLoggerOptions,
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
        statusService: {
          url: config.STATUS_SERVICE_URL,
          reachable: lastStatusRefresh !== null,
          lastRefreshedAt: lastStatusRefresh?.toISOString() ?? null,
          sources: statusClient.size,
        },
      });
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
