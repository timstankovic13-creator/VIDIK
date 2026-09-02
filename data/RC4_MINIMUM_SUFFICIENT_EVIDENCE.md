# RC4 Minimum Sufficient Evidence

## Purpose

VIDIK must not lower its evidentiary standard. It must avoid imposing a higher evidence burden than the claim requires.

The Minimum Sufficient Evidence (MSE) layer therefore answers:

> What is the smallest admissible evidence set needed to answer this specific question at this claim level?

## Claim ladder

- **DESCRIPTIVE** — provenance, temporal admissibility and observed fields.
- **DECISION_SUPPORT** — descriptive evidence plus baseline, exposure and defined outcome.
- **EFFECT_ESTIMATION** — decision-support evidence plus the preregistered execution/causal requirements.

MSE never itself emits an effect estimate, ROI or recommendation.

## Acquisition efficiency rule

For every missing field, VIDIK distinguishes:

1. already present;
2. publicly available;
3. a public-data gap;
4. municipal/operational request;
5. demonstrably not material to the requested claim.

Only material gaps for the requested claim should trigger further acquisition work.

## Experiment implications

MSE is applied after the experiment question and claim are frozen. It cannot be used to change the outcome, exposure definition, comparator, decision threshold or historical boundary after seeing the data.

This prevents both over-collection and evidence fishing.

### Case 006 — ANCHOR

Public activity can support descriptive/decision-support work without requiring every downstream field. Call-level eligibility, dispatch/acceptance/response and police involvement become decision-critical for stronger claims. Repeat-call linkage and downstream utilization are causal-grade requirements where those outcomes are part of the preregistered question.

### Case 009 — Automated Speed Enforcement

Public speed/compliance and activation/deactivation data can support descriptive and decision-support analysis. Traffic denominators, collision severity/site linkage and concurrent interventions are the material causal gaps for estimating downstream collision effects. Violations are useful context but are not a substitute for the serious-harm endpoint.

### Case 010 — Red Light Cameras

Monthly violations and treatment history can support descriptive/decision-support analysis. Traffic exposure, collision severity/site linkage and concurrent interventions become material for causal collision estimation.

### Case 014 — Emergency Shelter Capacity

Site/date capacity, occupancy, admissions and nights can support descriptive/decision-support work. Marginal bed exposure and a defensible comparison/capacity shock are required for a causal downstream claim. Aggregate citywide capacity growth is not a substitute for the preregistered exposure/counterfactual.

## Stop rule

If all fields that could materially change the requested claim are present, stop acquisition for that claim. If a missing field could change the causal conclusion, identify it explicitly and request only that field or the smallest operational extract containing it.

If a material gap cannot be obtained, the experiment remains **BLOCKED** or **INCONCLUSIVE** as dictated by the preregistered design. MSE does not convert missing evidence into a recommendation.
