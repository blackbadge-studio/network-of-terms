# Testplan Vlaams Termennetwerk

Dit plan beschrijft hoe meemoo de MVP test vóór de productiegang (bestek §3.7):
welke omgevingen, welke testsoorten, de scenario's voor API en zoekinterface,
hoe testrondes verlopen en wanneer een oplevering aanvaard is.

## 1. Omgevingen

| Omgeving                    | API                                                      | Zoekinterface                                                   | Gebruik                                                     |
| --------------------------- | -------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| Test (POC, Laravel Cloud)   | https://network-of-terms-production-59fup0.laravel.cloud | https://vlaams-termennetwerk-ui-production-zi7ngv.laravel.cloud | testrondes met meemoo tijdens de MVP                        |
| QAS (meemoo-infrastructuur) | door meemoo te bepalen                                   | idem                                                            | aanvaardingstest na overdracht (zie deploymentdocumentatie) |
| Lokaal                      | `npm start` (poort 3123)                                 | `npm run dev` (poort 5173)                                      | ontwikkeling en CI                                          |

De testomgeving draait de Vlaamse catalogus (`CATALOG_PATH=catalog-vlaams`), een
eigen statusdienst met Postgres, geen resultaatcache (elke vraag gaat live naar de bron) en geen
enkele afhankelijkheid van de Nederlandse productieomgeving.

## 2. Testsoorten

1. **Geautomatiseerde code-tests** (Vitest, per package): query engine, catalogus
   (SHACL-validatie van beide catalogi, parsing van alle SPARQL-sjablonen),
   GraphQL-server, statusdienst. Draaien bij elke commit en in CI:
   `npx nx run-many -t test`.
2. **Acceptatiescenario's** (dit plan, §4): 49 scenario's die de live API en
   zoekinterface aanspreken en het resultaat controleren. Eén bestand,
   `packages/graphql/scenarios/scenarios.json`, twee manieren om ze te draaien:
   - in de terminal of CI:
     `npm run test:scenarios -- --api <API-URL> --ui <UI-URL>`
     (schrijft `test-results/scenarios.json` en een JUnit-rapport; eindigt met
     foutcode bij een gefaald scenario);
   - in de browser: de pagina **Simulator › Acceptatietests** van de
     zoekinterface laadt dezelfde scenario's en runner van de API
     (`/tests/scenarios.json`, `/tests/runner.mjs`), toont per scenario
     geslaagd of gefaald met verwachte en gekregen waarde, en exporteert een
     testrapport in Markdown voor de testronde.
3. **Performantie- en belastingstests**: de simulator (tempo rustig tot stress,
   gelijktijdigheid, duur) meet per bron p50, p95 en maximum responstijd,
   slagingspercentage, en exporteert NDJSON/CSV.
