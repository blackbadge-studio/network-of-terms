# Reconciliation (uitgeschakeld)

De Reconciliation Service API (W3C-specificatie, gebruikt door OpenRefine)
koppelt een lijst vrije tekst automatisch aan termen: je stuurt bijvoorbeeld
een kolom kunstenaarsnamen en krijgt per naam kandidaat-URI's met een score
terug, die je daarna bevestigt. Het Nederlandse Termennetwerk biedt dit aan;
de code zit in deze repository als `packages/reconciliation`.

Het bestek zet nieuwe of uitgebreide reconciliation-functionaliteit buiten de
MVP (§3.2). De functie is daarom ingebouwd maar **staat standaard uit**, tot
meemoo beslist of ze erbij wil.

## Wat de schakelaar doet

|                                                               | `RECONCILIATION_ENABLED` niet gezet of `false` (standaard) | `RECONCILIATION_ENABLED=true`                              |
| ------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| `GET/POST /reconcile/<bron>`, `/extend`, `/preview` op de API | `404` met "Reconciliation is uitgeschakeld"                | doorgegeven aan het reconciliation-proces                  |
| `Source.features` in GraphQL                                  | geen `RECONCILIATION`                                      | `RECONCILIATION` met de URL van onze eigen dienst per bron |
| `/health`                                                     | `reconciliation.enabled: false`                            | `true`                                                     |

## Aanzetten op Laravel Cloud

1. Omgevingsvariabelen op de API-omgeving:
   - `RECONCILIATION_ENABLED=true`
   - `RECONCILIATION_URL_TEMPLATE=https://<api-url>/reconcile/{dataset}`
   - `VIEW_URL_TEMPLATE=https://<ui-url>/nl/lookup?uri={uri}` (waar de preview naartoe linkt; standaard wijst die naar het Nederlandse Termennetwerk)
2. Een achtergrondproces `npm run start:reconciliation` toevoegen aan de app
   (draait intern op poort 3002, `RECONCILIATION_PORT`).
3. Opnieuw deployen. Controle: `/health` toont `reconciliation.enabled: true`
   en `https://<api-url>/reconcile/https%3A%2F%2Fdata.rkd.nl%2Frkdartists`
   geeft een servicemanifest.

In OpenRefine voeg je dan per bron de reconciliatie-URL uit de
bronnenlijst (`Source.features`) toe als "standard service".

## Open vragen voor meemoo

- Waarom is reconciliation buiten de MVP gehouden: tijd, budget, of geen
  behoefte bij de doelgroep?
- Is er vraag vanuit collectiebeheerders die met OpenRefine werken
  (bulkkoppeling van bestaande collecties)?
- Moet het in de publieke zoekinterface zichtbaar zijn (reconciliatie-URL per
  bron op de bronnenpagina) of enkel als API-dienst?

Getest op 26 oktober 2026, lokaal met de Vlaamse catalogus: manifest per bron,
reconciliatie van "Rubens" tegen RKDartists met scores, en `404` met de
schakelaar uit.
