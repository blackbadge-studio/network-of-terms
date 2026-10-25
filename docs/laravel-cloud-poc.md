# Proof of concept on Laravel Cloud

One Cloud application runs both services from the repository root:

| Process                             | Command                | Port                  |
| ----------------------------------- | ---------------------- | --------------------- |
| Web (GraphQL API)                   | `npm start`            | `PORT` (set by Cloud) |
| Background process (status monitor) | `npm run start:status` | `3000`, internal only |

## Application settings

- Root directory: repository root (the build needs the whole Nx workspace and the root `node_modules`).
- Runtime: Node.js 22.
- Build commands:

      npm ci --audit false
      npm run build

- Start command: `npm start`
- Background process: `npm run start:status`
- Resources: attach a Postgres database (Cloud injects `DATABASE_URL`, which the status service reads).

## Environment variables

| Variable                   | Value                      |
| -------------------------- | -------------------------- |
| `TRUST_PROXY`              | `true`                     |
| `STATUS_SERVICE_URL`       | `http://127.0.0.1:3000`    |
| `LDES_BASE_URL`            | `https://<app-url>/status` |
| `POLLING_INTERVAL_SECONDS` | `300`                      |
| `LOG_LEVEL`                | `info`                     |

`GTAA_CREDENTIALS` is only needed for the Dutch GTAA sources; leave it unset and those sources fail, which is fine for the POC.

## Outbound network

At startup the catalog loader fetches the JSON-LD context from `https://schema.org`, and every search calls the SPARQL endpoints of the sources. Both need outbound HTTPS.

## Smoke test

    curl https://<app-url>/graphql -H 'content-type: application/json' \
      -d '{"query":"{ terms(sources:[\"http://vocab.getty.edu/aat\"], query:\"fotografie\", limit: 3) { source { name } result { ... on Terms { terms { uri prefLabel } } } responseTimeMs } }"}'