4. **Manuele tests van de zoekinterface** (§5): gebruiksscenario's die een
   mens moet beoordelen (leesbaarheid, flow, toegankelijkheid, thema's).
5. **Toegankelijkheid**: toetsenbordbediening en contrast (WCAG 2.1 AA) per
   pagina, in de vier thema's, op desktop en telefoonbreedte.

## 3. Rollen en testrondes

| Rol                     | Wie                                                                      | Taak                                                      |
| ----------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------- |
| Testcoördinator         | Black Badge Studio                                                       | plant rondes, draait de scenario's vooraf, levert rapport |
| Testers                 | meemoo (projectleider, beheerder, 1–2 collectiebeheerders, 1 integrator) | voeren §4 en §5 uit, melden bevindingen                   |
| Bronhouders (optioneel) | per aangesloten bron                                                     | controleren hun bron in de zoekinterface                  |

Elke ronde: (1) wij draaien alle scenario's en leveren het rapport, (2) meemoo
voert de manuele scenario's uit, (3) bevindingen gaan via de feedbackknop in de
zoekinterface (komt met schermafbeelding en pagina-URL in de projectopvolging)
of als issue, (4) we triëren samen: blokkerend / moet voor productie / later,
(5) correcties en een nieuwe ronde. Voorzien: twee rondes tijdens de MVP en een
herhaling na overdracht naar QAS.

## 4. Acceptatiescenario's

Een scenario slaagt als alle controles slagen. Live bronnen veranderen, dus de
controles toetsen eigenschappen (er is een persoon, de URI hoort bij de bron,
de responstijd blijft onder een grens) en geen exacte resultaatlijsten.

| ID     | Gebied                        | Scenario                                                              | Requirement               |
| ------ | ----------------------------- | --------------------------------------------------------------------- | ------------------------- |
| API-01 | Federatief zoeken             | Zoeken in één bron (RKDartists, "Rubens")                             | F2.1, F2.5                |
| API-02 | Federatief zoeken             | Elke term draagt bron, URI en label                                   | F2.9, F2.17, F4.1         |
| API-03 | Federatief zoeken             | Geen resultaten is een leeg antwoord, geen fout                       | F10.2, F10.5              |
| API-04 | Zoeken over meerdere bronnen  | Vier bronnen tegelijk: één resultaat per bron                         | F2.2, F2.3, F1.6          |
| API-05 | Zoeken over meerdere bronnen  | Alle negen bronnen: gedeeltelijke resultaten als een bron faalt       | F2.8, F10.1               |
| API-06 | Zoeken over meerdere bronnen  | Limiet per bron wordt gerespecteerd                                   | F2.6                      |
| API-07 | Zoeken over meerdere bronnen  | Typefilter: enkel personen                                            | F2.4, F2.10               |
| API-08 | Time-outs en foutafhandeling  | Time-out van de request levert TimeoutError, andere bronnen gaan door | F2.8, F10.5               |
| API-09 | Time-outs en foutafhandeling  | Elke bron heeft een eigen timeout in de catalogus                     | F3.7, F10.8               |
| API-10 | Time-outs en foutafhandeling  | Een onbekende bron geeft een duidelijke fout                          | F10.4                     |
| API-11 | URI-lookup                    | Lookup van een bekende Wikidata-URI (Rubens)                          | F2.14, F4.3, F4.13        |
| API-12 | URI-lookup                    | Lookup van een VTMK- en een Gentse URI in één vraag                   | F2.14, F4.4               |
| API-13 | URI-lookup                    | Onbestaande URI in een bekende bron geeft NotFoundError               | F4.5                      |
| API-14 | URI-lookup                    | URI van geen enkele bron geeft SourceNotFoundError                    | F4.5                      |
| API-15 | Termdetail                    | Termdetail: labels, beschrijving en mappings (Rubens)                 | F4.1, F4.14, F6.3         |
| API-16 | Termdetail                    | Meertalige labels met taaltag                                         | F2.19, §3.1 meertaligheid |
| API-17 | Hiërarchie                    | Bredere en nauwere termen in VTMK                                     | F2.11, F2.23              |
| API-18 | Hiërarchie                    | Bredere term in de Gentse thesaurus                                   | F2.11                     |
| API-40 | Hiërarchie                    | Bladeren: topconcepten van VTMK                                       | F5.1                      |
| API-41 | Hiërarchie                    | Bladeren: nauwere termen van "kleding" met hun bredere term           | F5.1, F2.23               |
| API-42 | Hiërarchie                    | Alleen conceptbronnen bieden bladeren aan                             | F5.1, F3.9                |
| API-43 | Hiërarchie                    | Bladeren in een personenbron geeft een duidelijke fout                | F5.1                      |
| API-19 | Bronstatus                    | Elke bron heeft een actuele status uit de eigen monitor               | F10.3, F10.11, F3.2       |
| API-20 | Bronstatus                    | Statusdienst publiceert observaties als LDES                          | F10.9                     |
| API-21 | Bronstatus                    | Healthcheck van de API                                                | F10.7                     |
| API-22 | Performantie                  | Zoekvraag over drie snelle bronnen binnen 5 s                         | F2.7                      |
| API-23 | Performantie                  | Herhaalde vraag wordt live beantwoord (geen cache, F2.12)             | F2.7, F2.12               |
| API-24 | API-documentatie              | GraphiQL is bereikbaar                                                | F11.1, F11.5              |
| API-25 | API-documentatie              | Schema beschrijft resultaatstypes, filters en foutcodes               | F11.1, F11.2, F4.12       |
| API-26 | Integratie                    | CORS staat externe applicaties toe                                    | F8.1, F11.7               |
| API-27 | Integratie                    | Inbedbare zoekwidget wordt geserveerd                                 | F7.2, F8.1                |
| API-28 | Integratie                    | Aanbevolen opslaggegevens in één vraag (URI, label, bron, type)       | F4.6, F8.2, F11.3         |
| API-29 | Vlaamse instantie, los van NL | Catalogus bevat de Vlaamse en internationale bestekbronnen            | §3.4.7, F3.1              |
| API-30 | Vlaamse instantie, los van NL | Catalogus bevat geen Nederland-specifieke bronnen                     | §3.3, §3.7                |
| API-31 | Vlaamse instantie, los van NL | Statusdienst is de eigen, niet die van NDE                            | §3.3, §3.7                |
| API-32 | Vlaamse instantie, los van NL | Vlaamse bronnen worden live via SPARQL bevraagd                       | §3.4.6, §3.7              |
| API-33 | Bruikbaar in Vlaanderen       | Vlaamse plaatsnaam "Ieper" vindt de gemeente                          | F2.5, §3.4.8              |
| API-34 | Bruikbaar in Vlaanderen       | Nederlandstalige labels standaard                                     | §3.4.8                    |
| API-35 | Bruikbaar in Vlaanderen       | Engelstalige interface vraagt Engelse labels                          | F2.19                     |
| API-36 | NL-functionaliteit behouden   | Genrefilter blijft beschikbaar                                        | §3.7                      |
| API-37 | NL-functionaliteit behouden   | Verouderd veld terms blijft werken (achterwaartse compatibiliteit)    | F9.1                      |
| API-38 | NL-functionaliteit behouden   | Zoekmodus RAW blijft werken                                           | F2.5                      |
| API-39 | NL-functionaliteit behouden   | Personen- en plaatsdetails (NDE-uitbreiding) blijven werken           | F4.14, §3.7               |
| UI-01  | Zoekinterface                 | Startpagina met zoekvak (nl)                                          | F7.2                      |
| UI-02  | Zoekinterface                 | Startpagina (en)                                                      | F2.19                     |
| UI-03  | Zoekinterface                 | Bronnenpagina                                                         | F3.12, F10.11             |
| UI-04  | Zoekinterface                 | Zoeken op URI                                                         | F2.22                     |
| UI-05  | Zoekinterface                 | Widgetdocumentatie                                                    | F7.2                      |
| UI-06  | Zoekinterface                 | Veelgestelde vragen                                                   | F11.11                    |

### Traceerbaarheid naar bestek §3.7

| Bestek §3.7 vraagt                                         | Scenario's                              |
| ---------------------------------------------------------- | --------------------------------------- |
| federatieve zoekopdrachten                                 | API-01 – API-03                         |
| zoekopdrachten over meerdere bronnen                       | API-04 – API-07                         |
| time-outs en foutafhandeling                               | API-05, API-08 – API-10, API-13, API-14 |
| URI-lookup                                                 | API-11 – API-14                         |
| termdetail                                                 | API-15, API-16, API-28, API-39          |
| hiërarchische informatie                                   | API-17, API-18                          |
| bronstatus                                                 | API-19 – API-21                         |
| performantie                                               | API-22, API-23, simulator (§2.3)        |
| API-documentatie                                           | API-24, API-25                          |
| integratie door externe applicaties                        | API-26 – API-28                         |
| Vlaamse instantie los van de Nederlandse productieomgeving | API-30, API-31                          |
| Vlaamse broncatalogus correct gebruikt                     | API-29, API-30                          |
| Vlaamse bronnen correct bevraagd via SPARQL                | API-32, API-12, API-17, API-18          |
| zoekinterface bruikbaar in de Vlaamse context              | API-33 – API-35, UI-01 – UI-06, §5      |
| gewenste Nederlandse functionaliteit niet verloren         | API-36 – API-39                         |

## 5. Manuele scenario's zoekinterface

| ID   | Scenario                                                                             | Verwacht resultaat                                                                                                                                                   |
| ---- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M-01 | Zoek "Gent" in alle bronnen                                                          | resultaten gegroepeerd per bron, bronnaam en -houder bij elk blok, per bron één van vier toestanden (n resultaten / geen resultaten / niet bereikbaar / niet tijdig) |
| M-02 | Een bron faalt (bv. Getty)                                                           | duidelijke melding bij die bron met "Opnieuw proberen", de rest van de resultaten blijft zichtbaar                                                                   |
| M-03 | Selecteer enkele bronnen via de bronkiezer, zoek, kopieer de URL en open hem opnieuw | selectie staat in de URL en wordt hersteld                                                                                                                           |
| M-04 | Kopieer een URI uit de resultatenlijst en uit de detailweergave                      | URI staat ongewijzigd op het klembord, bevestiging zichtbaar                                                                                                         |
| M-05 | Open een term en navigeer via een bredere term                                       | detail toont labels, beschrijving, relaties; klik op een bredere term opent die term                                                                                 |
| M-06 | "Bekijk bij bron"                                                                    | opent de pagina bij de bronhouder in een nieuw tabblad                                                                                                               |
| M-07 | Zoeken met URI (`http://www.wikidata.org/entity/Q102728`)                            | toont Ieper met bron en type                                                                                                                                         |
| M-08 | Onbekende URI                                                                        | duidelijke melding "niet gevonden" of "geen bron"                                                                                                                    |
| M-09 | Bronnenpagina                                                                        | alle negen bronnen met status (groen/rood/grijs), talen, onderwerpen, URI                                                                                            |
| M-10 | Taal wisselen NL/EN                                                                  | interface en waar mogelijk labels wisselen van taal; geen label leeg zonder uitleg                                                                                   |
| M-11 | Vier thema's                                                                         | elk thema leesbaar, geen overlappende of plakkende elementen, keuze blijft bewaard                                                                                   |
| M-12 | Telefoonbreedte                                                                      | zoeken, bronkiezer, resultaten en detail bruikbaar met de duim; feedbackknop bedekt niets                                                                            |
| M-13 | Enkel toetsenbord                                                                    | alle bediening bereikbaar met Tab/Enter/Escape, focus altijd zichtbaar                                                                                               |
| M-14 | Zoekwidget-pagina                                                                    | uitleg, snippet en configurator kloppen; widget werkt op een testpagina                                                                                              |
| M-15 | Feedbackknop                                                                         | melding met tekst (en optioneel schermafbeelding) komt aan bij de projectopvolging                                                                                   |

## 6. Aanvaardingscriteria

Een oplevering is klaar voor productie wanneer:

- alle code-tests slagen en de SHACL-validatie van de Vlaamse catalogus slaagt;
- alle acceptatiescenario's slagen, of een gefaald scenario uitsluitend
  verklaard wordt door een bron die op dat moment aantoonbaar onbereikbaar is
  (vermeld in het rapport en in de gekende beperkingen);
- de manuele scenario's M-01 – M-15 zonder blokkerende bevinding zijn
  uitgevoerd door meemoo;
- de performantie-afspraak gehaald wordt: zoekvraag over de snelle MVP-bronnen
  binnen 5 s (API-22) en geen bron die de totale zoekvraag langer ophoudt dan
  haar timeout;
- de gekende beperkingen ([gekende-beperkingen.md](gekende-beperkingen.md))
  door meemoo zijn gelezen en aanvaard.

## 7. Rapportage

Per ronde levert de testcoördinator: het scenario-rapport (Markdown-export uit
de simulator of `test-results/scenarios.json` + JUnit), de lijst bevindingen
met status, en een korte samenvatting met beslissing (go / no-go / go met
voorbehoud).

## 8. Eerste run (26 oktober 2026)

Tegen de testomgeving: 38 van 45 scenario's geslaagd bij de eerste run. De
zeven fouten bleken vijf keer een fout in het scenario zelf (tegenstrijdige
GraphQL-fragmenten) en twee keer een echte bevinding: lookups van
Wikidata-plaatsen liepen tegen de timeout aan omdat het sjabloon de volledige
klassenboom doorliep. Beide zijn gecorrigeerd. Tweede run na de
correctie: 44 van 45 geslaagd; de enige fout was opnieuw een scenario
(verkeerde Wikidata-identifier voor Ieper), daarna 45 van 45.
