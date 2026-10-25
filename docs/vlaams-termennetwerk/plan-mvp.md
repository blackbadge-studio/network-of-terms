# Vlaams Termennetwerk – MVP-plan

Werkdocument voor de MVP-oplevering (46 werkdagen na gunning). Het koppelt de
opleveringen uit het bestek aan de twee repositories en houdt de stand bij.

| Repository | Rol | Omgeving |
| --- | --- | --- |
| `network-of-terms` (deze repo, branch `poc/laravel-cloud`) | GraphQL API, statusdienst, Vlaamse catalogus, documentatie, testsuite | Laravel Cloud app `network-of-terms` |
| `network-of-terms-demo` (branch `poc/vlaams-termennetwerk`) | Publieke zoekinterface (POC) + inbedbare widget | Laravel Cloud app `vlaams-termennetwerk-ui` |

## Opleveringen en waar ze landen

| # | Oplevering (bestek) | Waar | Status |
| --- | --- | --- | --- |
| 1 | API (GraphQL) + statusdienst | `packages/graphql`, `packages/status` – draait op Cloud | ✅ POC live |
| 1b | Vlaamse catalogus, los van de Nederlandse (`CATALOG_PATH`) | `catalog-vlaams/` in `packages/catalog` (eigen datasets, gedeelde query-sjablonen) | ⏳ |
| 2 | Publieke zoekinterface op de POC | `network-of-terms-demo` | ✅ POC live, uitbreidingen ⏳ |
| 2b | Inbedbare zoekwidget (één script-tag) | nieuw package in `network-of-terms-demo` | ⏳ |
| 3 | 10 bronnen aangesloten of als kandidaat gedocumenteerd | `catalog-vlaams/datasets/*.jsonld` + `docs/vlaams-termennetwerk/bronnen/` (intake per bron) | ⏳ zie [Bronnen](#bronnen) |
| 4a | Resultaatstype (`resultType`, `additionalType`, filter `types`) F1.3 F2.4 F4.2 | catalogus (typemapping per bron), `packages/query`, GraphQL-schema | ⏳ |
| 4b | Timeout per bron F3.7 | catalogus (`vtn:timeoutMs`), `packages/query` | ⏳ |
| 4c | Hiërarchie: `path` (broodkruimel) F2.23 F4.16 en `browse` (boom) F5.1 | derde sjabloon `queries/browse/*.rq`, `packages/query`, GraphQL `browse` | ⏳ |
| 4d | Detailweergave authorities per resultaatstype F4.14 F6.1 F7.5 | zoekinterface (detailpagina met eigen URL, veldenconfig per type) | ⏳ |
| 4e | Healthcheck `/health` op API en statusdienst F10.7 | `packages/graphql/src/server.ts`, `packages/status/src/main.ts` | ⏳ |
| 4f | Rapportage: geaggregeerde gebruikslogging + maandrapport (CSV + samenvatting) F10.10 | `packages/graphql` (logging), `packages/status` (opslag + rapport) | ⏳ |
| 5 | Documentatie voor 4 doelgroepen (§3.4.12) + changelog t.o.v. NL | `docs/vlaams-termennetwerk/{integratoren,bronhouders,beheerders,gebruikers}/`, `docs/vlaams-termennetwerk/changelog-vs-nl.md` | ⏳ |
| 6 | Testplan, testscenario's per bron, gekende beperkingen | `docs/vlaams-termennetwerk/testplan.md`, `catalog-vlaams/tests/<bron>.json` (CLI + CI), `docs/vlaams-termennetwerk/gekende-beperkingen.md` | ⏳ |
| 7 | Deploymentdocumentatie voor overdracht naar meemoo-infra | `docs/vlaams-termennetwerk/deployment.md` (Docker-images, env-vars, Postgres, probes, Kubernetes-voorbeeld) | ⏳ |

## Catalogusuitbreidingen (vocabulaire `vtn:`)

De Vlaamse catalogus blijft schema.org-JSON-LD zoals de Nederlandse, aangevuld
met een kleine eigen namespace `https://termennetwerk.meemoo.be/ns#` (`vtn:`)
voor wat schema.org niet biedt. SHACL en de catalogus-lens worden mee uitgebreid.

| Veld | Op | Betekenis |
| --- | --- | --- |
| `vtn:timeoutMs` | DataDownload | maximale wachttijd voor deze bron; de engine neemt het minimum van dit veld en `timeoutMs` van de request |
| `vtn:resultType` | Dataset | welke centrale resultaatstypes de bron oplevert (`concept`, `person`, `organization`, `place`, `event`) |
| `vtn:typeMapping` | Dataset | mapping van `rdf:type` in het bronresultaat naar een centraal resultaatstype |
| `vtn:status` | Dataset | `mvp`, `test`, `candidate`, `preparation`, `deactivated` (bronnenpagina + `sources`-query) |
| `vtn:limitations` | Dataset | technische beperkingen (vrije tekst, meertalig) |
| `schema:contactPoint` | Dataset | contactpunten met rol (organisatorisch, technisch, inhoudelijk) |
| `schema:license` | Dataset | licentie van de bron |
| BrowseAction (`potentialAction`) | DataDownload | derde sjabloon voor boomnavigatie (topconcepten + nauwere termen van een URI) |

## Bronnen

_Wordt aangevuld zodra de bronanalyse (SPARQL/LOD-beschikbaarheid per
kandidaat) afgerond is: 10 bronnen, opgesplitst in "nu aansluiten" en
"kandidaat met intake"._

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
