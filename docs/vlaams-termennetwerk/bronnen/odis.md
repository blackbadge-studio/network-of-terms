# Intake: ODIS

Feiten geverifieerd op 25 oktober 2026. Aanvullingen uit algemene kennis zijn
gemarkeerd als "te bevestigen".

## Inhoudelijke scope

ODIS is de databank over het Vlaamse en Belgische middenveld: personen,
organisaties, periodieken, archieven, gebouwen, families en gebeurtenissen.
Omvang: 318 026 records (januari 2025), waarvan 153 970 publiek.
Resultaatstypes voor het Termennetwerk: `person`, `organization`, `event`
(en mogelijk `place` voor gebouwen, te bevestigen).

## Bronhouder en contactpunten

- Beheer: KADOC-KU Leuven; technische dienstverlener LIBIS.
- Partners: ADVN, Amsab-ISG, Liberas.
- Contactpersoon: nog niet bekend; op te vragen via KADOC.

## Technische publicatievorm (LOD/SPARQL/API/dump)

- Vandaag geen publieke LOD.
- ODIS 3.0 (FWO-project, 2022–2027) migreert naar een Virtuoso-triple store met
  een JSON-API, afgestemd op RiC en OSLO. Een publieke SPARQL-endpoint is niet
  aangekondigd.
- ±42 000 records zijn gekoppeld in Wikidata (eigenschap P2372).

## Datamodel en URI's

- URI's: `https://www.odis.be/lnk/{PS|OR|PB|AE|OB|EV}_{n}` (webpagina's, geen
  content negotiation). Prefixen staan voor persoon, organisatie, periodiek,
  archief, gebouw en gebeurtenis (te bevestigen).
- Doelmodel ODIS 3.0: RiC en OSLO; details nog niet publiek.

## Licentie

CC BY-NC-SA 4.0. De NC-clausule is een voorbehoud voor hergebruik door
commerciële afnemers van het Termennetwerk; te bespreken met KADOC.

## Talen en omvang

- Talen: nl en en.
- Omvang: 153 970 publieke records (januari 2025).

## Resultaat automatische validatie

Nog niet uitgevoerd.

## Status in de catalogus

**Kandidaat.**

## Voorgestelde route naar opname

- Tussentijds: via de Wikidata-personendataset die al in de catalogus zit; de
  ODIS-link reist mee als `rdfs:seeAlso` op elk resultaat met P2372.
- Natief: partnerroute KADOC/LIBIS zodra ODIS 3.0 een SPARQL-endpoint of een
  RDF-dump aanbiedt; in het laatste geval laadt meemoo de dump in de gehoste
  endpoint.

## Open vragen voor de bronhouder

1. Komt er in ODIS 3.0 een publieke SPARQL-endpoint of een periodieke RDF-dump?
2. Welke URI-strategie en content negotiation plant ODIS 3.0?
3. Kan de licentie voor de identificerende metadata (naam, data, identifiers)
   versoepeld worden naar CC BY of CC0?
4. Wie is technisch aanspreekpunt bij LIBIS?
5. Welke recordtypes worden publiek ontsloten in de nieuwe API?
