# VIDIK Adversarial & Reproducibility Gate v1

## Objective

Prove that VIDIK fails safely, produces deterministic outputs from identical inputs, and cannot obtain stronger claims by accidental data leakage or workflow shortcuts.

## Required adversarial classes

1. Historical leakage: post-decision evidence must not alter historical eligibility.
2. Aggregate-to-marginal substitution: program totals must not satisfy marginal exposure gates.
3. Counterfactual substitution: descriptive evidence must not satisfy comparator requirements.
4. Missingness: material missing fields must fail closed.
5. Extra-field pressure: acquisition requests must not expand beyond frozen MSE packages without a new specification.
6. Temporal boundary attacks: evidence just outside the decision boundary must be rejected from historical analysis.
7. Null/NaN/infinity contamination: invalid numerical inputs must be rejected.
8. Recommendation instability: small parameter changes must surface flips where sensitivity thresholds are crossed.
9. Override integrity: human decisions must never mutate the original VIDIK recommendation.
10. Snapshot tampering: modified evidence/model/output hashes must invalidate integrity.
11. Tenant isolation: records from another tenant/jurisdiction must be rejected.
12. Re-run determinism: identical frozen inputs and version identifiers must produce identical decision identity and output.
13. Failure-state ambiguity: `NO_RECOMMENDATION` and `INCONCLUSIVE / DATA FAILURE` must not be converted to positive recommendations by serialization or UI transformation.
14. Outcome contamination: post-outcome observations must not alter the original prediction snapshot.

## Reproducibility record

Every benchmark case should retain: input fixture ID, evidence snapshot ID, model/version ID, decision boundary, configuration, deterministic seed if applicable, output hash and audit snapshot hash.

## Release rule

A local adversarial run may be used to prepare a release candidate, but it is not represented as CI-green. October CI remains the authoritative release-gate execution.
