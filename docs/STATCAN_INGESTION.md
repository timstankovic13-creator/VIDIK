# Statistics Canada ingestion

VIDIK uses Statistics Canada as an authoritative upstream for selected municipal reference data. Statistics Canada's Web Data Service exposes data and metadata through HTTPS JSON/SDMX APIs, while CSV/full-table and Delta File mechanisms support larger updates. The WDS documentation states that WDS is preferred for discrete points and Delta File for large updates.

## Registered products
- 98100002 — census subdivision population/dwellings/geography reference
- 17100155 — annual July 1 population estimates by census subdivision
- 35100077 — municipal police personnel/public-safety series
- 98-401-X — 2021 Census Profile for demographic/socioeconomic enrichment

## Pipeline
1. Obtain the authoritative source through WDS/CSV/bulk download.
2. Store the exact upstream artifact outside source control when too large; record URL, PID, retrieval time and SHA-256.
3. Normalize column names and geography identifiers without changing source values.
4. Reconcile municipality identifiers to the VIDIK/WUP spine.
5. Validate geography vintage, reference period, units, decimals, symbols and missing/suppression codes.
6. Generate compact decision-context extracts.
7. Hash every generated artifact.
8. Write provenance and reconciliation manifests.
9. Do not mark data decision-driving until semantic validation passes.

The ingestion builder intentionally requires an explicit input artifact. It will not silently fetch, substitute or fabricate upstream data.
