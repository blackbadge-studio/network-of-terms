/**
 * Vocabulary of the Vlaams Termennetwerk for catalog properties that schema.org does not offer.
 * Datasets declare it in their JSON-LD context as `"vtn": "https://termennetwerk.meemoo.be/ns#"`.
 */
export const VTN_NAMESPACE = 'https://termennetwerk.meemoo.be/ns#';

export const vtn = {
  /** Per-source timeout in milliseconds, on the `schema:DataDownload` of the SPARQL endpoint. */
  timeoutMs: `${VTN_NAMESPACE}timeoutMs`,
} as const;
