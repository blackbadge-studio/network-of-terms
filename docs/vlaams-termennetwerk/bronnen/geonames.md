# Intake: GeoNames

Feiten geverifieerd op 25 oktober 2026. Aanvullingen uit algemene kennis zijn
gemarkeerd als "te bevestigen".

## Inhoudelijke scope

GeoNames is een wereldwijde geografische databank met ±12 miljoen features
(plaatsen, administratieve eenheden, waterlopen, gebouwen, enz.).
Resultaatstype voor het Termennetwerk: `place`. GeoNames is een verplichte bron
volgens het bestek; voor Vlaamse erfgoedbeschrijving is vooral de subset België
en Nederland relevant.

## Bronhouder en contactpunten

- Bronhouder: GeoNames (Unxos GmbH, Zwitserland; te bevestigen).
- Contact: via https://www.geonames.org (forum en e-mail; te bevestigen).

## Technische publicatievorm (LOD/SPARQL/API/dump)

- RDF per feature via content negotiation.
- Volledige RDF-dump.
- JSON-zoek-API (vereist gebruikersnaam en is onderhevig aan dagelijkse limieten,
  te bevestigen).
- Geen SPARQL-endpoint.

## Datamodel en URI's

- URI's: `https://sws.geonames.org/{id}/`.
- GeoNames-ontologie (`gn:Feature`, `gn:name`, `gn:alternateName`, `gn:parentADM*`,
  `gn:featureClass`/`gn:featureCode`, `wgs84_pos:lat`/`long`).
- Wikidata koppelt via eigenschap P1566.

## Licentie

CC BY 4.0.

## Talen en omvang

- Meertalig (alternatieve namen per taal).
- ±12 miljoen features wereldwijd; de BE/NL-subset is een fractie daarvan
  (aantal nog niet geteld).

## Resultaat automatische validatie

Nog niet uitgevoerd.

## Status in de catalogus

**In voorbereiding.**

## Voorgestelde route naar opname

- Door meemoo gehoste SPARQL-endpoint (dezelfde `sparql-host` als voor Onroerend
  Erfgoed) geladen uit de RDF-dump, gefilterd op België en Nederland; periodieke
  hersynchronisatie.
- Alternatief: een wrapper rond de JSON-API (vereist engine-aanpassing).
- Tussentijds: de al aangesloten Wikidata-dataset met plaatsen in België, die
  GeoNames-identifiers (P1566) als `skos:exactMatch` kan meegeven.

## Open vragen voor de bronhouder

1. Welke dumpvorm is het meest geschikt voor een gefilterde import (RDF-dump
   versus landspecifieke tekstdumps)?
2. Hoe vaak wordt de dump vernieuwd?
3. Zijn er voorwaarden aan het hosten van een afgeleide SPARQL-endpoint onder
   CC BY 4.0 (naamsvermelding)?
4. Welke featureklassen willen de Vlaamse gebruikers (enkel bewoonde plaatsen
   en administratieve eenheden, of ook gebouwen en waterlopen)?
