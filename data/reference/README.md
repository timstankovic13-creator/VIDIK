# Municipal Reference Pack v1

This directory registers the first high-value Canadian municipal reference sources. The repository does **not** claim that raw upstream datasets have been copied into Git yet; source registration is deliberate so the eventual extracts can be generated reproducibly and hashed.

## First three data families

1. **Municipal spine:** Statistics Canada 98-10-0002-02 — population, dwellings, land area, density and ranks for census subdivisions/municipalities.
2. **Annual population:** Statistics Canada 17-10-0155-01 — annual July 1 population estimates by census subdivision using 2021 boundaries.
3. **Public safety:** Statistics Canada 35-10-0077-01 — municipal police personnel, authorized strength, rates, hirings/departures, retirement eligibility and selected crime statistics.

A Census Profile source is also registered for demographic/socioeconomic enrichment.

## Why both census and estimates?

The 2021 Census provides a stable benchmark; the annual population-estimate series provides a more current municipal population context. They must remain separate evidence series rather than being blended without explicit derivation.

## Next ingestion step

Generate compact extracts keyed to the VIDIK municipal identity and WUP city spine, attach provenance and SHA-256 hashes, then run reconciliation before the extract becomes decision-driving.
