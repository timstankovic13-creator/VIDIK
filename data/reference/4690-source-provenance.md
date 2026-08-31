# VIDIK 4,690 Expansion Universe — Source Provenance Checkpoint

Status: **UNPROVEN / FAIL-CLOSED**

## What is established

- PR #10 deliberately made the 4,690 expansion gate fail closed until an authoritative source artifact is supplied and validated.
- The authoritative 2025 GHS-WUP-DEGURBA source contains four 2025 settlement-entity layers: UC, DUC, SDUC and RC.
- WUP-DEGURBA 2025 does **not** define the 4,690 expansion universe as a simple `<50,000` WUP urban-centre set.
- The green reconstruction audit tested common population bands and pairwise layer combinations and found no exact 4,690 rule.
- The UC layer has a 50,000-person minimum by the Degree of Urbanisation definition, so UC cannot supply a sub-50k universe.

## Required before ingestion

1. Identify the actual authoritative source that defines the intended 4,690-record universe.
2. Record the source URL/PID, dataset version, retrieval date, selection rule, and source checksum.
3. Reproduce exactly 4,690 unique records from that source.
4. Store the resulting canonical manifest as an immutable source artifact.
5. Reconcile the manifest against WUP-DEGURBA/MTUC for population, geography, identifiers and provenance where possible.
6. Only then replace the fail-closed expansion gate with the validated manifest and enable live ingestion.

## Do not do

- Do not manufacture records from WUP-DEGURBA to hit 4,690.
- Do not choose an arbitrary population threshold because it happens to produce a desired count.
- Do not treat a count match as provenance proof.
- Do not weaken the existing fail-closed gate.

## Authoritative WUP references

- GHS-WUP-DEGURBA R2025A: https://human-settlement.emergency.copernicus.eu/ghs_wup_degurba_r2025a.php
- GHS-WUP-MTUC R2025A: https://human-settlement.emergency.copernicus.eu/ghs_wup_mtuc_r2025a.php
- JRC WUP-DEGURBA dataset PID: 10.2905/1c049178-ab00-4bbc-b638-3e3c19daaacb
- JRC WUP-MTUC dataset PID: 10.2905/1ea967e5-bedc-4cf3-a0b0-3851742ee7e2
