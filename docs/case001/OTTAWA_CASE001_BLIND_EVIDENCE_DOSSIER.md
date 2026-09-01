# VIDIK Ottawa Case 001 — Blind Evidence Dossier

**Case:** Ottawa → Housing First / supportive housing

**Decision boundary:** **2023-12-06**, the date Ottawa Council approved the 2024 budget. The blind model must not receive the adopted decision artifact or any information published after that boundary.

**Blind rule:** only information demonstrably available **before** the decision boundary may be used. Retrieval in 2026 is metadata only. The actual adopted decision and later outcomes remain sealed.

## 1. Historical decision date

**2023-12-06.** Ottawa's public budget process states the draft budget was tabled November 8 and Council would approve the 2024 budget December 6. citeturn2search1

## 2. What Ottawa could have known by the boundary

The admissible evidence set is deliberately conservative. It contains pre-decision sources and excludes the adopted budget and later progress reporting.

### Admissible historical sources

**S01 — City of Ottawa, Draft Budget 2024**
- Tabled **2023-11-08**. citeturn2search13turn2search18
- It describes the draft-budget process and proposed 2024 municipal priorities, including affordability and housing. It is admissible as a pre-decision planning/budget context source, not as evidence of the final adopted decision. citeturn2search1turn2search18

**S02 — Statistics Canada, 2021 Census Profile — Ottawa**
- Released **2023-11-15**, before the decision boundary. citeturn1search4
- Historical structural housing indicators include 146,985 tenant households, 35.1% spending at least 30% of income on shelter, and 23.3% of tenant households in core housing need.
- These are contextual need indicators only; they are not a Housing First causal effect.

**S03 — At Home/Chez Soi national Housing First trial evidence**
- Pre-dates the boundary by years.
- Canadian randomized evidence reports 73% stable housing in Housing First versus 31% in treatment as usual, adjusted difference 42 percentage points (95% CI 36–48).
- This is causal evidence for the studied intervention/population; transportability to an Ottawa marginal allocation remains uncertain.

### Candidate source requiring conservative exclusion

**S04 — City of Ottawa, 2022 Housing and Homelessness Update**
- The official City repository confirms the document and the document contains 2022 Housing First, shelter and housing-system figures. citeturn5view0turn6view0
- The PDF does **not state an exact publication date**. Because this retrospective is being run under a strict timestamp rule, S04 is **EXCLUDED from the executable blind input unless an exact pre-2023-12-06 publication/release timestamp is independently established**.
- Its contents include 151 people housed through Housing First Jan–Sep 2022, 82% one-year housing retention, ~11,064 households on the CWL in 2022, 1,228 households moved into RGI housing, and other 2022 outputs. citeturn6view0

## 3. Explicit temporal exclusions

**X01 — City of Ottawa Adopted Budget 2024:** EXCLUDE from blind evidence. It is the decision artifact itself and therefore would leak the outcome being reconstructed.

**X02 — City of Ottawa 2023 Housing and Homelessness Progress Report:** EXCLUDE. It reports year-end 2023 results and is not admissibly established as available before 2023-12-06.

**X03 — CMHC Rental Market Report, January 2024:** EXCLUDE. Published after the decision boundary.

**X04 — Any 2024/2025 Ottawa outcome report, progress report, Point-in-Time count, or later evaluation:** EXCLUDE until the blind recommendation is frozen.

## 4. Source registry

| ID | Source | Availability at boundary | Blind status |
|---|---|---|---|
| S01 | City of Ottawa Draft Budget 2024 | Tabled 2023-11-08 | INCLUDE |
| S02 | Statistics Canada 2021 Census Profile — Ottawa | Released 2023-11-15 | INCLUDE |
| S03 | At Home/Chez Soi national Housing First RCT evidence | Pre-2023-12-06 | INCLUDE |
| S04 | City of Ottawa 2022 Housing and Homelessness Update | Exact publication timestamp not established | EXCLUDE pending timestamp |
| X01 | Ottawa Adopted Budget 2024 | Decision artifact, 2023-12-06 | SEALED / EXCLUDE |
| X02 | Ottawa 2023 Housing & Homelessness Progress Report | Temporal eligibility not established; contains year-end results | EXCLUDE |
| X03 | CMHC Rental Market Report Jan 2024 | Post-boundary | EXCLUDE |

**Dossier retrieval date:** 2026-09-01. Retrieval date is never treated as historical availability.

## 5. Claims admissible to the blind run

1. Ottawa's 2024 budget was still in the pre-adoption process on November 8, 2023; Council approval was scheduled for December 6. citeturn2search1turn2search13
2. Ottawa's structural housing context included the 2021 Census indicators above. These are historical context, not causal intervention effects.
3. Canadian Housing First randomized evidence provides a causal benchmark, but not an Ottawa-specific marginal effect.
4. The City had a documented homelessness/housing system and Housing First experience before the boundary, but the executable blind input will not use S04 until its publication timestamp is proven.

## 6. Normalization rules

- No observed spending divided by people housed may be interpreted as a marginal causal effect.
- No post-boundary figure may be used merely because its underlying observation occurred before the boundary.
- Publication/release availability, not observation date alone, determines admissibility.
- RCT effect size may be carried as external causal evidence only with explicit transportability uncertainty.
- Census need indicators remain contextual and must not be silently transformed into causal effects.
- If the engine cannot establish an admissible parameter for a candidate, it must **block that candidate rather than substitute a guessed value**.

## 7. Evidence quality / transportability / uncertainty

- **S01:** High for pre-decision municipal budget/planning context; not a final decision and not causal effectiveness evidence.
- **S02:** High for structural housing measurement; not an intervention-effect estimate.
- **S03:** High causal quality for the studied Housing First intervention; transportability to Ottawa marginal allocation is uncertain.
- **S04:** Historical monitoring value is potentially useful, but temporal admissibility is unresolved and therefore it is not in the blind input.

Primary uncertainty: the admissible set does **not** establish a defensible Ottawa-specific marginal causal effect or a fully parameterized comparison across all municipal alternatives.

## 8. Known alternatives and status quo

Known system alternatives include shelter/transitional housing, homelessness prevention, housing benefits, community/RGI housing, supportive housing, outreach, housing search/stabilization, and affordable-housing development. These are system alternatives, not evidence that each was explicitly considered in the December 6 decision.

**Status quo:** the existing municipal housing/homelessness system operating at the decision boundary. The blind model must not treat status quo as zero service.

## 9. Blind-run gate

**FROZEN INPUT RULE:** The executable blind run may use **S01–S03 only**. S04 and X01–X04 are unavailable to the model. The blind output must be captured and frozen before the sealed record is opened.

**Critical fail-closed expectation:** if the current VIDIK engine cannot derive an admissible candidate from S01–S03 without importing post-decision parameters, the correct output is **NO RECOMMENDATION / BLOCKED**, not an inferred recommendation.
