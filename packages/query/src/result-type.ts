import type RDF from '@rdfjs/types';
import { Dataset, ResultType } from './catalog.js';

/**
 * Classes whose meaning is clear without a source-specific mapping. `skos:Concept` is left out on
 * purpose: nearly every term is one, so it says nothing about what the term denotes.
 */
const builtInMapping: ReadonlyMap<string, ResultType> = new Map([
  ['https://schema.org/Person', ResultType.PERSON],
  ['http://schema.org/Person', ResultType.PERSON],
  ['http://xmlns.com/foaf/0.1/Person', ResultType.PERSON],
  ['https://schema.org/Organization', ResultType.ORGANIZATION],
  ['http://schema.org/Organization', ResultType.ORGANIZATION],
  ['http://xmlns.com/foaf/0.1/Organization', ResultType.ORGANIZATION],
  ['https://schema.org/Place', ResultType.PLACE],
  ['http://schema.org/Place', ResultType.PLACE],
  ['https://schema.org/Event', ResultType.EVENT],
  ['http://schema.org/Event', ResultType.EVENT],
]);

/**
 * The central result type of a term: the source's own type mapping first, then the built-in
 * mapping of well-known classes, then the single type the source declares for all its terms, and
 * `concept` when nothing says otherwise. The term's `rdf:type`s stay available unchanged as
 * {@link additionalTypes}.
 */
export function resultTypeOf(
  term: { types: RDF.Term[] },
  dataset?: Dataset,
): ResultType {
  for (const mapping of dataset?.typeMappings ?? []) {
    if (term.types.some((type) => type.value === mapping.sourceType)) {
      return mapping.resultType;
    }
  }
  for (const type of term.types) {
    const mapped = builtInMapping.get(type.value);
    if (mapped !== undefined) {
      return mapped;
    }
  }
  if (dataset?.resultTypes.length === 1) {
    return dataset.resultTypes[0];
  }
  return ResultType.CONCEPT;
}

/** The term's `rdf:type`s as the source states them. */
export function additionalTypes(term: { types: RDF.Term[] }): string[] {
  return term.types.map((type) => type.value);
}

/** Whether the term passes a type filter; an empty filter passes everything. */
export function matchesResultTypes(
  term: { types: RDF.Term[] },
  types: ResultType[],
  dataset?: Dataset,
): boolean {
  return types.length === 0 || types.includes(resultTypeOf(term, dataset));
}
