# Intake: MoMu Thesaurus (Opentheso)

Feiten geverifieerd op 25 oktober 2026. Aanvullingen uit algemene kennis zijn
gemarkeerd als "te bevestigen".

## Inhoudelijke scope

De MoMu Thesaurus is de in het TAG-project opgeschoonde en geherstructureerde
opvolger van de Europeana Fashion Thesaurus: mode- en kostuumterminologie
(objecttypes, materialen, technieken, enz.). In Opentheso staan twee thesauri:
`th32` MoMu_thesaurus en `th90` MoMu_Rollen. Resultaatstype: `concept`.

De verwante VTMK (Visuele Thesaurus voor Mode & Kostuums, PoolParty SPARQL) is al
aangesloten in de catalogus; de MoMu Thesaurus is er een aanvulling op, geen
vervanging (verhouding te bevestigen met MoMu).

## Bronhouder en contactpunten

- Bronhouder: MoMu – ModeMuseum Antwerpen.
- Contactpersoon: nog niet bekend; op te vragen via MoMu.

## Technische publicatievorm (LOD/SPARQL/API/dump)

- Opentheso: https://thesaurus.momu.be/opentheso/.
- REST-API met OpenAPI-beschrijving op `/opentheso/v3/api-docs`; bv.
  `https://thesaurus.momu.be/opentheso/openapi/v1/concept/th32/search?q=jurk&lang=nl`
  geeft SKOS JSON-LD terug.
- Geen SPARQL-endpoint. Opentheso kan SKOS exporteren (te bevestigen of dit
  publiek is ingeschakeld).
- Legacy Europeana Fashion Thesaurus: `http://thesaurus.europeanafashion.eu/thesaurus/{id}`
  serveert nog RDF per concept, de API is dood; Wikidata-eigenschap P3832 met
  1 054 gebruiken.

## Datamodel en URI's

- SKOS via Opentheso; ARK-URI's `https://thesaurus.momu.be/opentheso/api/ark:/34546/{id}`.
- Mapping van de nieuwe ARK-URI's naar de oude Europeana Fashion-URI's: te
  bevestigen (belangrijk voor bestaande Wikidata-koppelingen).

## Licentie

Niet vermeld; te bevestigen met MoMu.

## Talen en omvang

- 11 talen.
- Aantal concepten onbekend: de statistiek-endpoint geeft een fout.

## Resultaat automatische validatie

Nog niet uitgevoerd.

## Status in de catalogus

**Kandidaat.**

## Voorgestelde route naar opname

Periodieke SKOS-export uit Opentheso naar de door meemoo gehoste SPARQL-endpoint
(één graph per thesaurus), of MoMu vragen de SPARQL/export-functie van Opentheso
publiek open te zetten. Licentie bevestigen vóór opname. Kruisverwijzing naar
VTMK en Europeana Fashion via `skos:exactMatch` waar beschikbaar.

## Open vragen voor de bronhouder

1. Welke licentie geldt voor de thesaurus?
2. Kan MoMu een SKOS-export of SPARQL-toegang uit Opentheso aanbieden?
3. Hoeveel concepten bevatten th32 en th90?
4. Bestaat er een mapping tussen ARK-URI's en de Europeana Fashion-URI's?
5. Hoe verhouden MoMu Thesaurus en VTMK zich (overlap, voorkeur)?
