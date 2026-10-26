import { server } from './server.js';
import { getCatalog } from '@netwerk-digitaal-erfgoed/network-of-terms-catalog';
import { shutdownInstrumentation } from '@netwerk-digitaal-erfgoed/network-of-terms-query';
import closeWithGrace from 'close-with-grace';
import { config } from './config.js';

try {
  const httpServer = await server(await getCatalog(), config);
  // On SIGTERM, finish in-flight requests and export the last metrics before exiting.
  closeWithGrace(async ({ err }) => {
    if (err) {
      console.error(err);
    }
    await httpServer.close();
    await shutdownInstrumentation();
  });
  // PORT is set by the platform; next to the GraphQL API it runs on RECONCILIATION_PORT (see the
  // root start:reconciliation script).
  await httpServer.listen({
    port: Number(process.env.PORT) || 3123,
    host: process.env.HOST || '::',
  });
} catch (err) {
  console.error(err);
  process.exitCode = 1;
}
