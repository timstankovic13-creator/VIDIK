# RC4 Four-Stream Analysis Policy

## Principle
VIDIK must not require causal-grade evidence merely to answer a descriptive question. The evidence burden scales with the claim being made.

### Three claim levels
1. **DESCRIPTIVE** — what happened, where, when, and how much. Requires provenance, temporal admissibility, and usable observed fields.
2. **DECISION_SUPPORT** — whether an observed intervention/exposure appears relevant to a decision. Adds a status-quo baseline, actual exposure, and a defined outcome measure. This is still not a causal effect claim.
3. **EFFECT_ESTIMATION** — how much the intervention caused an outcome, including ROI or a recommendation based on that effect. Requires authorized allocation, actual exposure, admissible evidence, defensible counterfactual, and measurement readiness.

A failure at a higher level does **not** erase a valid lower-level answer. Conversely, a lower-level answer must never be presented as a causal finding.

## Four RC4 streams
- 006 ANCHOR — call-level response exposure and downstream emergency-service outcomes.
- 009 Automated Speed Enforcement — site-month enforcement exposure and collision outcomes.
- 010 Red Light Camera — intersection-month camera exposure and collision severity.
- 014 Emergency Shelter Capacity — site-night bed exposure and downstream housing/serious-harm outcomes.

Each stream retains its six execution gates and the historical decision boundary of **2023-12-06**. Historical decisions are immutable.

## Practical product rule
The default user experience should answer with the **highest defensible level currently supported**, not demand every possible dataset before saying anything useful. It should say explicitly what the evidence supports and what it cannot support.

Example:
> "ASE compliance increased at monitored sites after activation. The public data support this descriptive finding. They do not yet support a causal estimate of collision reduction, so VIDIK will not quantify lives/injuries prevented or recommend reallocating funds from that evidence alone."

This is intentionally useful without pretending to know more than the data establish.

## Promotion rule
`effectEstimate`, `roi`, and a causal `recommendation` remain null until the full effect-estimation gate passes. Missing data are surfaced explicitly rather than hidden or silently downgraded.
