import fs from 'fs';
import { rdfParser } from 'rdf-parse';
import { QueryEngine } from '@comunica/query-sparql-rdfjs';
import { Transform, TransformCallback } from 'stream';
import { globby } from 'globby';
import {
  Catalog,
  Dataset,
  Feature,
  FeatureType,
  Organization,
  SparqlDistribution,
  TypeMapping,
  resultTypeFromString,
} from '@netwerk-digitaal-erfgoed/network-of-terms-query';
import { fileURLToPath } from 'url';
import { ldkit, rdf, schema, xsd } from 'ldkit/namespaces';
import { vtn } from './vocabulary.js';
import { createLens, type IQueryEngine, type Options } from 'ldkit';
import type RDF from '@rdfjs/types';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { RdfStore } from 'rdf-stores';

/**
 * Read the catalog from `path`, else from the `CATALOG_PATH` environment variable, else from the
 * catalog that ships with this package.
 *
 * @throws Error if the path is not an existing directory or the directory holds no datasets.
 */
export async function getCatalog(path?: string): Promise<Catalog> {
  const directory = resolveCatalogPath(
    path || process.env.CATALOG_PATH,
  ).replace(/\\/g, '/'); // Windows compatibility.
  const stats = fs.statSync(directory, { throwIfNoEntry: false });
  if (stats === undefined) {
    throw new Error(`Catalog directory ${directory} does not exist`);
  }
  if (!stats.isDirectory()) {
    throw new Error(`Catalog path ${directory} is not a directory`);
  }
  const catalog = await fromStore(await fromFiles(directory));
  if (catalog.datasets.length === 0) {
    throw new Error(`Catalog directory ${directory} holds no datasets`);
  }
  return catalog;
}

// The catalog is read through three lenses rather than one. A lens fetches all its
// properties in a single query, wrapping each in an OPTIONAL, so every
// multi-valued property multiplies against all others. Keeping the creator and
// the distribution out of the query for the dataset’s own properties stops their
// values from multiplying against each other.
const datasetSchema = {
  '@type': schema.Dataset,
  name: {
    '@id': schema.name,
    '@multilang': true,
  },
  alternateName: {
    '@id': schema.alternateName,
    '@multilang': true,
    '@optional': true,
  },
  description: {
    '@id': schema.description,
    '@multilang': true,
    '@optional': true, // Not strictly optional, but required properties cause slower SPARQL JOINs.
  },
  inLanguage: {
    '@id': schema.inLanguage,
    '@array': true,
    '@optional': true,
  },
  genres: {
    '@id': schema.genre,
    '@array': true,
    '@optional': true,
  },
  mainEntityOfPage: schema.mainEntityOfPage,
  // Multiple: a dataset may hold terms in more than one URI space, e.g. the
  // Rights thesaurus, which reuses the canonical Creative Commons and
  // RightsStatements.org URIs. Optional: datasets that share a terms-URI prefix
  // with a broader dataset (e.g. Wikidata subsets) omit it, so lookups resolve
  // to the broader one.
  url: {
    '@id': schema.url,
    '@array': true,
    '@optional': true,
  },
} as const;

const creatorSchema = {
  '@type': schema.Dataset,
  creator: {
    '@id': schema.creator,
    '@optional': true,
    '@schema': {
      '@type': schema.Organization,
      name: {
        '@id': schema.name,
        '@multilang': true,
        '@optional': true,
      },
      alternateName: {
        '@id': schema.alternateName,
        '@multilang': true,
        '@optional': true,
      },
    },
  },
} as const;

const distributionSchema = {
  '@type': schema.Dataset,
  distribution: {
    '@id': schema.distribution,
    '@optional': true,
    '@schema': {
      encodingFormat: schema.encodingFormat,
      contentUrl: schema.contentUrl,
      timeoutMs: {
        '@id': vtn.timeoutMs,
        '@type': xsd.integer,
        '@optional': true,
      },
      potentialAction: {
        '@array': true,
        '@id': schema.potentialAction,
        '@schema': {
          // '@type': schema.Action,
          types: {
            '@id': rdf.type,
            '@type': ldkit.IRI,
            '@array': true,
          },
          query: {
            '@id': schema.query,
            '@optional': true,
          },
          target: {
            '@id': schema.target,
            '@optional': true,
            '@schema': {
              actionApplication: {
                '@id': schema.actionApplication,
                '@schema': {
                  '@type': schema.SoftwareApplication,
                },
              },
              urlTemplate: {
                '@id': schema.urlTemplate,
              },
            },
          },
        },
      },
    },
  },
} as const;

