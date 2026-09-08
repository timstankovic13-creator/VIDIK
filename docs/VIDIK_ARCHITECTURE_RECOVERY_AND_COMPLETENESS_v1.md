# VIDIK Architecture Recovery & Completeness v1

This document is the scope lock for the full VIDIK decision architecture. It exists so future production work cannot accidentally collapse a concept into a test-only stub, a UI-only feature, or a simplified municipal runner.

## Canonical rule

The canonical Decision Object is the durable representation of a decision. A production runner, UI, experiment, audit artifact, or learning workflow may expose a view of it, but must not silently create a second simplified decision model.

The canonical object has 18 parts:

1. identity / brief
2. resource envelope
3. objectives
4. constraints
5. intervention universe
6. evidence graph
7. claim-scaled evidence
8. parameters
9. causal / production model
10. uncertainty budget
11. optimization / opportunity cost
12. rationale
13. decision integrity
14. counterfactual vault
15. governance / human override / audit
16. outcome learning / 6-month, 1-year, 2-year, 5-year checkpoints
17. drift / failure registry
18. re-optimization / execution readiness

The executable contract is `js/vidik-architecture-contract.js`; the assembler is `js/vidik-canonical-decision-object.js`.

## Full-scope concept ledger

| Concept | Current repository evidence | Status | Production requirement |
|---|---|---|---|
| 18-part Decision Object | canonical workflow + new contract/assembler | IMPLEMENTED CONTRACT | Every production decision must serialize it |
| Claim-scaled evidence burden | `js/evidence-ceiling-13.js`, RC4 evidence work | PARTIAL | Bind burden to each claim used by a live decision |
| Minimum Sufficient Evidence | `js/rc4-minimum-sufficient-evidence.js` + RC4 tests | IMPLEMENTED MODULE | Gate recommendation on the claim-specific minimum set |
| Causal/admissibility gates | municipal semantic gates + production runner | IMPLEMENTED | No causal parameter without an explicit gate |
| Transportability | decision intelligence hardening + municipal runner | IMPLEMENTED | Evidence must state source/target and transport basis |
| Marginal-resource optimization | RC2 marginal evidence + Case 001 chain | PARTIAL | Production optimizer must compare marginal resource units |
| Opportunity cost / competing interventions | RC2 stress/comparison + production comparison | PARTIAL | Compare the forgone best alternative for the same marginal resource |
| Uncertainty budget | decision intelligence 9.2/9.2.1 | IMPLEMENTED MODULE / PARTIAL PATH | Propagate uncertainty into recommendation stability |
| VOI | decision intelligence integration | IMPLEMENTED MODULE / PARTIAL PATH | Rank missing evidence by expected decision value |
| Sensitivity / recommendation flips | decision intelligence integration + PR82 | IMPLEMENTED | Preserve flip thresholds in decision audit |
| Counterfactual design | decision lifecycle + production runner | IMPLEMENTED MODULE / PARTIAL VAULT | Persist counterfactual records durably |
| Execution readiness | RC3 execution readiness/records | IMPLEMENTED MODULE | Keep readiness separate from recommendation |
| Evidence acquisition | RC2 acquisition + RC3 real acquisition | IMPLEMENTED MODULE | Missing evidence creates an acquisition queue |
| Municipal semantic mappings | municipal mapping/context/adapters | IMPLEMENTED | Field meaning/unit/aggregation/role must survive ingestion |
| Provenance / freshness | source adapters, provenance manifest, production lineage | IMPLEMENTED MODULE / PARTIAL FRESHNESS | Freshness state must affect admissibility |
| Failure-closed behavior | production runner + hostile tests | IMPLEMENTED | Never manufacture a recommendation when a required gate fails |
| Outcome learning | learning modules + lifecycle | IMPLEMENTED MODULE / PARTIAL PRODUCTION | Only observed, provenance-bound outcomes may enter production learning |
| 6m / 1y / 2y / 5y checkpoints | lifecycle modules + new canonical contract | IMPLEMENTED CONTRACT | Persist checkpoint schedule with every decision |
| Recalibration without automatic mutation | lifecycle learning machinery | IMPLEMENTED MODULE | Produce a proposed adjustment; require explicit parameter update |
| Drift detection | learning/drift machinery | IMPLEMENTED MODULE | Drift is an alert/state, not silent model mutation |
| Decision Integrity | `js/decision-integrity-9.4.js` + hostile tests | IMPLEMENTED MODULE | Integrity must be part of the decision object and release gate |
| Human overrides | governance modules | IMPLEMENTED MODULE / PARTIAL PRODUCTION | Override must be attributed, reasoned, and auditable |
| Governance / audit | RC2 governance + decision lifecycle | IMPLEMENTED MODULE | Audit record must be immutable with decision identity |
| Immutable decision identity | lifecycle/canonical workflow | IMPLEMENTED CONTRACT | Every snapshot needs stable identity and lineage hash |
| Decision Counterfactual Vault | counterfactual machinery | PARTIAL | Move from transient output to durable indexed records |
| Failure Registry | failure/hostile machinery | PARTIAL | Register reusable failure codes and feed them into regression |
| Synthetic Decision Lab | blind cases / experiment machinery | IMPLEMENTED MODULE | Scenario evidence must be isolated and visibly labelled |
| 115-source evidence universe | evidence universe / manifests | IMPLEMENTED INVENTORY | Inventory membership is not blanket causal authorization |
| Three-city production architecture | Ottawa/Toronto/Melbourne production runner/gate | IMPLEMENTED | Keep as the end-to-end production acceptance slice |
| Comparable-city acquisition | new `js/comparable-city-evidence.js` | IMPLEMENTED CONTRACT | Similarity finds evidence; it cannot bypass admissibility |
| Unconventional approaches | comparable-city module `approach.unconventional` | IMPLEMENTED CONTRACT | Surface novel approaches separately and inspect implementation/outcomes/transfer conditions |

