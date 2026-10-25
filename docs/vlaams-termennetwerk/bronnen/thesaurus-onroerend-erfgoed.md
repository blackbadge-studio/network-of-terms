# Intake: Thesauri agentschap Onroerend Erfgoed

Feiten geverifieerd op 25 oktober 2026. Aanvullingen uit algemene kennis zijn
gemarkeerd als "te bevestigen".

## Inhoudelijke scope

Elf SKOS-conceptschema's voor de beschrijving van onroerend erfgoed in
Vlaanderen, gepubliceerd op https://thesaurus.onroerenderfgoed.be:

Erfgoedtypes (±1 966 concepten), Materialen (±207), Stijlen en Culturen (78),
Gebeurtenistypes (±125), Dateringen, Soorten, Besluittypes, Waardetypes,
Aanduidingstypes, GGA motivaties en Brontypes (omvang van de laatste zeven nog
niet geteld).

Resultaatstype voor het Termennetwerk: `concept`. Erfgoedtypes, Materialen,
Stijlen en Culturen, Gebeurtenistypes en Dateringen zijn de meest bruikbare
schema's voor erfgoedbeschrijving; de overige zijn eerder intern-administratief
(te bevestigen met de bronhouder).

## Bronhouder en contactpunten

- Bronhouder: agentschap Onroerend Erfgoed (Vlaamse overheid).
- Contact: https://www.onroerenderfgoed.be/contact (algemeen contactformulier).
- Nog geen technisch of inhoudelijk contactpersoon bekend.

## Technische publicatievorm (LOD/SPARQL/API/dump)

- Software: Atramhasis (SKOS-editor van de Vlaamse overheid).
- Geen SPARQL-endpoint.
- Triple Pattern Fragments-server: `https://thesaurus.onroerenderfgoed.be/ldf/{SCHEME}`.
- Volledige RDF-dump per schema: `https://thesaurus.onroerenderfgoed.be/conceptschemes/{SCHEME}/c.ttl`
  (±1,8 MB voor Erfgoedtypes).
- JSON-zoek-API: `https://thesaurus.onroerenderfgoed.be/conceptschemes/{SCHEME}/c?label=kerk&type=concept`.

## Datamodel en URI's

- SKOS (`skos:Concept`, `skos:ConceptScheme`, `skos:prefLabel`, `skos:altLabel`,
  `skos:broader`/`skos:narrower`, `skos:definition`).
- URI's: `https://id.erfgoed.net/thesauri/{scheme}/{id}`, met 303-redirect naar
  de thesaurussite (content negotiation te bevestigen).
- Concepten dragen `skos:exactMatch` naar Getty AAT, wat kruisverwijzing met
  de reeds aangesloten AAT-bron mogelijk maakt.

## Licentie

Vlaamse Modellicentie Gratis Hergebruik v1.0, naamsvermelding
"(c) agentschap Onroerend Erfgoed".

## Talen en omvang

- Talen: nl-BE, deels en.
- Omvang: zie scope; totaal over de elf schema's nog niet geteld.

## Resultaat automatische validatie

Nog niet uitgevoerd.

## Status in de catalogus

**In voorbereiding.** De catalogusentries (één dataset per schema) worden
geschreven zodra de gehoste endpoint bestaat.

## Voorgestelde route naar opname

De Query Engine stuurt SPARQL rechtstreeks naar een endpoint en ondersteunt
geen TPF. Daarom host meemoo een SPARQL-endpoint (gepland `packages/sparql-host`)
die dagelijks wordt geladen uit de `c.ttl`-dumps, met één named graph per
schema. Per schema komt er een catalogusentry met `vtn:resultType: concept`,
hergebruik van een generiek SKOS-zoeksjabloon en `vtn:status: preparation` tot
de endpoint stabiel draait.

## Open vragen voor de bronhouder

1. Is er een technisch contactpersoon voor de thesaurussite en de dumps?
2. Hoe vaak wijzigen de schema's; is een dagelijkse sync voldoende?
3. Zijn de minder bekende schema's (Besluittypes, Waardetypes, Aanduidingstypes,
   GGA motivaties, Brontypes, Soorten) bedoeld voor extern hergebruik?
4. Bieden de `id.erfgoed.net`-URI's content negotiation naar RDF?
5. Is een notificatie (bv. RSS of changelog) bij wijzigingen beschikbaar?
