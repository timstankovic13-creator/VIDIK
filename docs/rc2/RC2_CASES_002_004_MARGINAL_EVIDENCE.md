# RC2 Cases 002–004 — Marginal Evidence Acquisition

## Boundary

The historical decision boundary remains **2023-12-06**. Evidence published or operationalized after that boundary cannot be inserted into the frozen historical decision. It belongs to the current-learning plane only.

## Acquisition order

For Cases 002–004, acquisition is deliberately upstream-first:

1. marginal exposure
2. counterfactual
3. attribution
4. transportability
5. downstream outcome/system-outcome evidence
6. serious-harm pathway

A downstream outcome cannot substitute for missing marginal causal identification.

## Case 002 — Automated Speed Enforcement

Historical plane: the 2023 Ottawa road-safety record establishes an ASE intervention/resource context. The historical recommendation remains blocked because a defensible marginal-resource exposure and counterfactual effect attributable to the candidate at the boundary are not established.

Current-learning plane: Ottawa later reported speed-compliance improvement from 16% before ASE to 57% at three months, 69% at one year, and 81% at three years, with high-end speeding falling from 14% to 0.7%. These observations are useful for learning and validation, but they are not retroactively admitted into the 2023 historical recommendation.

Status: **BLOCKED** — marginal causal chain incomplete.

## Case 003 — Paramedic Capacity

Historical plane: the 2023 budget establishes additional paramedic staffing/resources. The historical recommendation remains blocked because the marginal causal effect of the candidate resource unit and a defensible counterfactual are not established.

Current-learning plane: Ottawa later reported Level Zero time falling from roughly 73,000 minutes four years earlier to 11,000 in 2024 and under 1,000 in 2025, alongside additional staffing. This is system-level learning evidence, not sufficient by itself to identify the marginal causal effect of the 2023 candidate.

Status: **BLOCKED** — marginal causal chain incomplete.

## Case 004 — OPS Frontline Staffing

Historical plane: the 2023 budget establishes an additional OPS staffing/resource context. Candidate-specific marginal exposure, counterfactual, attribution, and transportability remain insufficient for promotion.

Current-learning plane: later operational results may be acquired for learning, but no later result is allowed to mutate the historical freeze.

Status: **BLOCKED** — marginal causal chain incomplete.

## Gate

The executable gate requires admissible evidence for all four marginal causal stages: `marginalExposure`, `counterfactual`, `attribution`, and `transportability`. Until all four are present, the recommendation engine must remain fail-closed.

No benefit-per-dollar or cross-case ranking is produced because the cases do not yet share a defensible common marginal resource unit with candidate-level causal estimates.
