# Vlaams Termennetwerk – MVP-plan

Werkdocument voor de MVP-oplevering (46 werkdagen na gunning). Het koppelt de
opleveringen uit het bestek aan de twee repositories en houdt de stand bij.

| Repository                                                  | Rol                                                                   | Omgeving                                    |
| ----------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------- |
| `network-of-terms` (deze repo, branch `poc/laravel-cloud`)  | GraphQL API, statusdienst, Vlaamse catalogus, documentatie, testsuite | Laravel Cloud app `network-of-terms`        |
| `network-of-terms-demo` (branch `poc/vlaams-termennetwerk`) | Publieke zoekinterface (POC) + inbedbare widget                       | Laravel Cloud app `vlaams-termennetwerk-ui` |

## Opleveringen en waar ze landen

| #   | Oplevering (bestek)                                                                  | Waar                                                                                                                                       | Status                                                                |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| 1   | API (GraphQL) + statusdienst                                                         | `packages/graphql`, `packages/status` – draait op Cloud                                                                                    | ✅ POC live                                                           |
| 1b  | Vlaamse catalogus, los van de Nederlandse (`CATALOG_PATH=catalog-vlaams`)            | `catalog-vlaams/` in `packages/catalog` (eigen datasets, gedeelde query-sjablonen)                                                         | ✅ op productie sinds 25-10-2026 (9 bronnen; Getty nog te verifiëren) |
| 2   | Publieke zoekinterface op de POC                                                     | `network-of-terms-demo`                                                                                                                    | ✅ POC live, uitbreidingen ⏳                                         |
| 2b  | Inbedbare zoekwidget (één script-tag)                                                | nieuw package in `network-of-terms-demo`                                                                                                   | ⏳                                                                    |
| 3   | 10 bronnen aangesloten of als kandidaat gedocumenteerd                               | `catalog-vlaams/datasets/*.jsonld` + `docs/vlaams-termennetwerk/bronnen/` (intake per bron)                                                | 🔶 9 aangesloten, 9 intakes in `docs/vlaams-termennetwerk/bronnen/`   |
| 4a  | Resultaatstype (`resultType`, `additionalType`, filter `types`) F1.3 F2.4 F4.2       | catalogus (typemapping per bron), `packages/query`, GraphQL-schema                                                                         | ✅                                                                    |
| 4b  | Timeout per bron F3.7                                                                | catalogus (`vtn:timeoutMs`), `packages/query`                                                                                              | ✅                                                                    |
| 4c  | Hiërarchie: `path` (broodkruimel) F2.23 F4.16 en `browse` (boom) F5.1                | derde sjabloon `queries/browse/*.rq`, `packages/query`, GraphQL `browse`                                                                   | ⏳                                                                    |
| 4d  | Detailweergave authorities per resultaatstype F4.14 F6.1 F7.5                        | zoekinterface (detailpagina met eigen URL, veldenconfig per type)                                                                          | ⏳                                                                    |
| 4e  | Healthcheck `/health` op API en statusdienst F10.7                                   | `packages/graphql/src/server.ts`, `packages/status/src/main.ts`                                                                            | ✅                                                                    |
| 4f  | Rapportage: geaggregeerde gebruikslogging + maandrapport (CSV + samenvatting) F10.10 | `packages/graphql` (logging), `packages/status` (opslag + rapport)                                                                         | ⏳                                                                    |
| 5   | Documentatie voor 4 doelgroepen (§3.4.12) + changelog t.o.v. NL                      | `docs/vlaams-termennetwerk/{integratoren,bronhouders,beheerders,gebruikers}/`, `docs/vlaams-termennetwerk/changelog-vs-nl.md`              | ⏳                                                                    |
| 6   | Testplan, testscenario's per bron, gekende beperkingen                               | `docs/vlaams-termennetwerk/testplan.md`, `catalog-vlaams/tests/<bron>.json` (CLI + CI), `docs/vlaams-termennetwerk/gekende-beperkingen.md` | ⏳                                                                    |
| 7   | Deploymentdocumentatie voor overdracht naar meemoo-infra                             | `docs/vlaams-termennetwerk/deployment.md` (Docker-images, env-vars, Postgres, probes, Kubernetes-voorbeeld)                                | ⏳                                                                    |

## Catalogusuitbreidingen (vocabulaire `vtn:`)

De Vlaamse catalogus blijft schema.org-JSON-LD zoals de Nederlandse, aangevuld
met een kleine eigen namespace `https://termennetwerk.meemoo.be/ns#` (`vtn:`)
voor wat schema.org niet biedt. SHACL en de catalogus-lens worden mee uitgebreid.

