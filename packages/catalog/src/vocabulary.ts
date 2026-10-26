/**
 * Vocabulary of the Vlaams Termennetwerk for catalog properties that schema.org does not offer.
 * Datasets declare it in their JSON-LD context as `"vtn": "https://termennetwerk.meemoo.be/ns#"`.
 */
export const VTN_NAMESPACE = 'https://termennetwerk.meemoo.be/ns#';

export const vtn = {
  /** Per-source timeout in milliseconds, on the `schema:DataDownload` of the SPARQL endpoint. */
  timeoutMs: `${VTN_NAMESPACE}timeoutMs`,
  /** Central result types a dataset yields: concept, person, organization, place, event. */
  resultType: `${VTN_NAMESPACE}resultType`,
  /** A rule mapping one of the source's own classes (`vtn:sourceType`) to a `vtn:resultType`. */
  typeMapping: `${VTN_NAMESPACE}typeMapping`,
  sourceType: `${VTN_NAMESPACE}sourceType`,
  /** Third potentialAction next to SearchAction and FindAction: the browse template. */
  BrowseAction: `${VTN_NAMESPACE}BrowseAction`,
} as const;
