# VIDIK RC2 Evidence Re-Open Protocol

**RC1 baseline:** `fee012fab5c2a4437f0a63c754e1ce70a9f3b696`
**Historical decision boundary:** `2023-12-06`
**Purpose:** reopen evidence work without mutating the frozen RC1 historical decision record.

## 1. Two evidence planes

RC2 maintains two non-interchangeable planes:

1. **Historical reconstruction plane** — evidence admissible on or before `2023-12-06`. This may reopen a case only when the evidence itself satisfies the original temporal/provenance rules. Later evidence cannot repair a historical gap.
2. **Current decision / learning plane** — evidence after `2023-12-06` may be collected for present-day decisions, transportability, outcome learning, and validation. It is explicitly sealed from historical reconstruction.

The RC1 freeze remains immutable. Any historical promotion requires an explicit case reopening artifact and a new evidence-ceiling evaluation.

## 2. Required marginal chain

Every candidate must establish, with candidate-specific evidence where applicable:

`resource -> capacity -> activity -> outcome -> systemOutcome -> serious-harm pathway`

The executable evidence ceiling currently requires the first five stages. RC2 adds the serious-harm pathway as a substantive readiness requirement even when it is not yet an executable gate.

## 3. Evidence record requirements

Each evidence item must carry:

- stable evidence ID and source record ID;
- provider and HTTPS provenance URL;
- publication date/time or an explicit `publication_time_status` explaining why exact timing is unavailable;
- geography and population/context;
- intervention/candidate linkage;
- chain stage;
- direction/effect estimate where applicable;
- evidence quality;
- causal identification / attribution assessment;
- counterfactual definition;
- transportability assessment to Ottawa;
- staleness assessment;
- conflicts/correlation assessment;
- whether it is historically admissible, current-only, or sealed.

## 4. Fail-closed rules

- Unknown publication timing is not silently treated as admissible historical evidence.
- Post-boundary evidence is never backdated.
- A generic program description does not satisfy a candidate-specific outcome stage.
- Correlation is not treated as causal identification.
- A positive outcome does not establish marginal benefit without a counterfactual or defensible attribution strategy.
- Transportability is not assumed from geographic proximity alone.
- Evidence conflict is surfaced, not averaged away without justification.
- Missing evidence keeps the candidate at `NO RECOMMENDATION`.

## 5. Recommendation promotion

A candidate can leave the RC1 blocked state only after:

1. evidence-ceiling admission succeeds;
2. provenance and temporal checks succeed;
3. outcome and system-outcome claims are candidate-specific;
4. causal identification/attribution is documented;
5. status quo/counterfactual is explicit;
6. transportability is assessed;
7. uncertainty and correlated uncertainty are propagated;
8. sensitivity/recommendation-flip testing is run;
9. alternatives and opportunity cost are evaluated on common marginal units;
10. Why/Why-not and audit lineage can reproduce the result.

No step permits a recommendation merely because evidence exists. The engine remains entitled to return `NO RECOMMENDATION`.

## 6. Outcome-learning separation

Post-2023-12-06 outcomes may be used to evaluate what actually happened and to calibrate future/current decisions. They must not be written back into the historical recommendation object. Original recommendation state, overrides, snapshots, and evidence hashes remain immutable.
