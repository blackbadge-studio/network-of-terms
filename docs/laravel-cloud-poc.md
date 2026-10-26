# Proof of concept on Laravel Cloud

One Cloud application runs both services from the repository root:

| Process                             | Command                | Port                  |
| ----------------------------------- | ---------------------- | --------------------- |
| Web (GraphQL API)                   | `npm start`            | `PORT` (set by Cloud) |
| Background process (status monitor) | `npm run start:status` | `3001`, internal only |

## Application settings

- Root directory: repository root (the build needs the whole Nx workspace and the root `node_modules`).
- Runtime: Node.js 22.
- Build commands:

      npm ci --audit false
      npm run build

- Start command: `npm start`
- Background process: `npm run start:status`
  Cloud sets `PORT=3000` for every process in the container, so the root `start:status` script overrides it to `STATUS_PORT` (default `3001`) to keep the monitor off the web server's port.
- Resources: attach a Postgres database (Cloud injects `DATABASE_URL`, which the status service reads) (no cache: the result cache is off, see `docs/vlaams-termennetwerk/cache.md`).

## Environment variables

| Variable                   | Value                      |
| -------------------------- | -------------------------- |
| `TRUST_PROXY`              | `true`                     |
| `STATUS_SERVICE_URL`       | `http://127.0.0.1:3001`    |
| `LDES_BASE_URL`            | `https://<app-url>/status` |
| `POLLING_INTERVAL_SECONDS` | `300`                      |
| `LOG_LEVEL`                | `info`                     |

`GTAA_CREDENTIALS` is only needed for the Dutch GTAA sources; leave it unset and those sources fail, which is fine for the POC.

## Outbound network

At startup the catalog loader fetches the JSON-LD context from `https://schema.org`, and every search calls the SPARQL endpoints of the sources. Both need outbound HTTPS.

## Smoke test

    curl https://<app-url>/graphql -H 'content-type: application/json' \
      -d '{"query":"{ terms(sources:[\"http://vocab.getty.edu/aat\"], query:\"fotografie\", limit: 3) { source { name } result { ... on Terms { terms { uri prefLabel } } } responseTimeMs } }"}'

## Reconciliation (off by default)

The Reconciliation Service API is built but switched off (`RECONCILIATION_ENABLED` unset). To turn it on, set `RECONCILIATION_ENABLED=true`, `RECONCILIATION_URL_TEMPLATE=https://<app-url>/reconcile/{dataset}` and `VIEW_URL_TEMPLATE`, and add a background process `npm run start:reconciliation` (internal port 3002). See `docs/vlaams-termennetwerk/reconciliation.md`.
