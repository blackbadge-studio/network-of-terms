import {
  filterLiteralsByLanguage,
  literalValues,
  Catalog,
  Dataset,
  Distribution,
  DistributionsService,
  Error,
  Feature,
  FeatureType,
  LookupQueryResult,
  LookupResult,
  LookupService,
  NotFoundError,
  QueryMode,
  QueryTermsService,
  Entity,
  OccupationRole,
  RelatedTerm,
  ServerError,
  SourceNotFoundError,
  SourceResult,
  Term,
  TermsResponse,
  TermsResult,
  TimeoutError,
  ResultType,
  Terms,
  additionalTypes,
  matchesResultTypes,
  resultTypeOf,
} from '@netwerk-digitaal-erfgoed/network-of-terms-query';
import * as RDF from '@rdfjs/types';
import { dereferenceGenre } from '@netwerk-digitaal-erfgoed/network-of-terms-catalog';
import type { StatusClient } from './status.js';
import { cacheKey, type ResultCache } from './cache.js';
import { config } from './config.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function listSources(object: any, args: any, context: any): Promise<any> {
  return context.catalog
    .getDatasetsSortedByName(context.catalogLanguage)
    .filter(
      (dataset: Dataset) =>
        !args.genres ||
        dataset.genres.some((genre: string) => args.genres.includes(genre)),
    )
    .flatMap((dataset: Dataset) =>
      dataset.distributions.map((distribution: Distribution) =>
        source(
          distribution,
          dataset,
          context.catalogLanguage,
          context.statusClient,
        ),
      ),
    );
}

