# VIDIK Ottawa Case 001 — Blind Evidence Dossier

**Case:** Ottawa → Housing First / supportive housing

**Purpose:** Historical retrospective. VIDIK may use only the information in this dossier through the blind-run gate. The actual municipal decision and post-decision outcomes are deliberately excluded.

**Decision boundary:** 2023-12-06 — Ottawa's 2024 budget was adopted on this date. [S01]

**Dossier retrieval date:** 2026-09-01. Retrieval date is metadata only and must never be treated as historical information available on the decision date.

## 1. Historical decision date

**2023-12-06.** The City of Ottawa's 2024 Adopted Budget identifies December 6, 2023 as the adoption date. [S01]

## 2. What Ottawa had available at that date

The adopted 2024 budget describes the municipal housing/homelessness operating environment:

- more than 17,000 community-housing units;
- more than 4,700 households receiving housing benefits such as Housing Allowances or Rent Supplements;
- approximately 12,000 households on the Centralized Wait List for rent-geared-to-income assistance;
- more than 325 families and 900 singles accessing emergency shelter/transitional programs funded by Housing Services;
- City-operated shelter/overflow capacity including a 176-bed family shelter;
- 13 funded Housing First organizations supporting upwards of 1,450 people at any time;
- operating funding for 31 homelessness-program organizations;
- Housing Services responsibility for system planning/funding, outreach, housing search, stabilization and housing-loss prevention. [S01]

The 2023 progress report provides pre-decision outcome context available from the City's reporting cycle:

- 12,447 households were on the Centralized Wait List at December 31, 2023;
- 1,186 households were housed from that list;
- 610 new housing benefits were provided;
- 49 new affordable housing units were completed;
- 57 new supportive housing units were completed;
- 831 affordable/supportive units were under construction;
- 301 households were housed through Housing First;
- 1,129 households were housed from the shelter system;
- 988 people were actively chronically homeless at year-end 2023;
- 98 actively chronically homeless individuals were matched to Housing First case-management supports. [S02]

**Temporal caution:** Because the 2023 progress report reports year-end 2023 data, the exact information availability timestamp for each underlying figure must be checked against its publication/release date before any figure is treated as admissible to a 2023-12-06 blind run. The dossier therefore distinguishes source existence from publication-date eligibility rather than silently assuming that a later-published report was available on the decision date.

## 3. Source IDs

| ID | Source | Role |
|---|---|---|
| S01 | City of Ottawa, *Adopted Budget 2024* | Municipal capacity, system structure, budget context |
| S02 | City of Ottawa, *2023 Housing and Homelessness Progress Report* | 2023 housing/homelessness outputs and need indicators |
| S03 | City of Ottawa, *2022 Housing and Homelessness Update* | Earlier Housing First monitoring context |
| S04 | CMHC, *Rental Market Report — January 2024* | Rental-market context; retained as temporal-exclusion candidate |
| S05 | Statistics Canada, *2021 Census Profile — Ottawa* | Structural housing context |

## 4. Publication dates / temporal admissibility

- **S01:** Adopted December 6, 2023. **INCLUDE.**
- **S02:** 2023 progress report. Publication/release must be treated as a separate timestamp from the underlying 2023 observations. **Eligibility must be verified before blind use.**
- **S03:** 2022 update published before the decision boundary. **INCLUDE**, subject to the exact publication timestamp being retained in the source registry.
- **S04:** January 2024 CMHC report. **EXCLUDE** from the 2023-12-06 blind run because its publication is after the decision boundary.
- **S05:** 2021 Census profile. **INCLUDE** as historical structural context, not as a causal Housing First effect estimate.

## 5. Retrieval dates

All sources were retrieved/rechecked for this dossier on **2026-09-01**. Retrieval date is metadata and must not be used as a proxy for historical availability.

## 6. Claims extracted

### S01 — Adopted Budget 2024
- Housing Services was responsible for funding, administration, monitoring and repair needs of community/affordable housing.
- Housing Services planned and administered investments in new affordable and supportive housing.
- Housing Services was responsible for housing/homelessness system planning and funding.
- The system included shelter, outreach, housing search, stabilization and housing-loss prevention.
- The 10-Year Housing and Homelessness Plan was the planning framework.
- Ottawa had 13 funded Housing First organizations supporting upwards of 1,450 people at any time.
- Ottawa funded 31 homelessness-program organizations. [S01]

### S02 — 2023 Housing and Homelessness Progress Report
- 12,447 households were on the Centralized Wait List at year-end 2023.
- 1,186 households were housed from the list.
- 610 new housing benefits were provided.
- 49 affordable and 57 supportive housing units were completed.
- 831 affordable/supportive units were under construction.
- 301 households were housed through Housing First.
- 988 people were actively chronically homeless at year-end 2023.
- 98 actively chronically homeless individuals were matched to Housing First case-management supports. [S02]

### S03 — 2022 Housing and Homelessness Update
Use only claims whose exact publication date and wording are captured in the source registry. Historical monitoring figures may inform prior performance but must not be converted into causal marginal-effect estimates without a defensible counterfactual.

### S04 — CMHC January 2024 Rental Market Report
Contains later rental-market information. **Not admissible to the blind run.** It remains listed to demonstrate that the temporal-leakage filter is functioning.

