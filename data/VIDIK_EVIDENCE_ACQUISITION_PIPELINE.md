# VIDIK Evidence Acquisition Pipeline

`claim → decision unit → temporal freeze → MSE → field classification → materiality/VOI → request → validation → promotion`

Field states: `PUBLIC_AVAILABLE`, `PUBLIC_GAP`, `MUNICIPAL_REQUEST`, `NOT_MATERIAL`.

Promotion requires provenance, temporal admissibility, exposure, comparator/counterfactual and measurement readiness appropriate to the claim level. A request is not evidence merely because it was issued.

## Priority queue
1. 009 ASE: comparator/control history, concurrent interventions, collision linkage, activation/deactivation/uptime.
2. 010 RLC: comparator/control history, concurrent interventions, collision linkage, operating/treatment history.
3. 014 Shelter: marginal bed-night exposure, comparable demand periods/sites or capacity shock, linked outcomes where preregistered.
4. 006 ANCHOR: eligible-call exposure/assignment, comparable calls/areas, repeat-call linkage and downstream outcomes.

Stop when remaining gaps are non-material to the preregistered claim; do not broaden requests simply to accumulate data.
