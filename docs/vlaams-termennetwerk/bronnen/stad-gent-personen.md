# Intake: Stad Gent / CoGhent personen

Feiten geverifieerd op 25 oktober 2026. Aanvullingen uit algemene kennis zijn
gemarkeerd als "te bevestigen".

## Inhoudelijke scope

De personengraph van Stad Gent (Collectie van de Gentenaar, CoGhent) bevat
personen die in de collecties van de Gentse musea voorkomen: makers,
afgebeelde personen, verzamelaars. Resultaatstype: `person`. De
thesaurusgraph van dezelfde endpoint is al aangesloten in de catalogus.

## Bronhouder en contactpunten

- Bronhouder: Stad Gent, samen met de Gentse musea (Design Museum Gent, STAM,
  Huis van Alijn, Industriemuseum, Archief Gent; te bevestigen).
- Contact: data@designmuseumgent.be.

## Technische publicatievorm (LOD/SPARQL/API/dump)

- SPARQL-endpoint: https://stad.gent/sparql (Virtuoso).
- Named graph: `<http://stad.gent/ldes/personen>`.
- LDES-geversioneerd, zoals de thesaurusgraph: elk record is een versie-object
  met een tijdstempel; de laatste versie moet in de query geselecteerd worden.

## Datamodel en URI's

- OSLO Persoon: `persoon#volledigeNaam`, `foaf:givenName`, `foaf:familyName`,
  `heeftGeboorte`/`heeftOverlijden` met `datum` en `plaats`, `geslacht`,
  `nationaliteit`, `alternatieveNaam`, `owl:sameAs` naar externe identifiers.
- URI's: geversioneerde objecten zoals in de thesaurusgraph; de stabiele
  entiteits-URI moet uit de versie-URI afgeleid worden (patroon te bevestigen).

## Licentie

"Vlaamse open data" (Vlaamse Modellicentie Gratis Hergebruik; te bevestigen met
de bronhouder).

## Talen en omvang

- Taal: nl (persoonsnamen zijn taalonafhankelijk).
- Omvang: nog niet geteld.

## Resultaat automatische validatie

Nog niet uitgevoerd.

## Status in de catalogus

**Test.**

## Voorgestelde route naar opname

Zoek- en lookup-sjablonen schrijven die OSLO Persoon afbeelden op het
Termennetwerk-persoonsmodel (`schema:Person` met naam, alternatieve namen,
geboorte- en sterfdatum, `skos:exactMatch` uit `owl:sameAs`), met dezelfde
versieselectie als de thesaurussjablonen. Daarna testscenario's toevoegen en de
dataset op `vtn:status: test` zetten tot de resultaten bevestigd zijn.

## Open vragen voor de bronhouder

1. Welke licentie geldt precies voor de personengraph?
2. Hoe wordt de stabiele URI van een persoon afgeleid uit de versie-URI?
3. Hoe vaak wordt de graph bijgewerkt en worden verwijderingen gepubliceerd?
4. Naar welke externe bronnen verwijzen de `owl:sameAs`-links (Wikidata, VIAF,
   RKDartists)?
5. Hoeveel personen bevat de graph?
