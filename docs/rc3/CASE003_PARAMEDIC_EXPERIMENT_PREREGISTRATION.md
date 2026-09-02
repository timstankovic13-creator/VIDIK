# RC3 Case 003 — Ottawa Paramedic Capacity Experiment

## Status
**PRE-REGISTERED / AWAITING PROSPECTIVE ALLOCATION**

This record separates the historical 2023 decision from a prospective learning experiment. It does not convert the 2023 budget package into a marginal causal coefficient.

## Historical anchor
- Decision boundary: `2023-12-06`
- Historical decision identity anchor: `git:fee012fab5c2a4437f0a63c754e1ce70a9f3b696`
- Candidate: `PARAMEDIC_CAPACITY_2024`

## Frozen experiment question
For an authorized incremental paramedic-capacity deployment, does the added deployable capacity improve emergency-response reliability versus a defensible comparison/counterfactual, without unacceptable displacement or serious-harm signals?

## Intervention and marginal resource
- Intervention: incremental deployable paramedic capacity.
- Resource unit for the prospective ledger: **deployable paramedic crew-hours**, with CAD recorded separately as an implementation cost dimension.
- The historical `$1.8M / 14 staff + vehicles` package is retained as historical context only; it is not divided into a synthetic per-paramedic causal price.
- Actual quantity, deployment geography, shift pattern, implementation start and deviations must be recorded from the real allocation before outcome evaluation.

## Mechanism
Additional deployable crew-hours increase ambulance availability and reduce the probability/duration of periods in which no crew is available, while potentially reducing response delays. This mechanism is a hypothesis to be tested, not a guaranteed effect.

## Primary outcome
**Share of eligible high-priority calls meeting the registered response-time target**, with secondary outcomes including Level Zero minutes, response-time distribution, hospital offload delay, utilization and patient-level serious outcomes where lawful and appropriate.

## Prediction freeze
- Directional prediction: incremental deployable capacity will improve response reliability relative to the registered counterfactual.
- Effect form: decrease in response delay / increase in target attainment; **no synthetic numerical effect size is asserted** before a power/precision assessment using the actual eligible population and exposure.
- Success threshold: the primary outcome must show a pre-specified improvement against the comparison/counterfactual with the registered uncertainty criterion; null/inconclusive results do not count as success.
- Evaluation method: quasi-experimental or matched comparison where operational allocation permits; otherwise the strongest defensible design must be documented before outcome observation.

## Counterfactual
Preferred order: randomized allocation when operationally safe and feasible; otherwise quasi-experimental or matched comparison using geography, shift, demand and baseline service conditions. A simple before/after change is not treated as causal impact.

## Confounding / transportability controls
Register demand volume, call acuity, geography, shift, hospital offload, dispatch changes, fleet availability, diversion/community-paramedic activity and other concurrent interventions. Later City results may be used for learning/context but cannot rewrite the frozen prediction or historical decision identity.

## Spillover / displacement
- Service displacement: monitor whether added coverage in one area/shift reduces coverage elsewhere.
- Temporal displacement: monitor adjacent shifts and peak-demand periods.
- Geographic displacement: monitor response performance in untreated/less-exposed areas.
- Measurement: exposure ledger + dispatch/response records + Level Zero + offload data.

## Stop / rollback / escalation
- Maximum exposure: the authorized crew-hour budget.
- Review point: 6 months after stable implementation, with earlier safety review if serious-harm signals emerge.
- Stop condition: predefined unacceptable safety or service deterioration signal.
- Rollback condition: sustained adverse system effect attributable to the intervention.
- Reallocation condition: persistent null effect with a defensible alternative use for the same resource unit.
- Escalation condition: serious-harm signal, material data-integrity failure or major implementation deviation.

## Outcome-learning checkpoints
6 months, 1 year, 2 years and 5 years. Each checkpoint records predicted vs observed outcomes, uncertainty, attribution, implementation deviations and whether recalibration is admissible.

## Data-failure rule
If the primary outcome or exposure cannot be measured reliably, status is `INCONCLUSIVE_DATA_FAILURE`; it cannot be relabelled success/failure.

## Current evidence context (not used to manufacture the prediction)
The City's 2023 Draft Budget records $1.8M for 14 paramedic staff and associated vehicles. Later reporting records large reductions in Level Zero time and additional staffing investments, but those later observations are reserved for validation/current-learning and do not alter this pre-registration.

## Execution gate
**Not yet outcome-observed.** No recommendation is issued from this pre-registration alone. The next required artifact is a real allocation/exposure ledger tied to an authorized deployment, followed by the registered measurement and counterfactual analysis.