async function queryTerms(
  _: unknown,
  args: {
    sources: string[];
    genres?: string[];
    query: string;
    queryMode: string;
    limit: number;
    timeoutMs: number;
    languages: string[];
    types?: string[];
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any,
): Promise<unknown> {
  const catalog: Catalog = context.catalog;
  const types = (args.types ?? []).map(resultTypeFromEnum);
  // A source that declares its result types and offers none of the requested ones is skipped.
  const sources = args.sources.filter((source) => {
    const dataset = catalog.getDatasetByIri(source);
    return dataset === undefined || dataset.mayProvideResultTypes(types);
  });
  if (sources.length === 0) {
    return [];
  }
  const started = performance.now();
  const catalogLanguage = [
    ...(args.languages ?? []),
    context.catalogLanguage,
  ][0];
  const cache: ResultCache = context.cache;
  const ttl: number = context.cacheTtl?.terms ?? 0;
  const keyFor = (source: string) =>
    cacheKey('terms', [
      source,
      args.query,
      args.queryMode,
      args.limit,
      args.genres ?? null,
      args.languages ?? null,
      types,
    ]);

  // Cached sources first; only the rest are queried live.
  const hits = new Map<string, CachedTerms>();
  if (ttl > 0 && !context.cacheBypass) {
    await Promise.all(
      sources.map(async (source) => {
        const hit = await cache.get<CachedTerms>(keyFor(source));
        if (hit) {
          hits.set(source, hit);
        }
      }),
    );
  }
  const misses = sources.filter((source) => !hits.has(source));

  const entries = new Map<string, unknown>();
  if (misses.length > 0) {
    const service = new DistributionsService({
      logger: context.app.log,
      catalog,
    });
    const responses = (
      await service.queryAll({
        sources: misses,
        genres: args.genres,
        query: args.query,
        queryMode: QueryMode[args.queryMode as keyof typeof QueryMode],
        limit: args.limit,
        timeoutMs: args.timeoutMs,
      })
    ).map((response) => filterByResultTypes(response, types, catalog));
    const resolved = resolveTermsResponse(
      responses,
      catalog,
      catalogLanguage,
      args.languages,
      context.statusClient,
    );
    await Promise.all(
      responses.map(async (response, index) => {
        // queryAll answers in the order of the sources it was given.
        const datasetIri = misses[index];
        const entry = resolved[index] as {
          result: unknown;
          terms: object[];
        };
        entries.set(datasetIri, { ...entry, cached: false });
        // Only successful answers are cached: an error or timeout must be retried live.
        if (ttl > 0 && response.result instanceof Terms) {
          const translated = entry.result instanceof TranslatedTerms;
          await cache.set(
            keyFor(datasetIri),
            {
              translated,
              terms: translated
                ? (entry.result as TranslatedTerms).terms
                : entry.terms,
              bcTerms: entry.terms,
            } satisfies CachedTerms,
            ttl,
          );
        }
      }),
    );
  }

  const elapsed = Math.round(performance.now() - started);
  for (const [datasetIri, hit] of hits) {
    const dataset = catalog.getDatasetByIri(datasetIri)!;
    entries.set(datasetIri, {
      source: source(
        dataset.getSparqlDistribution()!,
        dataset,
        catalogLanguage,
        context.statusClient,
      ),
      result: hit.translated
        ? new TranslatedTerms(hit.terms)
        : { terms: hit.terms },
      responseTimeMs: elapsed,
      terms: hit.bcTerms, // For BC.
      cached: true,
    });
  }
  return sources.map((source) => entries.get(source)).filter(Boolean);
}

/** What the result cache keeps per source: the mapped terms, ready to serve. */
interface CachedTerms {
  translated: boolean;
  terms: object[];
  bcTerms: object[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function lookupTerms(object: any, args: any, context: any) {
  // A lookup is split into batches sized to what each source will take, so there is no limit here
  // that a caller should ever meet. This one is a safety valve: a thousand URIs is already minutes
  // of work at the slowest source, and nothing else stops one request occupying it for longer.
  if (args.uris.length > config.MAX_LOOKUP_URIS) {
    throw new globalThis.Error(
      `A lookup takes at most ${config.MAX_LOOKUP_URIS} URIs, got ${args.uris.length}.`,
    );
  }

  const started = performance.now();
  const cache: ResultCache = context.cache;
  const ttl: number = context.cacheTtl?.lookup ?? 0;
  const keyFor = (uri: string) =>
    cacheKey('lookup', [uri, args.languages ?? null]);
  const hits = new Map<string, CachedLookup>();
  if (ttl > 0 && !context.cacheBypass) {
    await Promise.all(
      (args.uris as string[]).map(async (uri) => {
        const hit = await cache.get<CachedLookup>(keyFor(uri));
        if (hit) {
          hits.set(uri, hit);
        }
      }),
    );
  }
  const misses = (args.uris as string[]).filter((uri) => !hits.has(uri));
  const catalogLanguage = [
    ...(args.languages ?? []),
    context.catalogLanguage,
  ][0];

  const service = new LookupService(
    context.catalog,
    new QueryTermsService({
      logger: context.app.log,
    }),
  );
  const results =
    misses.length > 0 ? await service.lookup(misses, args.timeoutMs) : [];

  const fresh = results.map((result: LookupQueryResult) => {
    const dataset =
      result.distribution instanceof SourceNotFoundError
        ? undefined
        : datasetOf(context.catalog, result.distribution);
    return {
      uri: result.uri,
      source:
        result.distribution instanceof SourceNotFoundError
          ? result.distribution
          : source(
              result.distribution,
              context.catalog.getDatasetByDistributionIri(
                result.distribution.iri,
              )!,
              catalogLanguage,
              context.statusClient,
            ),
      result:
        result.result instanceof Term
          ? args.languages === undefined
            ? mapToTerm(result.result, ['nl'], dataset)
            : mapToTranslatedTerm(result.result, args.languages, dataset)
          : result.result,
      responseTimeMs: result.responseTimeMs,
      cached: false,
    };
  });

  // Only found terms are cached; not-found and errors are retried live next time.
  if (ttl > 0) {
    await Promise.all(
      results.map(async (result: LookupQueryResult, index: number) => {
        if (
          result.result instanceof Term &&
          !(result.distribution instanceof SourceNotFoundError)
        ) {
          await cache.set(
            keyFor(result.uri),
            {
              distributionIri: result.distribution.iri,
              result: fresh[index].result,
            } satisfies CachedLookup,
            ttl,
          );
        }
      }),
    );
  }

  const elapsed = Math.round(performance.now() - started);
  const byUri = new Map(fresh.map((entry) => [entry.uri, entry]));
  return (args.uris as string[])
    .map((uri) => {
      const hit = hits.get(uri);
      if (hit === undefined) {
        return byUri.get(uri);
      }
      const dataset = context.catalog.getDatasetByDistributionIri(
        hit.distributionIri,
      )!;
      return {
        uri,
        source: source(
          dataset.getDistributionByIri(hit.distributionIri)!,
          dataset,
          catalogLanguage,
          context.statusClient,
        ),
        result: hit.result,
        responseTimeMs: elapsed,
        cached: true,
      };
    })
    .filter(Boolean);
}

interface CachedLookup {
  distributionIri: string;
  result: unknown;
}

function resolveTermsResponse(
  results: TermsResponse[],
  catalog: Catalog,
  catalogLanguage: string,
  resultLanguages: string[],
  statusClient?: StatusClient,
) {
  return results.map((response: TermsResponse) => {
    if (response.result instanceof Error) {
      return {
        source: source(
          response.result.distribution,
          catalog.getDatasetByDistributionIri(
            response.result.distribution.iri,
          )!,
          catalogLanguage,
          statusClient,
        ),
        result: response.result,
        responseTimeMs: response.responseTimeMs,
        terms: [], // For BC.
      };
    }

    const dataset = catalog.getDatasetByDistributionIri(
      response.result.distribution.iri,
    )!;
    const terms = response.result.terms.map((term) =>
      mapToTerm(term, resultLanguages, dataset),
    );

    return {
      source: source(
        response.result.distribution,
        dataset,
        catalogLanguage,
        statusClient,
      ),
      result:
        resultLanguages === undefined
          ? { terms }
          : new TranslatedTerms(
              response.result.terms.map((term) =>
                mapToTranslatedTerm(term, resultLanguages, dataset),
              ),
            ),
      responseTimeMs: response.responseTimeMs,
      terms, // For BC.
    };
  });
}

class TranslatedTerms {
  constructor(readonly terms: object[]) {}
}

const datasetOf = (catalog: Catalog, distribution: Distribution) =>
  catalog.getDatasetByDistributionIri(distribution.iri);

/** GraphQL enum names are upper case; the query package uses the lower-case catalog values. */
const resultTypeFromEnum = (name: string): ResultType =>
  ResultType[name as keyof typeof ResultType];
const resultTypeToEnum = (type: ResultType): string =>
  Object.entries(ResultType).find(([, value]) => value === type)![0];

/** Keep only the terms of the requested result types; errors pass through untouched. */
function filterByResultTypes(
  response: TermsResponse,
  types: ResultType[],
  catalog: Catalog,
): TermsResponse {
  if (types.length === 0 || !(response.result instanceof Terms)) {
    return response;
  }
  const dataset = datasetOf(catalog, response.result.distribution);
  return new TermsResponse(
    new Terms(
      response.result.distribution,
      response.result.terms.filter((term) =>
        matchesResultTypes(term, types, dataset),
      ),
    ),
    response.responseTimeMs,
  );
}

function mapToTranslatedTerm(
  term: Term,
  languages: string[],
  dataset?: Dataset,
) {
  return {
    type: 'TranslatedTerm',
    uri: term.id!.value,
    resultType: resultTypeToEnum(resultTypeOf(term, dataset)),
    additionalType: additionalTypes(term),
    prefLabel: filterLiteralsByLanguage(term.prefLabels, languages),
    altLabel: filterLiteralsByLanguage(term.altLabels, languages),
    hiddenLabel: filterLiteralsByLanguage(term.hiddenLabels, languages),
    definition: filterLiteralsByLanguage(term.scopeNotes, languages),
    scopeNote: filterLiteralsByLanguage(term.scopeNotes, languages),
    seeAlso: term.seeAlso.map((seeAlso: RDF.NamedNode) => seeAlso.value),
    broader: term.broaderTerms.map((related) => ({
      uri: related.id.value,
      prefLabel: filterLiteralsByLanguage(related.prefLabels, languages),
    })),
    narrower: term.narrowerTerms.map((related) => ({
      uri: related.id.value,
      prefLabel: filterLiteralsByLanguage(related.prefLabels, languages),
    })),
    related: term.relatedTerms.map((related) => ({
      uri: related.id.value,
      prefLabel: filterLiteralsByLanguage(related.prefLabels, languages),
    })),
    exactMatch: term.exactMatches.map((exactMatch) => ({
      uri: exactMatch.id.value,
      prefLabel: filterLiteralsByLanguage(exactMatch.prefLabels, languages),
    })),
    place: denotedPlace(term, (literals) =>
      filterLiteralsByLanguage(literals, languages),
    ),
    person: denotedPerson(
      term,
      (literals) => filterLiteralsByLanguage(literals, languages),
      () => (literals) => filterLiteralsByLanguage(literals, languages),
    ),
  };
}

/**
 * The place that the term denotes, or null if its source describes none. Whether it does is decided
 * on everything the source holds, not on what survives the language filter, so it is a fact about
 * the term rather than about the requested language.
 */
function denotedPlace(
  term: Term,
  inRequestedLanguages: (literals: RDF.Literal[]) => RDF.Literal[],
) {
  const place = term.place;
  return place === undefined
    ? null
    : {
        name: inRequestedLanguages(place.names),
        latitude: place.latitude ?? null,
        longitude: place.longitude ?? null,
        addressCountry: place.addressCountry ?? null,
        additionalType: place.additionalTypes.map((additionalType) => ({
          uri: additionalType.id.value,
          name: inRequestedLanguages(additionalType.prefLabels),
        })),
      };
}

/**
 * The person that the term denotes, or null if its source describes none, decided as for
 * {@link denotedPlace}.
 *
 * The API returns one birth and one death date, documented as EDTF, which reads a plain ISO 8601
 * date, an interval and a qualified date alike. Where a source states several – Wikidata can, when
 * its sources disagree – the first is taken.
 */
function denotedPerson(
  term: Term,
  inRequestedLanguages: (literals: RDF.Literal[]) => RDF.Literal[],
  acrossSet: LanguageSelector,
) {
  const person = term.person;
  if (person === undefined) {
    return null;
  }

  const entities = entitiesIn(acrossSet);
  // A relative is one person whatever its names, so its names fall back on their own.
  const references = (relatives: RelatedTerm[]) =>
    relatives.map((relative) => ({
      uri: relative.id.value,
      name: inRequestedLanguages(relative.prefLabels),
    }));
  return {
    givenName: inRequestedLanguages(person.givenNames),
    familyName: inRequestedLanguages(person.familyNames),
    birthDate: person.birthDates[0] ?? null,
    deathDate: person.deathDates[0] ?? null,
    birthPlace: entities(person.birthPlaces),
    deathPlace: entities(person.deathPlaces),
    hasOccupation: rolesIn(acrossSet)(person.occupations),
    nationality: entities(person.nationalities),
    gender: entities(person.genders),
    parent: references(person.parents),
    children: references(person.children),
    spouse: references(person.spouses),
    sibling: references(person.siblings),
  };
}

/**
 * A role is kept when its occupation or its name survives the language filter; a period alone
 * would say ‘did something from 1625 to 1669’. A source that only names its occupations states
 * one role per name, since nothing tells its Dutch and English names for one occupation apart
 * from its names for two, so once the names in the languages the client did not ask for are
 * gone, a role may have nothing left and is dropped rather than returned empty.
 */
const rolesIn = (acrossSet: LanguageSelector) => (roles: OccupationRole[]) => {
  // Every name list of every role decides the language selection together, so that a fallback
  // applies to the set and not to each role on its own.
  const select = acrossSet(
    roles.flatMap((role) => [
      role.occupation?.prefLabels ?? [],
      role.roleNames,
    ]),
  );
  return roles
    .map((role) => ({
      occupation:
        role.occupation === undefined
          ? null
          : {
              uri: role.occupation.id.value,
              name: select(role.occupation.prefLabels),
            },
      roleName: select(role.roleNames),
      startDate: role.startDate ?? null,
      endDate: role.endDate ?? null,
    }))
    .filter((role) => role.occupation !== null || role.roleName.length > 0);
};

/**
 * The entities a source mentions, as the API states them. An entity the source only names is one
 * per name, since nothing tells its Dutch and English names for one thing apart from its names
 * for two, so the language selection runs over all of them at once: a fallback that judged each
 * on its own would keep the one named in English beside the one named in Dutch. An unlinked entity
 * with no name left in the requested languages is dropped rather than returned empty.
 */
const entitiesIn = (acrossSet: LanguageSelector) => (entities: Entity[]) => {
  const select = acrossSet(entities.map((entity) => entity.names));
  return entities
    .map((entity) => ({
      uri: entity.iri?.value ?? null,
      name: select(entity.names),
    }))
    .filter((entity) => entity.uri !== null || entity.name.length > 0);
};

/**
 * Given every name list a field holds, the selection to apply to each of them: the languages the
 * client asked for, or a fallback that the set as a whole earns.
 */
type LanguageSelector = (
  sets: RDF.Literal[][],
) => (literals: RDF.Literal[]) => RDF.Literal[];

function mapToTerm(term: Term, languages: string[], dataset?: Dataset) {
  return {
    uri: term.id!.value,
    resultType: resultTypeToEnum(resultTypeOf(term, dataset)),
    additionalType: additionalTypes(term),
    prefLabel: literalValues(term.prefLabels, languages),
    altLabel: literalValues(term.altLabels, languages),
    hiddenLabel: literalValues(term.hiddenLabels, languages),
    definition: literalValues(term.scopeNotes, languages),
    scopeNote: literalValues(term.scopeNotes, languages),
    seeAlso: term.seeAlso.map((seeAlso: RDF.NamedNode) => seeAlso.value),
    broader: term.broaderTerms.map((related) => ({
      uri: related.id.value,
      prefLabel: literalValues(related.prefLabels, languages),
    })),
    narrower: term.narrowerTerms.map((related) => ({
      uri: related.id.value,
      prefLabel: literalValues(related.prefLabels, languages),
    })),
    related: term.relatedTerms.map((related) => ({
      uri: related.id.value,
      prefLabel: literalValues(related.prefLabels, languages),
    })),
    exactMatch: term.exactMatches.map((exactMatch) => ({
      uri: exactMatch.id.value,
      prefLabel: literalValues(exactMatch.prefLabels, languages),
    })),
    place: denotedPlace(term, (literals) => placeLabels(literals, languages)),
    person: denotedPerson(
      term,
      (literals) => placeLabels(literals, languages),
      (sets) => placeLabelsAcross(sets, languages),
    ),
  };
}

/**
 * A place’s labels are language-tagged in the monolingual API too, since the node arrived after
 * `Term`’s plain-string labels were frozen. The language selection still follows the labels
 * around it – the same Dutch default and English fallback that {@link literalValues} applies –
 * so a place is named the way its term is labelled.
 */
const placeLabels = (literals: RDF.Literal[], languages: string[] = ['nl']) => {
  const labels = filterLiteralsByLanguage(literals, languages);
  return labels.length > 0
    ? labels
    : filterLiteralsByLanguage(literals, ['en']);
};

/**
 * {@link placeLabels} decided over several name lists at once, falling back to English only when
 * none of them has a name in the requested languages. Applied per list, the fallback would keep
 * an entity by its English name beside the one by its Dutch name, since each is a list of one.
 */
const placeLabelsAcross =
  (sets: RDF.Literal[][], languages: string[] = ['nl']) =>
  (literals: RDF.Literal[]) =>
    filterLiteralsByLanguage(
      literals,
      sets.some(
        (names) => filterLiteralsByLanguage(names, languages).length > 0,
      )
        ? languages
        : ['en'],
    );

function source(
  distribution: Distribution,
  dataset: Dataset,
  catalogLanguage: string,
  statusClient?: StatusClient,
) {
  return {
    uri: dataset.iri,
    name: dataset.name[catalogLanguage],
    alternateName: dataset.alternateName?.[catalogLanguage],
    description: dataset.description[catalogLanguage],
    mainEntityOfPage: [dataset.mainEntityOfPage],
    inLanguage: dataset.inLanguage,
    creators: dataset.creators.map((creator) => ({
      uri: creator.iri,
      name: creator.name[catalogLanguage] ?? Object.values(creator.name)[0],
      alternateName:
        creator.alternateName[catalogLanguage] ?? creator.alternateName[''],
    })),
    genres: dataset.genres.map(async (genre) => ({
      uri: genre.toString(),
      name: (await dereferenceGenre(genre))?.name[catalogLanguage] ?? 'Unknown',
    })),
    features: distribution.features.map((feature: Feature) => ({
      type: Object.entries(FeatureType).find(
        ([_, val]) => val === feature.type,
      )?.[0],
      url: feature.url?.toString() ?? null,
    })),
    status: statusClient?.getStatus(dataset.iri) ?? null,
    resultTypes: dataset.resultTypes.map(resultTypeToEnum),
    timeoutMs: distribution.timeoutMs ?? null,
  };
}

export const resolvers = {
  Query: {
    sources: listSources,
    terms: queryTerms,
    lookup: lookupTerms,
  },
  TermsResult: {
    resolveType(result: TermsResult) {
      if (result instanceof TimeoutError) {
        return 'TimeoutError';
      }

      if (result instanceof ServerError) {
        return 'ServerError';
      }

      if (result instanceof TranslatedTerms) {
        return 'TranslatedTerms';
      }

      return 'Terms';
    },
  },
  SourceResult: {
    resolveType(result: SourceResult) {
      if (result instanceof SourceNotFoundError) {
        return 'SourceNotFoundError';
      }

      return 'Source';
    },
  },
  LookupResult: {
    resolveType(result: LookupResult | { type: 'TranslatedTerm' }) {
      if (result instanceof NotFoundError) {
        return 'NotFoundError';
      }

      if (result instanceof TimeoutError) {
        return 'TimeoutError';
      }

      if (result instanceof ServerError) {
        return 'ServerError';
      }

      if ('type' in result) {
        return 'TranslatedTerm';
      }

      return 'Term';
    },
  },
};
