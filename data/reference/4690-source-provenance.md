# VIDIK 4,690 Expansion Universe — Source Provenance Checkpoint

Status: **SOURCE IDENTIFIED / INGESTION FAIL-CLOSED**

## Proven source

The 4,690-record expansion universe is not a synthetic WUP-DEGURBA/JRC population filter. It is the exact set of rows in the official UN WUP 2025 F21-DEGURBA-Cities_Pop source whose 2025 population field is blank.

- Source: UN DESA, World Urbanization Prospects 2025, F21-DEGURBA-Cities_Pop
- Source URL: https://population.un.org/wup/assets/Download/Cities/WUP2025-F21-DEGURBA-Cities_Pop.xlsx
- Source SHA-256: `3a96030d87aec6c1c50f658d5321067d6345e1ab936c5d2854524f972caa75c0`
- Total F21 data rows: **16,828**
- Rows with 2025 population >=50,000: **12,138**
- Rows with blank 2025 population: **4,690**
- The 4,690 extension rows are identified deterministically by their original F21 source-row index.

This was independently verified against the supplied F21 workbook: the 4,690 source-row indices in `VIDIK_WUP2025_Full_16828_Urban_Centre_Census_v1.xlsx` exactly equal the 4,690 F21 rows whose 2025 field is blank.

## What this proves

The historical VIDIK number **4,690 is real and reproducible from the original WUP F21 frame**. The earlier attempt to derive it from the JRC DEGURBA settlement layers was the wrong level of the data model.

The official WUP 2025 download centre describes F21 as the city-population table for cities with 50,000 inhabitants or more; the supplied F21 workbook nevertheless contains 16,828 frame rows, including the 4,690 blank-2025 extension rows used by the VIDIK full-frame census.

## Important boundary

The 4,690 rows have **no reported 2025 population in F21**. Therefore source identity is proven, but population is not. The live-ingestion gate remains fail-closed until each extension record receives an independently sourced population value and passes geographic/municipal reconciliation.

No population values are invented or inferred merely to satisfy the 4,690 count.

## Reproducibility

`scripts/wup-expansion-source.py` downloads the authoritative F21 workbook, verifies the source checksum, verifies the 16,828/12,138/4,690 counts, verifies unique country/city identity, and deterministically emits the 4,690-record manifest with original source-row indices.

## Next gates before live ingestion

1. Generate the canonical 4,690 manifest from F21.
2. Acquire independent population values for those records.
3. Reconcile WUP/JRC geography and identifiers where available.
4. Validate municipality/government crosswalks.
5. Hash the completed population-enriched manifest.
6. Only then replace the fail-closed ingestion gate.

## Do not do

- Do not derive the 4,690 from JRC UC/DUC/SDUC/RC counts.
- Do not invent or impute population values without an explicit external source and provenance.
- Do not enable live ingestion merely because the row count is 4,690.
