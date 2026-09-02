# RC3 Execution Records — Cases 003, 011, 012

This layer operationalizes the execution-readiness gate without manufacturing municipal exposure or effects.

## Case handling

Cases 003 (paramedic capacity), 011 (fire response capacity), and 012 (community paramedic supports) each receive an immutable historical decision identity plus a prospective execution record.

A record remains `NO_RECOMMENDATION` / `BLOCKED` until all execution-readiness gates are satisfied. In particular, no historical budget total is treated as a marginal exposure and no observational before/after change is treated as causal.

## Execution sequence

`authorized allocation -> actual exposure -> admissible evidence -> counterfactual -> measurement -> effect estimation -> outcome learning`

Allocation and exposure are separate records because authorization does not prove implementation, and implementation does not prove the intended quantity reached the intended population.

## Learning lifecycle

Every execution record reserves immutable checkpoint identities at 6 months, 1 year, 2 years, and 5 years. Each checkpoint stores prediction, observation, status, and conclusion separately. Missing or failed measurement remains inconclusive rather than becoming a positive or negative effect.

## Guardrails

- Historical decision hashes are never rewritten.
- Readiness never creates a recommendation.
- No effect size or ROI is generated without admissible exposure and a defensible counterfactual.
- Unsupported case IDs are rejected.
- Learning checkpoints are explicit and bounded to the RC3 lifecycle.
