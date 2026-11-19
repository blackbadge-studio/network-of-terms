import {
  type Catalog,
  type Dataset,
  type Distribution,
  buildSearchQuery,
  compactQuery,
  QueryMode,
} from '@netwerk-digitaal-erfgoed/network-of-terms-query';
import { Distribution as ProbeDistribution } from '@lde/dataset';
import type { MonitorConfig } from '@lde/distribution-monitor';
import type * as RDF from '@rdfjs/types';

/**
 * Serialize RDF term to SPARQL syntax.
 */
function serializeTerm(term: RDF.Term): string {
  if (term.termType === 'NamedNode') {
    return `<${term.value}>`;
  }
  if (term.termType === 'Literal') {
    if (term.datatype?.value === 'http://www.w3.org/2001/XMLSchema#integer') {
      return term.value;
    }
    return `"${term.value.replace(/"/g, '\\"')}"`;
  }
  return `"${term.value}"`;
}

/**
 * Build a query with bindings substituted into the query string.
 */
function buildMonitorQuery(
  dataset: Dataset,
  distribution: Distribution,
): string {
  const { query, bindings } = buildSearchQuery({
    dataset,
    distribution,
    searchTerm: 'test',
    queryMode: QueryMode.OPTIMIZED,
    limit: 1,
  });

  // Without comments and indentation, as the API sends it: Getty refuses a request over 8 kB, and
  // the AAT search is larger than that as written.
  let substituted = compactQuery(query);
  for (const [varName, term] of Object.entries(bindings)) {
    const regex = new RegExp(`\\?${varName}\\b`, 'g');
    substituted = substituted.replace(regex, serializeTerm(term));
  }

  return substituted;
}

/**
 * Extract monitor configurations from catalog.
 * Creates one monitor per dataset, using the dataset IRI as the identifier.
 *
 * Each monitor targets a SPARQL {@link ProbeDistribution}; the per-source
 * CONSTRUCT search query is passed as `sparqlQuery` so the probe checks the
 * same query as before. Credentials embedded in the endpoint URL are preserved
 * on the distribution’s `accessUrl` and turned into an `Authorization` header
 * by the probe.
 */
export function extractMonitorConfigs(catalog: Catalog): MonitorConfig[] {
  const monitors: MonitorConfig[] = [];

  for (const dataset of catalog.datasets) {
    const distribution = dataset.distributions[0];
    if (!distribution?.endpoint || !distribution?.searchQuery) {
      continue;
    }

    monitors.push({
      identifier: dataset.iri,
      distribution: ProbeDistribution.sparql(
        new URL(distribution.endpoint.toString()),
      ),
      sparqlQuery: buildMonitorQuery(dataset, distribution),
    });
  }

  return monitors;
}