// Result types and type mappings get their own lens: both are multi-valued, so they would
// multiply against the dataset's other multi-valued properties in the dataset lens.
const typesSchema = {
  '@type': schema.Dataset,
  resultTypes: {
    '@id': vtn.resultType,
    '@array': true,
    '@optional': true,
  },
  typeMappings: {
    '@id': vtn.typeMapping,
    '@array': true,
    '@optional': true,
    '@schema': {
      sourceType: {
        '@id': vtn.sourceType,
        '@type': ldkit.IRI,
      },
      resultType: vtn.resultType,
    },
  },
} as const;

const engine = new QueryEngine();

export async function fromStore(store: RDF.Store): Promise<Catalog> {
  const options: Options = {
    sources: [store],
    // Cast needed: rdf-parse uses Comunica v4 types, incompatible with v5.
    engine: engine as unknown as IQueryEngine,
    distinctConstruct: true,
  };

  const creators = new Map(
    (await createLens(creatorSchema, options).find()).map((dataset) => [
      dataset.$id,
      dataset.creator,
    ]),
  );
  const distributions = new Map(
    (await createLens(distributionSchema, options).find()).map((dataset) => [
      dataset.$id,
      dataset.distribution,
    ]),
  );
  const types = new Map(
    (await createLens(typesSchema, options).find()).map((dataset) => [
      dataset.$id,
      {
        resultTypes: (dataset.resultTypes ?? []).map(resultTypeFromString),
        typeMappings: (dataset.typeMappings ?? []).map(
          (mapping) =>
            new TypeMapping(
              mapping.sourceType,
              resultTypeFromString(mapping.resultType),
            ),
        ),
      },
    ]),
  );
  const datasets = (await createLens(datasetSchema, options).find()).map(
    (dataset) => ({
      ...dataset,
      creator: creators.get(dataset.$id),
      distribution: distributions.get(dataset.$id),
      types: types.get(dataset.$id),
    }),
  );

  return new Catalog(
    datasets.map(
      (dataset) =>
        new Dataset(
          dataset.$id,
          dataset.name,
          dataset.description,
          dataset.genres,
          dataset.url,
          dataset.mainEntityOfPage,
          dataset.inLanguage,
          [
            new Organization(
              dataset.creator!.$id,
              dataset.creator!.name,
              dataset.creator!.alternateName,
            ),
          ],
          [
            (() => {
              const searchQuery = dataset.distribution!.potentialAction.filter(
                (action) => action.types.includes(schema.SearchAction),
              )[0].query!;
              const features: Feature[] = dataset
                .distribution!.potentialAction.filter(
                  (action) =>
                    action.target?.actionApplication.$id ===
                    'https://reconciliation-api.github.io/specs/latest/',
                )
                .map(
                  (reconciliation) =>
                    new Feature(
                      FeatureType.RECONCILIATION,
                      new URL(
                        reconciliation.target!.urlTemplate!.replace(
                          '{dataset}',
                          dataset.$id.replace('#', '%23'), // Escape # in URL.
                        ),
                      ),
                    ),
                );
              if (searchQuery.includes('?genres')) {
                features.push(new Feature(FeatureType.GENRE_FILTER));
              }
              // Our own Reconciliation Service API, off by default (outside the MVP, bestek §3.2):
              // with RECONCILIATION_ENABLED=true every source gets the feature, pointing at
              // RECONCILIATION_URL_TEMPLATE ({dataset} is replaced), unless it declares one.
              const reconciliationTemplate =
                process.env.RECONCILIATION_URL_TEMPLATE;
              if (
                process.env.RECONCILIATION_ENABLED === 'true' &&
                reconciliationTemplate &&
                !features.some(
                  (feature) => feature.type === FeatureType.RECONCILIATION,
                )
              ) {
                features.push(
                  new Feature(
                    FeatureType.RECONCILIATION,
                    new URL(
                      reconciliationTemplate.replace(
                        '{dataset}',
                        encodeURIComponent(dataset.$id),
                      ),
                    ),
                  ),
                );
              }
              const browseQuery = dataset.distribution!.potentialAction.find(
                (action) => action.types.includes(vtn.BrowseAction),
              )?.query;
              if (browseQuery) {
                features.push(new Feature(FeatureType.HIERARCHY));
              }
              return new SparqlDistribution(
                dataset.distribution!.$id,
                dataset.distribution!.contentUrl,
                searchQuery,
                dataset.distribution!.potentialAction.filter((action) =>
                  action.types.includes(schema.FindAction),
                )[0].query!,
                features,
                dataset.distribution!.timeoutMs ?? undefined,
                browseQuery ?? undefined,
              );
            })(),
          ],
          dataset.alternateName,
          dataset.types?.resultTypes ?? [],
          dataset.types?.typeMappings ?? [],
        ),
    ),
  );
}

