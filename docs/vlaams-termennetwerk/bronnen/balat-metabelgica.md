# Intake: BALaT People & Institutions en MetaBelgica

Feiten geverifieerd op 25 oktober 2026. Aanvullingen uit algemene kennis zijn
gemarkeerd als "te bevestigen".

## Inhoudelijke scope

**BALaT People & Institutions** (KIK-IRPA) bevat actor-records van kunstenaars,
ambachtslui en instellingen die in de Belgische kunst- en erfgoedcollecties
voorkomen. Resultaatstypes: `person`, `organization`.

**MetaBelgica** is de opvolger: een gezamenlijke Wikibase van KBR, KIK-IRPA, KMKG
en KMSKB (2023–2026) met meer dan 1 miljoen entiteiten: personen, organisaties,
gebeurtenissen en plaatsen. Resultaatstypes: `person`, `organization`, `event`,
`place`. Resultatendag: 18 november 2026.

## Bronhouder en contactpunten

- BALaT: KIK-IRPA, balat@kikirpa.be.
- MetaBelgica: consortium KBR, KIK-IRPA, KMKG, KMSKB; contactpersoon Eva Coudyzer
  (KIK-IRPA). Projectpagina https://www.kikirpa.be/en/projects/metabelgica,
  code op https://github.com/metabelgica.

## Technische publicatievorm (LOD/SPARQL/API/dump)

- BALaT: website https://balat.kikirpa.be; geen API, SPARQL of RDF. Handles
  `https://hdl.handle.net/20.500.14037/actor.{n}`. Wikidata-eigenschap P1901
  heeft slechts 351 gebruiken.
- MetaBelgica: Wikibase; een Wikibase levert normaal een SPARQL query service
  (te bevestigen), maar er is nog geen publieke URL.

## Datamodel en URI's

- BALaT: eigen actor-model, geen RDF; handles als persistente identifier.
- MetaBelgica: Wikibase-datamodel (items, properties, statements), bevraagbaar
  via het Wikibase RDF-dumpformaat; URI-patroon nog niet bekend.

## Licentie

- BALaT-metadata: CC0.
- MetaBelgica: nog niet gepubliceerd (CC0 ligt in lijn met de partners, te
  bevestigen).

## Talen en omvang

- BALaT: en, fr, nl; aantal actor-records niet geverifieerd.
- MetaBelgica: >1 miljoen entiteiten; talen vermoedelijk nl/fr/en/de (te
  bevestigen).

## Resultaat automatische validatie

Nog niet uitgevoerd.

## Status in de catalogus

**Kandidaat.**

## Voorgestelde route naar opname

Wachten op de MetaBelgica Wikibase query service (na 18 november 2026) en die
rechtstreeks als SPARQL-bron aansluiten, naar het model van de
Wikidata-sjablonen. BALaT apart aansluiten heeft weinig zin omdat de data in
MetaBelgica opgaan. Contact opnemen met Eva Coudyzer om vroege toegang tot een
testendpoint te vragen.

## Open vragen voor de bronhouder

1. Wanneer wordt de MetaBelgica SPARQL query service publiek?
2. Welke licentie krijgt MetaBelgica?
3. Blijven de BALaT-handles bestaan en worden ze als `skos:exactMatch` of
   `owl:sameAs` in MetaBelgica opgenomen?
4. Zijn er gebruikslimieten (rate limiting, time-outs) op de query service?
5. Worden MetaBelgica-items terug gekoppeld aan Wikidata?