| Veld                             | Op           | Betekenis                                                                                                 |
| -------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------- |
| `vtn:timeoutMs`                  | DataDownload | maximale wachttijd voor deze bron; de engine neemt het minimum van dit veld en `timeoutMs` van de request |
| `vtn:resultType`                 | Dataset      | welke centrale resultaatstypes de bron oplevert (`concept`, `person`, `organization`, `place`, `event`)   |
| `vtn:typeMapping`                | Dataset      | mapping van `rdf:type` in het bronresultaat naar een centraal resultaatstype                              |
| `vtn:status`                     | Dataset      | `mvp`, `test`, `candidate`, `preparation`, `deactivated` (bronnenpagina + `sources`-query)                |
| `vtn:limitations`                | Dataset      | technische beperkingen (vrije tekst, meertalig)                                                           |
| `schema:contactPoint`            | Dataset      | contactpunten met rol (organisatorisch, technisch, inhoudelijk)                                           |
| `schema:license`                 | Dataset      | licentie van de bron                                                                                      |
| BrowseAction (`potentialAction`) | DataDownload | derde sjabloon voor boomnavigatie (topconcepten + nauwere termen van een URI)                             |

## Bronnen

### Wat het bestek vraagt (§3.1 B en §3.4.7)

Een eigen Vlaamse broncatalogus, los van de Nederlandse, met als eerste set
**minstens** deze tien bronnen – vijf Vlaamse en vijf internationale:

| Vlaamse bronnen                    | Internationale bronnen              |
| ---------------------------------- | ----------------------------------- |
| Visual Name Authority              | Getty vocabulaires (AAT, ULAN, TGN) |
| ODIS                               | Wikidata                            |
| Directory of Belgian Photographers | GeoNames                            |
| European Fashion Thesaurus         | RKDartists                          |
| Thesaurus Onroerend Erfgoed        | VIAF                                |

