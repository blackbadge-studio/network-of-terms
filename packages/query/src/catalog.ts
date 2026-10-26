import { URL } from 'url';

export class Catalog {
  private readonly prefixToDataset: Map<string, IRI>;

  constructor(readonly datasets: ReadonlyArray<Dataset>) {
    this.prefixToDataset = this.indexPrefixesByStringLength();
  }

  /**
   * Get dataset by IRI, accepting distribution IRIs too for BC.
   */
  public getDatasetByIri(iri: IRI): Dataset | undefined {
    return (
      this.datasets.find(
        (dataset) => dataset.iri.toString() === iri.toString(),
      ) ?? this.getDatasetByDistributionIri(iri)
    );
  }

  public getDatasetsSortedByName(languageCode: string): Dataset[] {
    return [...this.datasets].sort((a, b) =>
      a.name[languageCode].localeCompare(b.name[languageCode]),
    );
  }

  public getDatasetByDistributionIri(iri: IRI): Dataset | undefined {
    return this.datasets.find(
      (dataset) => dataset.getDistributionByIri(iri) !== undefined,
    );
  }

  public getDatasetByTermIri(iri: IRI): Dataset | undefined {
    for (const [prefix, datasetIri] of this.prefixToDataset) {
      if (iri.toString().startsWith(prefix)) {
        return this.getDatasetByIri(datasetIri);
      }
    }

    return undefined;
  }

  public getDistributionsProvidingFeature(
    featureType: FeatureType,
  ): Distribution[] {
    return this.datasets.reduce<Distribution[]>((acc, dataset) => {
      return [
        ...acc,
        ...dataset.distributions.filter((distribution) =>
          distribution.hasFeature(featureType),
        ),
      ];
    }, []);
  }

  /**
   * Get all languages provided by datasets in this catalog.
   *
   * Sorted, because the order of `datasets` follows the order in which the catalog files happen to
   * be read, and these languages end up in the published GraphQL schema as the `Language` enum.
   */
  public getLanguages(): string[] {
    return [
      ...new Set(
        this.datasets.reduce<string[]>((acc, dataset) => {
          return [...acc, ...dataset.inLanguage];
        }, []),
      ),
    ].sort();
  }

  /**
   * Index the prefixes of all datasets by their string length in descending order for matching
   * term IRIs against during lookup. When looking up terms, we want to match the longest possible prefix
   * in case prefixes overlap.
   */
  private indexPrefixesByStringLength() {
    return new Map(
      [
        ...this.datasets
          .reduce((acc, dataset) => {
            dataset.termsPrefixes.forEach((prefix) => {
              acc.set(prefix.toString(), dataset.iri);
            });
            return acc;
          }, new Map<string, IRI>())
          .entries(),
      ].sort(([a], [b]) => b.localeCompare(a)),
    );
  }
}

export type StringDictionary = Record<string, string>;

export class Dataset {
  /**
   * @param resultTypes The central result types this source yields (`vtn:resultType` in the
   *   catalog). Empty when the source does not declare them: it is then never skipped by a type
   *   filter, and each result's type is derived from its `rdf:type` alone.
   * @param typeMappings How the source's own `rdf:type`s map to central result types
   *   (`vtn:typeMapping`); they take precedence over the built-in mapping.
   */
  constructor(
    readonly iri: IRI,
    readonly name: StringDictionary,
    readonly description: StringDictionary,
    readonly genres: IRI[],
    readonly termsPrefixes: IRI[],
    readonly mainEntityOfPage: string,
    readonly inLanguage: string[],
    readonly creators: [Organization],
    readonly distributions: [Distribution],
    readonly alternateName: StringDictionary = {},
    readonly resultTypes: ResultType[] = [],
    readonly typeMappings: TypeMapping[] = [],
  ) {}

  /**
   * Whether a type filter should query this source at all. A source that declares its result
   * types is skipped when none of them is requested; one that declares nothing is always queried
   * and filtered per result.
   */
  public mayProvideResultTypes(types: ResultType[]): boolean {
    return (
      types.length === 0 ||
      this.resultTypes.length === 0 ||
      this.resultTypes.some((type) => types.includes(type))
    );
  }

  public getSparqlDistribution(): Distribution | undefined {
    return this.distributions.find(
      (distribution) => distribution instanceof SparqlDistribution,
    );
  }

  public getDistributionByIri(iri: IRI): Distribution | undefined {
    return this.distributions.find(
      (distribution) => distribution.iri.toString() === iri.toString(),
    );
  }
}

export class Organization {
  constructor(
    readonly iri: IRI,
    readonly name: StringDictionary,
    readonly alternateName: StringDictionary,
  ) {}
}

export class SparqlDistribution {
  /**
   * @param timeoutMs Optional per-source timeout from the catalog (`vtn:timeoutMs`). The query
   *   engine waits at most the smaller of this value and the timeout the caller passes, so a
   *   source that is known to be slow or flaky never holds up a federated search for longer than
   *   its administrator allows.
   */
  constructor(
    readonly iri: IRI,
    readonly endpoint: IRI,
    readonly searchQuery: string,
    readonly lookupQuery: string,
    readonly features: Feature[] = [],
    readonly timeoutMs?: number,
    /**
     * Optional third template (`vtn:BrowseAction`) for hierarchical navigation: given `?parent`
     * (a concept, or the concept scheme for the top level) it constructs the direct narrower
     * concepts, each with its labels, all its broader concepts and at least one narrower concept
     * when it has any.
     */
    readonly browseQuery?: string,
  ) {}

  /** The timeout to use for this source given what the caller allows. */
  public effectiveTimeoutMs(requestedTimeoutMs: number): number {
    return this.timeoutMs === undefined
      ? requestedTimeoutMs
      : Math.min(requestedTimeoutMs, this.timeoutMs);
  }

  public hasFeature(feature: FeatureType) {
    return this.features.some((value: Feature) => value.type === feature);
  }
}

export class Feature {
  constructor(
    readonly type: FeatureType,
    readonly url?: URL,
  ) {}
}

export enum FeatureType {
  RECONCILIATION = 'https://reconciliation-api.github.io/specs/latest/',
  GENRE_FILTER = 'genre-filter',
  HIERARCHY = 'hierarchy',
}

/**
 * The central result types of the Vlaams Termennetwerk, which every source's own classes map to
 * so that a client can tell a person from a place without knowing the source's data model.
 */
export enum ResultType {
  CONCEPT = 'concept',
  PERSON = 'person',
  ORGANIZATION = 'organization',
  PLACE = 'place',
  EVENT = 'event',
}

export const resultTypeFromString = (value: string): ResultType => {
  const type = Object.values(ResultType).find((type) => type === value);
  if (type === undefined) {
    throw new Error(
      `Unknown result type "${value}"; expected one of ${Object.values(ResultType).join(', ')}`,
    );
  }
  return type;
};

/** A source-specific rule: terms typed `sourceType` are of central type `resultType`. */
export class TypeMapping {
  constructor(
    readonly sourceType: IRI,
    readonly resultType: ResultType,
  ) {}
}

/**
 * A union type to be extended in the future with other distribution types.
 */
export type Distribution = SparqlDistribution;

export type IRI = string;
