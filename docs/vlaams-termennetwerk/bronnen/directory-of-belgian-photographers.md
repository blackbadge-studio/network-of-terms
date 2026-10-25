# Intake: Directory of Belgian Photographers

Feiten geverifieerd op 25 oktober 2026. Aanvullingen uit algemene kennis zijn
gemarkeerd als "te bevestigen".

## Inhoudelijke scope

De Directory of Belgian Photographers van FOMU (Fotomuseum Antwerpen) bevat
±8 600 beschrijvingen van fotografen die in België actief waren tussen 1839 en
1914: personen, maar ook ateliers en firma's. Resultaatstypes voor het
Termennetwerk: `person` en `organization` (verdeling te bevestigen).

## Bronhouder en contactpunten

- Bronhouder: FOMU – Fotomuseum Antwerpen.
- Contact: directory@fomu.be.

## Technische publicatievorm (LOD/SPARQL/API/dump)

- Bètasite in AtoM: https://fomu.atomis.be.
- Geen API, OAI-PMH of RDF gedocumenteerd. AtoM biedt doorgaans wel EAC-CPF- en
  CSV-export van authority records (te bevestigen voor deze installatie).
- 1 035 beschrijvingen zijn gekoppeld in Wikidata (eigenschap P8696).

## Datamodel en URI's

- AtoM authority records (ISAAR(CPF)/EAC-CPF) op de bètasite; de URL per record
  is een webpagina zonder content negotiation.
- Persistentie van de huidige URL's is niet gegarandeerd zolang de site "beta"
  is (te bevestigen).

## Licentie

Niet vermeld op de site; te bevestigen met FOMU.

## Talen en omvang

- Taal: enkel Engels.
- Omvang: ±8 600 beschrijvingen.

## Resultaat automatische validatie

Nog niet uitgevoerd.

## Status in de catalogus

**Kandidaat.**

## Voorgestelde route naar opname

- Tussentijds: via de Wikidata-personendataset (P8696 als identifier, link als
  `rdfs:seeAlso`).
- Natief: in overleg met FOMU een periodieke AtoM-export (EAC-CPF of CSV)
  omzetten naar SKOS/`schema:Person` en laden in de door meemoo gehoste
  SPARQL-endpoint; URI's op basis van de AtoM-slugs, na afspraak over
  persistentie.

## Open vragen voor de bronhouder

1. Welke licentie geldt voor de metadata?
2. Kan FOMU een EAC-CPF- of CSV-export aanleveren, en hoe vaak?
3. Blijven de huidige URL's stabiel na de bètafase?
4. Zijn Nederlandse labels gepland?
5. Is er interesse in een terugkoppeling van Wikidata-matches naar de Directory?