## Comparable-city rule

Comparable-city search has two legitimate jobs:

1. **Transferable evidence acquisition:** find jurisdictions that resemble the target on documented dimensions and may contain useful evidence.
2. **Novel intervention discovery:** find unconventional approaches that produced credible results elsewhere, even if they are not currently in the target intervention universe.

The second job is important. VIDIK must not become a system that only compares the interventions it already knows. A city may have solved a problem through an unusual program, governance arrangement, service model, procurement mechanism, deployment pattern, or prevention strategy. Such an approach should enter the **evidence-acquisition / intervention-discovery queue**, not jump directly into the recommendation set.

For every unconventional approach VIDIK should capture:

- what the approach actually was;
- implementation conditions;
- target population and problem definition;
- outcome definition and measurement window;
- evidence quality;
- observed result versus causal result;
- costs and marginal-resource implications where known;
- institutional/legal prerequisites;
- contextual differences from the target city;
- what evidence would be required to transport or test it;
- whether it should become a candidate intervention, remain exploratory, or be rejected.

**Similarity is an acquisition signal, not an admissibility gate.**

## Required production chain

`problem → marginal resource → objective/constraints → intervention universe → municipal observation → semantic normalization → evidence graph → claim-scaled burden → minimum sufficient evidence → causal parameter → transportability → uncertainty budget → production/capacity model → marginal optimization → opportunity cost → sensitivity/VOI → recommendation or BLOCKED → counterfactual → rationale → integrity → governance/override → execution → observed outcome → checkpoint review → recalibration proposal → drift → re-optimization`

At every transition, VIDIK must retain the identity of the input, its provenance, its meaning, and the reason it was allowed into the next stage.

## Non-negotiable distinctions

- Municipal observed need is **not** a causal effect.
- A high-quality source is **not** automatically admissible evidence for every claim.
- A comparable city is **not** a transportability proof.
- An unconventional approach is **not** automatically a recommendation candidate.
- A recommendation is **not** execution readiness.
- A learning observation is **not** a parameter mutation.
- A scenario is **not** production evidence.
- A sensitivity result is **not** a causal estimate.
- A blocked decision is a valid output; inventing a recommendation is not.

## Architecture gate

`tests/vidik-architecture-completeness.test.js` protects the 18-part contract and the comparable-city safety boundary. This gate is intentionally structural; subsequent work must add runtime integration assertions so each part is populated from real production inputs rather than merely present as an empty field.
