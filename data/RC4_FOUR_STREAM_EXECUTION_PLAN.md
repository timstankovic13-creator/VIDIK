# RC4 four-stream execution plan — 2026-09-02

Historical decision boundary: **2023-12-06**. This file is prospective only; it cannot mutate historical decisions.

| Case | Stream | Unit | Primary endpoint | Current state |
|---|---|---|---|---|
| 006 | ANCHOR | eligible-call response exposure | police involvement + downstream emergency-service utilization | BLOCKED pending operational exposure/comparator |
| 009 | Automated Speed Enforcement | site-month enforcement exposure | fatal/major-injury collision risk | BLOCKED pending operational exposure/comparator |
| 010 | Red Light Camera | intersection-month camera exposure | collision severity outcomes | BLOCKED pending operational exposure/comparator |
| 014 | Emergency Shelter Capacity | site-night bed exposure | housing stability + serious-harm-relevant downstream outcomes | BLOCKED pending marginal bed exposure/comparator |

## Work completed without acquisition

1. Four independent preregistration contracts are frozen.
2. Each contract specifies a marginal resource unit, mechanism, primary outcome, counterfactual design, measurement plan, spillover/displacement controls, stop/review rule and 6-month/1-year/2-year/5-year checkpoints.
3. A common six-gate execution contract is enforced: preregistration frozen, authorized allocation, actual exposure, admissible evidence, defensible counterfactual, measurement ready.
4. All four streams fail closed when operational data are absent.
5. No effect estimate, ROI or recommendation can be emitted merely from public-data discovery.
6. Historical decision identity remains immutable.

## Stream-specific next analytic work

**006 ANCHOR:** ingest public first-year activity as descriptive context; reserve causal estimation for call-level eligibility, treatment/dispatch exposure, geography/time and comparator linkage. Expansion timing must be encoded explicitly rather than treated as a generic before/after.

**009 ASE:** combine speed/compliance, removal-monitoring, camera locations, violations, traffic volumes and collision series. Pre-register an interrupted/withdrawal analysis around the November 2025 deactivation, with concurrent-treatment and traffic controls. Do not convert compliance changes into serious-harm effects without the causal collision layer.

**010 RLC:** align site installation/treatment history, monthly violations, intersection traffic and collision severity. Pre-register untreated/eligible intersection comparisons or a defensible within-site design; violations alone are not the outcome of interest.

**014 Shelter:** align site/date capacity, occupancy, admissions, nights and housing exits. Treat capacity additions/removals as exposure shocks and require a defensible comparison for downstream outcomes; citywide capacity/demand growth is descriptive, not causal by itself.

## Promotion rule

A stream can advance to effect estimation only when all six gates pass. If data quality or comparator validity fails, classify **INCONCLUSIVE** or **BLOCKED** as appropriate. Never backfill missing exposure, invent counterfactuals, or infer ROI from aggregate program spending.