/**
 * A catalog path that is not an existing directory as given (absolute, or relative to the working
 * directory) is tried next to the bundle and next to this package, where the servers copy every
 * catalog directory at build time. So `CATALOG_PATH=catalog-vlaams` selects the Flemish catalog
 * wherever the server runs, without knowing the deployment's file layout.
 */
function resolveCatalogPath(path: string | undefined): string {
  if (!path) {
    return bundledCatalogPath();
  }
  if (fs.existsSync(path)) {
    return path;
  }
  for (const base of [
    new URL('.', import.meta.url),
    new URL('../', import.meta.url),
  ]) {
    const candidate = fileURLToPath(new URL(path, base));
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return path; // Let getCatalog() report it as missing.
}

/**
 * The catalog directory sits next to this package’s `dist/`, but the servers bundle this code
 * into their own `dist/main.js` and copy the catalog to `dist/catalog`, next to the bundle.
 */
function bundledCatalogPath(): string {
  const nextToBundle = fileURLToPath(new URL('catalog', import.meta.url));
  return fs.existsSync(nextToBundle)
    ? nextToBundle
    : fileURLToPath(new URL('../catalog', import.meta.url));
}

/**
 * Return a separate RDF.Store for each catalog file because merging them into a single store
 * causes blank nodes to be re-used instead of incremented when adding the next file.
 */
async function fromFiles(directory: string): Promise<RDF.Store> {
  // Read all files except those in the queries/ directory.
  const files = await globby([directory + '/**', '!**/queries/**']);
  const store = RdfStore.createDefault();
  for (const file of files) {
    const stream = fromFile(file);
    await new Promise((resolve, reject) => {
      store.import(stream);
      stream.on('end', resolve);
      stream.on('error', reject);
    });
  }
  return store;
}

function fromFile(file: string): RDF.Stream & Readable {
  return rdfParser
    .parse(fs.createReadStream(file), {
      path: file,
    })
    .pipe(new InlineFiles(file))
    .pipe(new SubstituteCredentialsFromEnvironmentVariables());
}

/**
 * An RDF.Quad transform that inlines file://... references in the quad's object value.
 */
class InlineFiles extends Transform {
  private readonly path: string;

  constructor(fromFile: string) {
    super({ objectMode: true });
    this.path = dirname(fromFile);
  }

  override async _transform(
    quad: RDF.Quad,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ) {
    if (quad.object.value.startsWith('file://')) {
      const file = join(this.path, quad.object.value.substr(7));
      quad.object.value = await fs.promises.readFile(file, 'utf-8');
    }

    this.push(quad, encoding);

    callback();
  }
}

/**
 * An RDF.Quad transform that replaces $ENV_VAR variables in schema:contentUrl objects with the value of the environment
 * value with the same name.
 */
class SubstituteCredentialsFromEnvironmentVariables extends Transform {
  private regex = new RegExp('\\$(.+)(?=@)');

  constructor() {
    super({ objectMode: true });
  }

  override async _transform(
    quad: RDF.Quad,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ) {
    if (quad.predicate.value === 'http://schema.org/contentUrl') {
      quad.object.value = quad.object.value.replace(
        this.regex,
        (match, envVar) => process.env[envVar] ?? '',
      );
    }

    this.push(quad, encoding);

    callback();
  }
}
