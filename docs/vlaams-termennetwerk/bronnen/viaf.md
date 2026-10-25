# Intake: VIAF

Feiten geverifieerd op 25 oktober 2026. Aanvullingen uit algemene kennis zijn
gemarkeerd als "te bevestigen".

## Inhoudelijke scope

VIAF (Virtual International Authority File, OCLC) clustert authority records
van nationale bibliotheken en andere instellingen tot één identifier per
entiteit: personen en organisaties, daarnaast ook werken en geografische namen
(te bevestigen welke clustertypes relevant zijn). Resultaatstypes voor het
Termennetwerk: `person`, `organization`. VIAF is een verplichte bron volgens
het bestek.

## Bronhouder en contactpunten

- Bronhouder: OCLC.
- Contact: via de OCLC-ondersteuning; geen persoonlijk contactpunt bekend.
- Belgische bijdragers: KBR (te bevestigen).

## Technische publicatievorm (LOD/SPARQL/API/dump)

- Geen SPARQL-endpoint.
- RDF per cluster via content negotiation op de cluster-URI.
- SRU- en JSON-zoek-API.
- Maandelijkse dumps (zeer groot).

## Datamodel en URI's

- URI's: `https://viaf.org/viaf/{id}` (te bevestigen als canonieke vorm).
- RDF-model: schema.org-, SKOS- en RDA-vocabulaires per cluster (te bevestigen).
- Wikidata koppelt via eigenschap P214; RKDartists en ULAN dragen eveneens
  VIAF-identifiers.

## Licentie

ODC-BY voor de VIAF-data (te bevestigen; gebruiksvoorwaarden van OCLC gelden).

## Talen en omvang

- Meertalig (labels per bijdragende instelling).
- Omvang: tientallen miljoenen clusters (te bevestigen).

## Resultaat automatische validatie

Nog niet uitgevoerd.

## Status in de catalogus

**Kandidaat (indirect aangesloten via Wikidata).**

## Voorgestelde route naar opname

- Nu: VIAF-identifiers reizen mee als `skos:exactMatch` op resultaten van de
  Wikidata-personendatasets (P214) en van RKDartists en ULAN waar aanwezig. Zo
  levert elke persoonszoekopdracht de VIAF-URI zonder dat VIAF zelf bevraagd
  wordt.
- Natief: een door meemoo gehoste SPARQL-endpoint op basis van een gefilterde
  dump (bv. clusters met een Belgische bijdrager), of VIAF behouden als
  kandidaat als de kosten van dumpverwerking niet opwegen tegen de meerwaarde.
- Alternatief te onderzoeken: een lichte wrapper rond de JSON-API (vereist
  aanpassing van de engine, die vandaag enkel SPARQL spreekt).

## Open vragen voor de bronhouder

1. Welke licentie en gebruiksvoorwaarden gelden voor hergebruik van de dump?
2. Is een gefilterde dump (per bijdrager of land) beschikbaar?
3. Zijn er rate limits op de SRU/JSON-API bij live bevraging?
4. Welke RDF-serialisaties en vocabulaires levert de cluster-URI?