Per bron moeten we aangeven of aansluiting via de bestaande catalogus- en
querywerking kan, welke configuratie nodig is en of er bijkomende mapping
vereist is. Bronnen die nog niet als LOD via SPARQL beschikbaar zijn, mogen
enkel als kandidaat of voorbereidend traject beschreven worden (§3.4.6); een
technische partner of gedeelde infrastructuur mag de LOD-publicatie verzorgen.
De overige Nederlandse bronnen vallen niet onder de opdracht ("structureel
beheer van Nederlandse bronnen" is buiten scope, §3.2), maar de tests moeten
aantonen dat gewenste Nederlandse functionaliteit niet onbedoeld verloren gaat
(§3.7). RKDartists hoort dus expliciet bij de Vlaamse catalogus; Adamlink, GTAA,
CHT en de andere Nederland-specifieke bronnen niet.

### Stand per bron uit de bronanalyse

Resultaat van de bronanalyse (25 oktober 2026, publieke endpoints live
geverifieerd). Let op: de Query Engine stuurt SPARQL-queries rechtstreeks naar
een endpoint (Comunica is uit de engine gehaald), dus een bron zonder
SPARQL-endpoint komt enkel binnen via een door meemoo gehoste endpoint op basis
van een RDF-dump – de route die het bestek al voorziet (F9.13).

### Nu aansluiten (publiek SPARQL-endpoint beschikbaar)

| #   | Bron                                                                                      | Bronhouder                   | Types                       | Endpoint                                                                                                      | Opmerking                                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------- | ---------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Thesauri Onroerend Erfgoed: Erfgoedtypes (±1 966 concepten)                               | agentschap Onroerend Erfgoed | concept                     | geen SPARQL; TPF `thesaurus.onroerenderfgoed.be/ldf/ERFGOEDTYPES`, dump `…/conceptschemes/ERFGOEDTYPES/c.ttl` | gehoste endpoint vanuit de dump (dagelijkse sync); licentie Vlaamse Modellicentie Gratis Hergebruik; URI's `id.erfgoed.net/thesauri/erfgoedtypes/{id}` met exactMatch naar AAT |
| 2   | Thesauri Onroerend Erfgoed: Materialen, Stijlen en culturen, Dateringen, Gebeurtenistypes | agentschap Onroerend Erfgoed | concept                     | idem, één dataset per schema                                                                                  | zelfde gehoste endpoint, aparte graphs                                                                                                                                         |
| 3   | VTMK – Visuele Thesaurus voor Mode & Kostuums (1 292 concepten, nl/en)                    | MoMu                         | concept                     | `https://vtmk.data.momu.be/PoolParty/sparql/id` (PoolParty, live geverifieerd)                                | licentie niet vermeld → bevestigen met MoMu                                                                                                                                    |
| 4   | Wikidata: personen met Belgische/Vlaamse link                                             | Wikimedia                    | person                      | `https://query.wikidata.org/sparql`                                                                           | NDE-sjabloon + `wdt:P27 wd:Q31` of Vlaamse identifiers (ODIS P2372, FOMU P8696, BALaT P1901); CC0                                                                              |
| 5   | Wikidata: plaatsen in Vlaanderen/België (incl. gemeenten met NIS-code)                    | Wikimedia                    | place                       | idem                                                                                                          | NDE-plaatsensjabloon + `wdt:P17 wd:Q31`; vervangt de Vlaamse basisregisters (enkel REST, rate-limited)                                                                         |
| 6   | Getty AAT                                                                                 | Getty Research Institute     | concept                     | `http://vocab.getty.edu/sparql` (NDE-sjabloon hergebruiken)                                                   | endpoint vandaag gedegradeerd (499/504; `data.getty.edu` vraagt token) → status opvolgen, timeout per bron laag zetten                                                         |
| 7   | Getty TGN en ULAN                                                                         | Getty Research Institute     | place / person+organization | idem, nieuwe sjablonen naar model van AAT (`luc:term`, `xl:literalForm`)                                      | zelfde voorbehoud als AAT                                                                                                                                                      |
| 8   | Stad Gent / CoGhent thesaurus (en personen)                                               | Stad Gent + 5 musea          | concept, person             | `https://stad.gent/sparql` (Virtuoso, live geverifieerd), graph `<http://stad.gent/ldes/thesaurus>`           | concept-URI's zijn geversioneerd; personen-graph eerst inspecteren; licentie "Vlaamse open data" bevestigen                                                                    |

### Kandidaat met intake (nog geen LOD/SPARQL)

| #   | Bron                                                                           | Bronhouder                         | Types                              | Toestand                                                                                             | Voorgestelde route                                                                                                                                        |
| --- | ------------------------------------------------------------------------------ | ---------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9   | ODIS (±154 000 publieke records)                                               | KADOC-KU Leuven / ODIS vzw (LIBIS) | person, organization, event        | geen publieke LOD; ODIS 3.0 (Virtuoso + JSON-API) loopt tot 2027; 42 000 records in Wikidata (P2372) | partnerroute KADOC/LIBIS; tussentijds via Wikidata (#4); licentie CC BY-NC-SA is een hergebruikvoorbehoud                                                 |
| 10  | MoMu Thesaurus (Opentheso; opgeschoonde Europeana Fashion Thesaurus, 11 talen) | MoMu                               | concept                            | enkel Opentheso REST-API (SKOS JSON-LD per concept, ARK-URI's); geen SPARQL                          | periodieke SKOS-export → gehoste endpoint; licentie bevestigen met MoMu                                                                                   |
| –   | Visual Name Authority                                                          | meemoo + 24 partners               | person                             | prototypefase tot september 2026, geen dataset/endpoint                                              | partnerroute meemoo; zodra er een export is, aansluiten op QAS                                                                                            |
| –   | Directory of Belgian Photographers (±8 600)                                    | FOMU                               | person, organization               | AtoM-bètasite, geen API gedocumenteerd; 1 035 in Wikidata (P8696)                                    | AtoM-export (EAC) → gehoste endpoint, in overleg met FOMU; tussentijds via Wikidata                                                                       |
| –   | BALaT personen & instellingen → MetaBelgica                                    | KIK-IRPA, KBR, KMKG, KMSKB         | person, organization, event, place | MetaBelgica-Wikibase (>1 M entiteiten) nog niet publiek; resultaten 18 november 2026                 | wachten op de Wikibase query service; contact KIK-IRPA                                                                                                    |
| 11  | GeoNames (BE/NL-subset) – verplicht volgens bestek                             | GeoNames                           | place                              | RDF-dump + JSON-API, geen SPARQL                                                                     | gehoste endpoint vanuit de dump (BE/NL-subset), CC BY 4.0                                                                                                 |
| 12  | VIAF – verplicht volgens bestek                                                | OCLC                               | person, organization               | geen SPARQL; RDF per cluster, SRU/JSON-API, maandelijkse dumps (zeer groot)                          | tussentijds via Wikidata (`wdt:P214`, VIAF-ID als exactMatch op elk persoonsresultaat); native: gehoste endpoint vanuit een gefilterde dump, of kandidaat |
| 13  | RKDartists – verplicht volgens bestek                                          | RKD                                | person                             | SPARQL, NDE-catalogusentry en sjablonen hergebruiken                                                 | ongewijzigd overnemen                                                                                                                                     |

Risico's voor meemoo: (1) Getty-endpoint instabiel; (2) de meeste Vlaamse
persoonsbronnen hebben nog geen LOD, Wikidata is de praktische brug; (3)
licenties van de MoMu-thesauri en de Gentse data staan niet expliciet op de
datapagina's.

## Volgorde

1. Healthcheck en timeout per bron (klein, fundament voor monitoring).
2. Resultaatstype + typefilter (catalogus, engine, schema) – nodig voor de
   detailweergave en de bronnenpagina.
3. Vlaamse catalogus met de eerste bronnen + testscenario's per bron.
4. Hiërarchie: `path` en `browse`.
5. Rapportage.
6. Zoekinterface: typefilter, statusmeldingen per bron, detailpagina,
   broodkruimel/boom; daarna de widget.
7. Documentatie, testplan, gekende beperkingen, deploymentdocumentatie
   (lopen mee met elke stap; eindredactie op het einde).
