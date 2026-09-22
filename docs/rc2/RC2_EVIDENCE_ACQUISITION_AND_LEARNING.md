# RC2 Evidence Acquisition + Outcome Learning Execution Layer

**Historical boundary:** `2023-12-06`
**Baseline:** RC1 historical freeze remains immutable.
**Status:** execution scaffolding implemented; substantive candidate evidence remains subject to admissibility and causal gates.

## 1. Evidence acquisition

For every blocked candidate, acquisition work is ordered by decision value rather than by whatever evidence is easiest to find.

Priority order:

1. marginal exposure / resource delta
2. counterfactual or status-quo comparator
3. missing capacity/activity chain stages
4. attribution and transportability
5. candidate-specific outcome/system outcome
6. serious-harm pathway
7. alternatives and opportunity cost

The queue is deterministic and records the target explicitly. Unknown targets are discarded rather than silently becoming evidence.

## 2. Historical vs current-learning separation

Evidence discovered after the historical boundary may support a current decision or outcome learning, but it cannot be promoted into the historical decision plane merely because it is stronger evidence.

No acquisition task may change the frozen RC1 recommendation state without passing the existing historical admissibility, causal, counterfactual, transportability, uncertainty, sensitivity, alternatives, and lineage gates.

## 3. Outcome-learning registration

Each future decision-learning record requires:

- candidate and decision identifiers
- immutable original decision hash
- explicit baseline
- 6-month checkpoint
- 1-year checkpoint
- 2-year checkpoint
- 5-year checkpoint

Observed outcomes are appended as a new learning record. They do not mutate the original historical decision.

## 4. Next substantive evidence work

The execution layer is deliberately not a recommendation engine. The next evidence work is source-level extraction for the highest-value missing fields, starting with marginal exposure and counterfactuals for Cases 002–004, then proceeding through the remaining blocked candidates.

A candidate only leaves `NO RECOMMENDATION / BLOCKED` when the complete admissible chain and governance gates are actually demonstrated.
