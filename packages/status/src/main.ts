import { getCatalog } from '@netwerk-digitaal-erfgoed/network-of-terms-catalog';
import {
  MonitorService,
  PostgresObservationStore,
} from '@lde/distribution-monitor';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { rdfSerializer } from 'rdf-serialize';
import pino from 'pino';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { config } from './config.js';
import { extractMonitorConfigs } from './sync/monitor-sync.js';
import { LdesSerializer, enrichObservations } from './ldes/serializer.js';
import { UptimeReader, summarize, type UptimeSummary } from './uptime.js';

const logger = pino({ level: 'info' });

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read version from package.json (same dir in Docker, one level up in dev)
const packageJsonPath = existsSync(join(__dirname, 'package.json'))
  ? join(__dirname, 'package.json')
  : join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const userAgent = `network-of-terms-status/${packageJson.version} (+https://github.com/netwerk-digitaal-erfgoed/network-of-terms)`;

try {
  logger.info('Starting SPARQL endpoint monitoring service...');

  // Initialize store
  const store = await PostgresObservationStore.create(config.DATABASE_URL);
  logger.info('Database initialized');

  // Load catalog
  const catalog = await getCatalog();
  logger.info({ datasetCount: catalog.datasets.length }, 'Catalog loaded');

  // Extract monitor configurations from catalog (one per dataset)
  const monitors = extractMonitorConfigs(catalog);
  logger.info(
    { monitorCount: monitors.length },
    'Monitor configurations extracted',
  );

  // Initialize LDES serializer
  const serializer = new LdesSerializer({ baseUrl: config.LDES_BASE_URL });

  // Initialize monitor service with 10s timeout per distribution. Retry
  // connection-level failures within a check so transient resets (the cause of
  // the Gouda Tijdmachine flapping) don’t flip a healthy source to unavailable.
  const monitorService = new MonitorService({
    store,
    monitors,
    intervalSeconds: config.POLLING_INTERVAL_SECONDS,
    timeoutMs: 10000,
    retries: 2,
    headers: new Headers({ 'User-Agent': userAgent }),
  });

  // Initialize Fastify server
  const fastify = Fastify({ logger: true });
  await fastify.register(cors);

  // Get available content types for content negotiation
  const contentTypes = await rdfSerializer.getContentTypes();
  const defaultContentType = 'application/ld+json';

  // Helper to get content type from Accept header
  const getContentType = (accept: string | undefined): string => {
    if (!accept || accept === '*/*') return defaultContentType;
    for (const contentType of contentTypes) {
      if (accept.includes(contentType)) {
        return contentType;
      }
    }
    return defaultContentType;
  };

  // LDES stream metadata (links to view)
  fastify.get('/', async (request, reply) => {
    const contentType = getContentType(request.headers.accept);
    const stream = serializer.serializeStreamMetadata(contentType);
    return reply.type(contentType).send(stream);
  });

  // LDES view with observation members (for GraphQL StatusClient)
  fastify.get('/observations/latest', async (request, reply) => {
    const observations = await store.getLatest();
    const enriched = enrichObservations(observations, monitors);
    const contentType = getContentType(request.headers.accept);
    const stream = serializer.serializeLatestView(enriched, contentType);
    return reply.type(contentType).send(stream);
  });

  // Uptime per source for a status page: the share of successful checks per day and over the
  // last 24 hours, 7 days and the whole period. The history is read from the same table the
  // monitor writes; the answer is kept for a minute, a status page asks often.
  const uptimeReader = new UptimeReader(config.DATABASE_URL);
  const uptimeCache = new Map<number, { at: number; summary: UptimeSummary }>();
  fastify.get('/uptime', async (request, reply) => {
    const wanted = Number((request.query as { days?: string }).days ?? 90);
    const days = Number.isFinite(wanted)
      ? Math.min(90, Math.max(1, Math.round(wanted)))
      : 90;
    const cached = uptimeCache.get(days);
    if (cached && Date.now() - cached.at < 60_000) {
      return reply.send(cached.summary);
    }
    try {
      const [dayRows, windowRows, latest] = await Promise.all([
        uptimeReader.dayRows(days),
        uptimeReader.windowRows(),
        store.getLatest(),
      ]);
      const summary = summarize({
        sources: monitors.map((monitor) => ({
          uri: monitor.identifier,
          name: catalog.getDatasetByIri(monitor.identifier)?.name ?? {},
          endpoint: monitor.distribution.accessUrl.toString(),
        })),
        dayRows,
        windowRows,
        latest: new Map(
          [...latest.values()].map((observation) => [
            observation.monitor,
            {
              observedAt: observation.observedAt.toISOString(),
              success: observation.success,
              responseTimeMs: observation.responseTimeMs,
            },
          ]),
        ),
        days,
        pollingIntervalSeconds: config.POLLING_INTERVAL_SECONDS,
        now: new Date(),
      });
      uptimeCache.set(days, { at: Date.now(), summary });
      return reply.send(summary);
    } catch (error) {
      logger.error({ error }, 'Uptime summary failed');
      return reply
        .status(503)
        .send({ status: 'error', message: 'Uptime history unavailable' });
    }
  });

  // Health check for probes and central monitoring. Reading the latest observations also proves
  // the database connection works, which is what this service depends on.
  fastify.get('/health', async (request, reply) => {
    try {
      const latest = await store.getLatest();
      return reply.send({
        status: 'ok',
        version: packageJson.version,
        monitors: monitors.length,
        observations: latest.size,
        pollingIntervalSeconds: config.POLLING_INTERVAL_SECONDS,
      });
    } catch (error) {
      logger.error({ error }, 'Health check failed');
      return reply.status(503).send({
        status: 'error',
        version: packageJson.version,
        message: 'Observation store unavailable',
      });
    }
  });

  // Handle graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    monitorService.stop();
    await fastify.close();
    await uptimeReader.close();
    await store.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Start monitoring
  monitorService.start();
  logger.info('Monitoring service started');

  // Run initial check if configured
  if (config.RUN_ON_START) {
    logger.info('Running initial check...');
    await monitorService.checkAll();
  }

  // Start HTTP server
  await fastify.listen({ port: config.PORT, host: process.env.HOST || '::' });
} catch (error) {
  logger.error({ error }, 'Failed to start monitoring service');
  process.exit(1);
}
