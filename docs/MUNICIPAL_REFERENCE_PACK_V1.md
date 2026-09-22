# VIDIK Municipal Reference Pack v1

Purpose: fast, reproducible municipal context without replacing live authoritative evidence.

## Data tiers
1. Stable reference: municipality identity, geography, population, demographics, socioeconomic baseline, historical public-safety context.
2. Periodic reference: municipal finance, staffing, transportation and emergency-service capacity.
3. Live evidence: current budgets, incidents, service availability, active programs, current operational measures and other volatile inputs.

## Required metadata for every imported dataset
- publisher/source
- canonical URL/API
- dataset identifier and version
- retrieval timestamp
- reference period
- geography definition
- schema version
- content hash
- provenance/evidence ID
- freshness/update policy
- transformations/derivations
- reconciliation status

## Priority sources
- Statistics Canada municipal population/dwelling and census geography products.
- Statistics Canada municipal police/public-safety statistics.
- Municipal open-data catalogues for Ottawa-first local context.

## Rule
Cached data accelerates context and reproducibility. Live sources remain authoritative for volatile facts. No cached value may silently override newer validated evidence.
