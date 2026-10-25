# Intakes kandidaat-bronnen Vlaams Termennetwerk

Een intake is het voorbereidende dossier per kandidaat-bron dat het bestek
vraagt (F9.8): per bron beschrijven we de inhoudelijke scope, de
publicatievorm (LOD/SPARQL/API/dump), het datamodel en de URI's, de bronhouder
en de contactpunten, de licentie, en de SPARQL/LOD-readiness met een
voorgestelde route naar opname in de catalogus. Bronnen die vandaag al via een
publiek SPARQL-endpoint aansluitbaar zijn, hebben geen intake maar een
catalogusentry in `packages/catalog/catalog-vlaams/datasets/`. De feiten in
deze dossiers zijn geverifieerd op 25 oktober 2026; aanvullingen uit algemene
kennis zijn gemarkeerd als "te bevestigen". De automatische validatie is voor
alle intakes nog niet uitgevoerd.

| Bron                                                                            | Bronhouder                             | Types                              | LOD-status                                            | Status                                        | Route                                                                       |
| ------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------- | ----------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| [Thesauri Onroerend Erfgoed](thesaurus-onroerend-erfgoed.md)                    | agentschap Onroerend Erfgoed           | concept                            | SKOS; TPF + RDF-dumps, geen SPARQL                    | in voorbereiding                              | gehoste endpoint (`sparql-host`) uit dagelijkse dumps, één graph per schema |
| [Visual Name Authority](visual-name-authority.md)                               | meemoo + 24 partners                   | person                             | geen dataset/endpoint (prototype tot sept. 2026)      | kandidaat                                     | partnerroute meemoo; testexport aansluiten; tussentijds Wikidata            |
| [ODIS](odis.md)                                                                 | KADOC-KU Leuven / LIBIS                | person, organization, event        | geen LOD; ODIS 3.0 Virtuoso + JSON-API (2027)         | kandidaat                                     | tussentijds Wikidata (P2372); natief na ODIS 3.0                            |
| [Directory of Belgian Photographers](directory-of-belgian-photographers.md)     | FOMU                                   | person, organization               | AtoM-bètasite, geen API/RDF                           | kandidaat                                     | tussentijds Wikidata (P8696); AtoM-export naar gehoste endpoint             |
| [MoMu Thesaurus (Opentheso)](momu-thesaurus-opentheso.md)                       | MoMu                                   | concept                            | SKOS JSON-LD via REST-API, ARK-URI's, geen SPARQL     | kandidaat                                     | SKOS-export naar gehoste endpoint of SPARQL laten openzetten                |
| [BALaT / MetaBelgica](balat-metabelgica.md)                                     | KIK-IRPA; KBR, KMKG, KMSKB             | person, organization, event, place | BALaT geen API; MetaBelgica Wikibase nog niet publiek | kandidaat                                     | wachten op MetaBelgica query service (na 18 nov. 2026)                      |
| [VIAF](viaf.md)                                                                 | OCLC                                   | person, organization               | RDF per cluster, SRU/JSON-API, dumps, geen SPARQL     | kandidaat (indirect aangesloten via Wikidata) | identifiers als exactMatch via Wikidata/RKDartists/ULAN; natief uit dump    |
| [GeoNames](geonames.md)                                                         | GeoNames                               | place                              | RDF per feature + dump, JSON-API, geen SPARQL         | in voorbereiding                              | gehoste endpoint uit BE/NL-gefilterde dump; tussentijds Wikidata-plaatsen   |
| [Stad Gent / CoGhent personen](stad-gent-personen.md)                           | Stad Gent + Gentse musea               | person                             | SPARQL (Virtuoso), OSLO Persoon, LDES-geversioneerd   | test                                          | sjablonen OSLO Persoon naar Termennetwerk-persoonsmodel                     |
| Al aangesloten: AAT, ULAN, TGN, RKDartists, VTMK, Gentse thesaurus, Wikidata ×3 | Getty, RKD, MoMu, Stad Gent, Wikimedia | concept, person, place, …          | publiek SPARQL                                        | aangesloten                                   | zie `packages/catalog/catalog-vlaams/datasets/`                             |
