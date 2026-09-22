# Case 001 — Historical Parameter Reconstruction v2

## Decision boundary

**2023-12-06** — Ottawa Council adoption date for the 2024 budget.

No source published after this boundary is admissible to the blind run.

## Source admissibility

| Source | Published | Retrieval | Blind status | Role |
|---|---|---|---|---|
| S01 Ottawa Draft Budget 2024 | 2023-11-08 | 2026-09-01 | admissible | pre-decision municipal planning/resource context |
| S02 Statistics Canada 2021 Census Profile — Ottawa | 2023-11-15 | 2026-09-01 | admissible | structural housing context |
| S03 At Home/Chez Soi Housing First RCT | 2016-04-14 | 2026-09-01 | admissible | causal intervention evidence |
| S04 Ottawa 2022 Housing and Homelessness Update | publication date not independently verified | 2026-09-01 | excluded | historical municipal program evidence held out pending date verification |

## Normalized parameters — Housing First

### Need

S02 supports an observed **contextual housing-cost-burden indicator**: 35.1% of Ottawa tenant households spent at least 30% of income on shelter. The denominator is 146,985 tenant households.

This is deliberately **not** treated as a Housing First eligibility rate, candidate-specific need estimate, or marginal demand curve. The reconstruction layer therefore blocks it when a candidate-specific need parameter is required.

### Baseline

S03 provides a randomized treatment-as-usual comparator: 31% stable housing at one year among the high-need comparator group. This is a study baseline/comparator, not Ottawa's 2023 status-quo outcome. It is retained as observed study evidence with geography, population, denominator, measurement period, causal identification, transportability, and uncertainty metadata.

### Effect

S03 provides an observed randomized effect: adjusted difference **42 percentage points**, 95% CI **36–48 percentage points**, at one year in the five-city Canadian trial. The parameter remains an externally identified causal effect; it is **not** relabeled as an Ottawa marginal effect.

### Capacity

S04 is excluded because its publication date is not verified. S01 does not establish a defensible conversion from municipal planning dollars or staffing context to additional Housing First placements. Capacity therefore remains missing.

### Feasibility

S01 establishes that housing/homelessness resources were part of Ottawa's pre-decision planning environment. It does not establish that a specified marginal allocation could be implemented at a specified scale by the decision boundary. Feasibility remains missing.

### Cost

S01 contains municipal resource context but does not establish a candidate-specific marginal CAD-to-capacity or CAD-to-outcome conversion. Cost remains missing.

### Time horizon

S03 provides a 12-month study follow-up horizon. That is retained as study metadata and is not silently substituted for a municipal marginal-allocation horizon.

## Marginal-resource gate

The required chain is:

**CAD resource → additional capacity → additional activity/placements → outcome → serious-harm/system outcome**

For the blind Case 001 reconstruction, the chain remains incomplete. No source-backed, causally and transportably identified Ottawa marginal mapping is asserted.

Therefore:

- `marginalization.status = missing`
- allocation remains blocked
- no recommendation is manufactured

## Adversarial gates added

The reconstruction layer now rejects or blocks:

1. publication dates after the historical boundary;
2. sources whose publication date is not verified;
3. normalized values without unit/denominator/geography/population/measurement-period/uncertainty metadata;
4. candidate-specific parameters substituted with contextual indicators;
5. causal parameters without causal-identification evidence when the rule requires it;
6. transportability-required parameters without a transportability assessment;
7. assumed values without an explicit review marker;
8. marginal resource mappings without complete resource/capacity/outcome fields and causal/transportability gates.

## Provenance/version finding

The prior stale `9.1.3` decision identifier was traced to the decision-ID construction in `js/engine.js`, not to the current engine version configuration. The development fix now derives the decision ID from `V.version`.

The legacy `CANONICAL_BUILD_MANIFEST_MODULAR.json` still contains historical 9.1.3 metadata and should not be silently relabeled; its provenance is treated as a separate legacy-manifest issue.

## Blind result expected

The correct Case 001 outcome at this stage is still:

**NO RECOMMENDATION — BLOCKED because the historical evidence does not yet support a defensible candidate-specific marginal allocation model.**

This is a successful fail-closed result, not a test failure.

## Sealed boundary

The adopted 2024 budget, later municipal progress reports, later rental-market data, and later homelessness outcomes remain sealed from the blind run until the recommendation is frozen.
