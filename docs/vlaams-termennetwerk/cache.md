# Resultaatcache

Het Vlaams Termennetwerk bevraagt bronnen live: een zoekvraag gaat parallel naar
de SPARQL-endpoints van alle geselecteerde bronnen en het antwoord is zo snel
als de traagste bron (begrensd door de timeout per bron). De API zelf doet
weinig werk; de wachttijd zit bij de bronnen. Een korte cache vangt herhaalde,
identieke vragen op – typisch: een gebruiker die terugkeert naar dezelfde
resultaten, een beheersysteem dat dezelfde URI's opnieuw valideert, of een
widget op een drukke pagina – zonder het realtime karakter op te geven.

## Wat er gecachet wordt

| Query     | Sleutel                                                           | Standaard-TTL op Laravel Cloud | Wordt gecachet                                                                        | Wordt nooit gecachet                           |
| --------- | ----------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `terms`   | per bron: bron, zoekterm, zoekmodus, limiet, genres, talen, types | 120 s (`CACHE_TTL_TERMS`)      | geslaagde antwoorden, ook "geen resultaten"                                           | `TimeoutError`, `ServerError`                  |
| `lookup`  | per URI: URI, talen                                               | 600 s (`CACHE_TTL_LOOKUP`)     | gevonden termen                                                                       | `NotFoundError`, `SourceNotFoundError`, fouten |
| `sources` | –                                                                 | –                              | – (de catalogus zit al in het geheugen; de bronstatus heeft een eigen cache van 60 s) | –                                              |

De cache werkt per bron: bij een zoekvraag over negen bronnen waarvan er zes in
de cache zitten, worden alleen de drie andere live bevraagd. Een trage of
falende bron houdt de rest dus niet tegen en komt bij de volgende vraag opnieuw
live aan de beurt.

Elke bron in het antwoord krijgt een veld `cached: Boolean!`. Een client die
altijd een live antwoord wil (monitoring, de simulator, een beheerder die een
bron valideert) stuurt de header `Cache-Control: no-cache`; dan wordt de cache
niet gelezen, wel bijgewerkt.

## Verhouding tot het bestek (F2.12)

In het requirementsformulier staat bij F2.12 dat het Termennetwerk geen
brondata cachet. Deze cache wijkt daar bewust en beperkt van af: hij bewaart
alleen het antwoord op een identieke vraag, enkele minuten, en nooit een fout.
Zet beide TTL's op `0` om exact het gedrag uit het bestek te krijgen; de code
valt dan terug op "geen cache". Dit moet met meemoo afgestemd worden en komt
in de documentatie voor API-integratoren ("resultaten kunnen tot twee minuten
oud zijn; stuur `Cache-Control: no-cache` voor een live antwoord").

## Backends

| Omgeving                    | Backend                                                                          | Hoe                                                                                                                                                           |
| --------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lokaal / één replica        | geheugen (LRU, `CACHE_MAX_ENTRIES`, standaard 5 000)                             | geen `REDIS_*`-variabelen, wel een TTL                                                                                                                        |
| Laravel Cloud (POC)         | Laravel Valkey `network-of-terms` (flex 250 MB, slaapt na 15 min, `allkeys-lru`) | cache aan de omgeving gekoppeld; Cloud injecteert `REDIS_URL` (`rediss://`, TLS) naast de losse `REDIS_*`-velden; niets zelf te configureren behalve de TTL's |
| meemoo-infrastructuur (AKS) | Redis of Valkey (Azure Cache for Redis, of een Valkey-container in de cluster)   | `REDIS_URL=rediss://…` of `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`; TLS standaard aan tenzij `localhost` (`REDIS_TLS=auto                                   | true | false`) |

Met meer dan één API-replica is een gedeelde backend nodig, anders heeft elke
replica een eigen cache en daalt de trefkans. Een cache die onbereikbaar of
traag is, breekt nooit een zoekvraag: de client gebruikt korte timeouts (2 s
verbinden, 500 ms per commando), stelt niets uit en telt elke fout als een
misser.

## Configuratie

| Variabele                                                      | Standaard  | Betekenis                                                       |
| -------------------------------------------------------------- | ---------- | --------------------------------------------------------------- |
| `CACHE_TTL_TERMS`                                              | `0` (uit)  | seconden dat een geslaagd zoekresultaat per bron bewaard blijft |
| `CACHE_TTL_LOOKUP`                                             | `0` (uit)  | seconden dat een gevonden term per URI bewaard blijft           |
| `CACHE_MAX_ENTRIES`                                            | `5000`     | grootte van de geheugencache                                    |
| `REDIS_URL`                                                    | –          | volledige Redis/Valkey-URL; heeft voorrang op `REDIS_HOST`      |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD` | – / `6379` | losse verbindingsgegevens (zo injecteert Laravel Cloud ze)      |
| `REDIS_TLS`                                                    | `auto`     | `true`, `false` of `auto` (TLS behalve op `localhost`)          |

## Opvolging

`GET /health` toont de backend, de TTL's, de verbinding (host, poort, TLS, klaar, laatste fout; nooit het wachtwoord) en tellers voor hits, misses,
schrijfacties en fouten sinds de start van de replica. Laravel Cloud toont
daarnaast de hit/miss-ratio van de Valkey-cache onder Organization › Resources
› Caches. Een invalidatie per bron is er niet: wie een bron aanpast, ziet de
wijziging na maximaal één TTL.

## Gemeten op Laravel Cloud (26 oktober 2026)

Zoekvraag "Rubens" over drie bronnen (Wikidata-personen, Gentse thesaurus, RKDartists):

| Poging                        | Wikidata | Gent   | RKD    |
| ----------------------------- | -------- | ------ | ------ |
| eerste (live)                 | 924 ms   | 576 ms | 106 ms |
| tweede (cache)                | 103 ms   | 103 ms | 103 ms |
| met `Cache-Control: no-cache` | 827 ms   | 530 ms | 56 ms  |

Het hele antwoord uit de cache duurt rond 100 ms: één ronde naar Valkey plus
de verwerking in de API. Het levert vooral winst op bij trage bronnen.