### S05 — Statistics Canada 2021 Census Profile
Provides historical structural housing indicators. Use as background/context, not as a Housing First causal estimate.

## 7. Normalized parameters

| Parameter | Value | Source | Blind status |
|---|---:|---|---|
| Decision date | 2023-12-06 | S01 | INCLUDE |
| Housing First organizations | 13 | S01 | INCLUDE |
| People supported at a time | ~1,450 | S01 | INCLUDE |
| 2023 Housing First households housed | 301 | S02 | CONDITIONAL — publication-date check |
| Active chronic homelessness at year-end 2023 | 988 | S02 | CONDITIONAL — publication-date check |
| Active chronically homeless people matched to HF case management | 98 | S02 | CONDITIONAL — publication-date check |
| Centralized Wait List households | 12,447 | S02 | CONDITIONAL — publication-date check |
| New housing benefits in 2023 | 610 | S02 | CONDITIONAL — publication-date check |
| New affordable units in 2023 | 49 | S02 | CONDITIONAL — publication-date check |
| New supportive units in 2023 | 57 | S02 | CONDITIONAL — publication-date check |
| Affordable/supportive units under construction | 831 | S02 | CONDITIONAL — publication-date check |
| 2023 vacancy rate | 2.1% | S04 | EXCLUDE |
| 2021 tenant households | 146,985 | S05 | INCLUDE if verified against Census source |
| 2021 tenant households spending ≥30% of income on shelter | 35.1% | S05 | INCLUDE if verified against Census source |
| 2021 tenant households in core housing need | 23.3% | S05 | INCLUDE if verified against Census source |

**Critical normalization rule:** Do not infer a marginal causal cost/effect from observed households housed divided by program spending. No defensible counterfactual marginal effect has yet been established.

## 8. Evidence quality

- **S01:** High for municipal program structure, stated capacity and budget context; insufficient by itself for causal effectiveness.
- **S02:** High for reported municipal administrative outputs; causal attribution remains limited and publication-date eligibility must be checked.
- **S03:** Moderate-to-high for historical program monitoring; do not treat observational retention/output statistics as causal effects.
- **S04:** High for rental-market measurement, but temporally ineligible for the blind decision boundary.
- **S05:** High for Census structural indicators; not a Housing First effectiveness estimate.

## 9. Transportability

- **Within Ottawa:** municipal administrative sources have high contextual transportability within the same system/time period.
- **Across intervention types:** limited; Housing First evidence cannot simply parameterize unrelated interventions.
- **Across municipalities:** unestablished. No Ottawa effect estimate may be transported to Toronto or Melbourne without explicit transportability analysis.

## 10. Uncertainty

The blind run must explicitly carry at least these uncertainties:

1. No randomized/counterfactual estimate of Ottawa's marginal Housing First effect is established in this dossier.
2. Observed outcomes may reflect selection, targeting, housing availability and concurrent interventions.
3. Households and individuals are different units and cannot be silently substituted.
4. Housing retention is not identical to long-term causal housing stability.
5. Housing First interacts with housing supply, rent levels, shelter capacity and other homelessness programs.
6. The adopted budget establishes capacity and planning context, not an optimal allocation by itself.
7. Post-decision information, including the January 2024 CMHC report, must not leak into the blind run.

## 11. Known alternatives

The historical Ottawa system contained multiple intervention classes that could form alternatives or complements:

- emergency shelter/transitional housing;
- homelessness prevention and housing-loss prevention;
- housing allowances and other housing benefits;
- rent-geared-to-income/community housing;
- supportive housing;
- street outreach and housing-search/stabilization services;
- affordable-housing development/capital investment.

These are **known system alternatives**, not a claim that every alternative was explicitly considered in the specific budget decision.

## 12. Status quo

The status quo is the existing Ottawa housing/homelessness system continuing to operate: established Housing First organizations and case-management capacity, community housing, housing benefits, shelter/transitional services, prevention, outreach and affordable/supportive-housing development.

**Blind-run rule:** Any incremental recommendation must be evaluated against this existing system rather than treating "do nothing" as zero service.

## Source registry

- S01: City of Ottawa, *Adopted Budget 2024*. Official document: https://documents.ottawa.ca/sites/default/files/2024%20Adopted%20Budget%20Book%20English%20Condensed-AODA.pdf
- S02: City of Ottawa, *2023 Housing and homelessness Progress Report*. Official document: https://documents.ottawa.ca/sites/default/files/2023HHReport_EN.pdf
- S03: City of Ottawa, *2022 Housing and Homelessness Update*. Exact publication metadata must be recorded before use.
- S04: CMHC, *Rental Market Report — January 2024*. **Temporal exclusion candidate; do not use in blind run.**
- S05: Statistics Canada, *2021 Census Profile — Ottawa*. Exact source URL and release metadata must be recorded before use.

## Blind-run gate

This dossier is frozen as the **historical information boundary**. VIDIK may use only admissible evidence whose availability is demonstrated at or before 2023-12-06. No actual municipal decision result or later outcome may be exposed to the model. The blind recommendation must be frozen and timestamped before the sealed record is opened.
