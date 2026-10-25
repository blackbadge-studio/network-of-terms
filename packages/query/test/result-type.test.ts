import { describe, expect, it } from 'vitest';
import { DataFactory } from 'rdf-data-factory';
import {
  Dataset,
  Organization,
  ResultType,
  SparqlDistribution,
  TypeMapping,
  additionalTypes,
  matchesResultTypes,
  resultTypeFromString,
  resultTypeOf,
} from '../src/index.js';

const df = new DataFactory();
const typed = (...iris: string[]) => ({
  types: iris.map((iri) => df.namedNode(iri)),
});
const dataset = (
  resultTypes: ResultType[] = [],
  mappings: TypeMapping[] = [],
) =>
  new Dataset(
    'https://example.org/source',
    { nl: 'Bron' },
    { nl: 'Bron' },
    [],
    ['https://example.org/source/'],
    'https://example.org/source/about',
    ['nl'],
    [new Organization('https://example.org/', { nl: 'Example' }, {})],
    [
      new SparqlDistribution(
        'https://example.org/source/sparql',
        'https://example.org/sparql',
        'CONSTRUCT {} WHERE {}',
        'CONSTRUCT {} WHERE {}',
      ),
    ],
    {},
    resultTypes,
    mappings,
  );

describe('resultTypeOf', () => {
  it('is concept when nothing says otherwise', () => {
    expect(
      resultTypeOf(typed('http://www.w3.org/2004/02/skos/core#Concept')),
    ).toBe(ResultType.CONCEPT);
  });

  it('recognises the well-known schema.org and FOAF classes', () => {
    expect(resultTypeOf(typed('https://schema.org/Person'))).toBe(
      ResultType.PERSON,
    );
    expect(resultTypeOf(typed('http://schema.org/Organization'))).toBe(
      ResultType.ORGANIZATION,
    );
    expect(resultTypeOf(typed('https://schema.org/Place'))).toBe(
      ResultType.PLACE,
    );
    expect(resultTypeOf(typed('https://schema.org/Event'))).toBe(
      ResultType.EVENT,
    );
    expect(resultTypeOf(typed('http://xmlns.com/foaf/0.1/Person'))).toBe(
      ResultType.PERSON,
    );
  });

  it('ignores skos:Concept next to a more specific class', () => {
    expect(
      resultTypeOf(
        typed(
          'http://www.w3.org/2004/02/skos/core#Concept',
          'https://schema.org/Place',
        ),
      ),
    ).toBe(ResultType.PLACE);
  });

  it('lets the source’s own mapping win over the built-in one', () => {
    const source = dataset(
      [],
      [new TypeMapping('https://schema.org/Person', ResultType.ORGANIZATION)],
    );
    expect(resultTypeOf(typed('https://schema.org/Person'), source)).toBe(
      ResultType.ORGANIZATION,
    );
  });

  it('maps a source-specific class through the source’s mapping', () => {
    const source = dataset(
      [],
      [new TypeMapping('https://example.org/ns#Artist', ResultType.PERSON)],
    );
    expect(
      resultTypeOf(
        typed(
          'http://www.w3.org/2004/02/skos/core#Concept',
          'https://example.org/ns#Artist',
        ),
        source,
      ),
    ).toBe(ResultType.PERSON);
  });

  it('falls back to the single type a source declares for all its terms', () => {
    expect(
      resultTypeOf(
        typed('http://www.w3.org/2004/02/skos/core#Concept'),
        dataset([ResultType.PLACE]),
      ),
    ).toBe(ResultType.PLACE);
    // Several declared types say nothing about this particular term.
    expect(
      resultTypeOf(
        typed('http://www.w3.org/2004/02/skos/core#Concept'),
        dataset([ResultType.PERSON, ResultType.ORGANIZATION]),
      ),
    ).toBe(ResultType.CONCEPT);
  });
});

describe('type filter', () => {
  it('passes everything when no types are requested', () => {
    expect(matchesResultTypes(typed('https://schema.org/Person'), [])).toBe(
      true,
    );
  });

  it('matches the derived result type', () => {
    const term = typed('https://schema.org/Person');
    expect(matchesResultTypes(term, [ResultType.PERSON])).toBe(true);
    expect(matchesResultTypes(term, [ResultType.PLACE])).toBe(false);
  });

  it('decides per source whether it may provide the requested types', () => {
    expect(dataset().mayProvideResultTypes([ResultType.PERSON])).toBe(true);
    expect(
      dataset([ResultType.CONCEPT]).mayProvideResultTypes([ResultType.PERSON]),
    ).toBe(false);
    expect(
      dataset([ResultType.CONCEPT, ResultType.PERSON]).mayProvideResultTypes([
        ResultType.PERSON,
      ]),
    ).toBe(true);
    expect(dataset([ResultType.CONCEPT]).mayProvideResultTypes([])).toBe(true);
  });
});

describe('additionalTypes and parsing', () => {
  it('passes the rdf:types through unchanged', () => {
    expect(
      additionalTypes(
        typed('https://schema.org/Person', 'https://example.org/ns#Artist'),
      ),
    ).toEqual(['https://schema.org/Person', 'https://example.org/ns#Artist']);
  });

  it('parses catalog values and rejects unknown ones', () => {
    expect(resultTypeFromString('place')).toBe(ResultType.PLACE);
    expect(() => resultTypeFromString('thing')).toThrow(/Unknown result type/);
  });
});
