# RC4 public-evidence experiment result

Run type: **public-evidence / MSE execution**, not a causal effect estimate.

Historical boundary remains **2023-12-06**. No historical recommendation is modified.

| Case | Public-evidence result | Material causal gap remaining | Outcome |
|---|---|---|---|
| 006 ANCHOR | DESCRIPTIVE_READY | eligible-call response exposure, police involvement, repeat-call linkage, downstream utilization, comparable untreated calls/areas | No recommendation |
| 009 ASE | DECISION_SUPPORT_READY | concurrent interventions | No causal recommendation |
| 010 RLC | DECISION_SUPPORT_READY | concurrent interventions | No causal recommendation |
| 014 Shelter | DECISION_SUPPORT_READY | marginal bed exposure, defensible comparison/capacity shock | No causal recommendation |

## What changed because of MSE

The experiment no longer treats every missing field as an equal blocker.

- Case 006 can report the public first-year activity evidence without pretending it is a causal estimate.
- Cases 009 and 010 can reach decision-support analysis from public operational datasets without waiting for a complete causal package.
- Case 014 can reach decision-support analysis from public capacity/occupancy/outcome infrastructure while still refusing a causal downstream claim.
- None of the four streams receives an effect estimate, ROI or recommendation from MSE alone.

## Acquisition consequence

The next acquisition effort is narrowed to the material causal gaps identified above. VIDIK should not request a general-purpose municipal data dump.

For 009 and 010 in particular, the public evidence is sufficient to make the remaining causal problem explicit: control for concurrent interventions (and, where needed by the preregistered estimator, any other design-validating fields). This is materially narrower than requesting all traffic, enforcement, collision and operational records.

## Experimental conclusion

**MSE improves the experiment without lowering the evidentiary standard.** It increases the highest defensible claim level available from public data, while preserving the fail-closed causal gate.

The experiment is not "failed because data are missing." It is now a structured set of claim-level outcomes:

**useful public evidence → decision support where justified → targeted acquisition only for material causal gaps → effect estimation only if the preregistered causal gate passes.**
