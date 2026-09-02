# RC4 Four-Stream End-to-End Experiment Result

Historical decision boundary: `2023-12-06`.

This run evaluates the public evidence currently available for Cases 006, 009, 010 and 014 using claim-scaled Minimum Sufficient Evidence. It does not invent authorized allocation, marginal exposure, causal counterfactuals, effects, ROI, or recommendations.

| Case | Highest public-evidence level | Effect estimation | Recommendation |
|---|---|---|---|
| 006 ANCHOR | DESCRIPTIVE | BLOCKED | NO RECOMMENDATION |
| 009 ASE | DECISION_SUPPORT | BLOCKED | NO RECOMMENDATION |
| 010 Red-light cameras | DECISION_SUPPORT | BLOCKED | NO RECOMMENDATION |
| 014 Shelter | DECISION_SUPPORT | BLOCKED | NO RECOMMENDATION |

## Interpretation

- 006 demonstrates that program-wide call volume and dispatch statistics do not establish actual marginal eligible-call exposure or a causal downstream counterfactual.
- 009 reaches decision-support level from site/time speed, compliance, treatment-history and violation evidence, but causal collision estimation remains blocked by material counterfactual/control requirements.
- 010 reaches decision-support level from intersection/time treatment and violation evidence, but causal collision estimation remains blocked by traffic, collision linkage and concurrent-intervention requirements.
- 014 reaches decision-support level from site/date beds, occupancy, admissions, nights and exits, but causal estimation remains blocked by marginal bed exposure and a defensible comparison/capacity-shock design.

## Outcome

The experiment succeeds at its engineering objective: VIDIK now distinguishes useful lower-level evidence from causal-grade evidence and identifies the smallest material gaps rather than demanding an undifferentiated municipal dataset.

The experiment does **not** produce a recommendation. That is the expected fail-closed result given the currently verified evidence boundary.

Next promotion condition: obtain only material missing evidence where it can change the pre-registered causal claim, then rerun the same frozen experiment without changing the historical boundary or outcome definition.
