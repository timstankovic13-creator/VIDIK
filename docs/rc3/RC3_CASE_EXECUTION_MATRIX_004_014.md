# RC3 Cases 004–014 — Execution Matrix

**Historical decision boundary:** `2023-12-06`  
**Historical anchor:** `git:fee012fab5c2a4437f0a63c754e1ce70a9f3b696`  
**Purpose:** instantiate the RC3 decision-experiment contract for every remaining RC1 case without manufacturing a marginal effect, price, counterfactual, or recommendation.

## Gate rule
A case is **EXECUTABLE** only when the intervention, marginal resource exposure, outcome, defensible counterfactual, attribution design, serious-harm pathway, measurement contract, implementation controls, and human-decision separation are all established. Otherwise the case is explicitly **BLOCKED / PRE-REGISTRATION ONLY**. Current-learning evidence may inform future experiment design but cannot rewrite the historical decision.

## Case 004 — OPS frontline staffing
- Candidate: `OPS_FRONTLINE_STAFFING`
- Status: `BLOCKED — NO EXECUTABLE EXPERIMENT`
- Marginal unit: deployable officer-hours or FTE-hours, with CAD tracked separately.
- Mechanism to test: added deployable capacity changes response/coverage/activity, which may affect registered public-safety outcomes.
- Primary outcome: candidate-specific serious-harm or system outcome tied to the actual deployment geography/shift.
- Counterfactual: preferred randomized or quasi-experimental allocation; otherwise matched geography/shift with demand and baseline controls. Simple before/after is descriptive only.
- Principal blocker: the RC2 evidence record does not establish a clean candidate-specific marginal effect and counterfactual sufficient for causal attribution.
- Required acquisition: exact authorized increment, deployment roster/hours, treated/comparison units, demand/acuity controls, primary outcome, cost, spillover, implementation deviations.
- No effect size or ROI is asserted.

## Case 005 — OC Transpo Special Constables
- Candidate: `OC_TRANSPO_SPECIAL_CONSTABLES`
- Status: `BLOCKED — NO EXECUTABLE EXPERIMENT`
- Marginal unit: deployable special-constable hours/FTE-hours.
- Mechanism to test: added transit safety capacity changes coverage/intervention activity and potentially transit-specific safety outcomes.
- Primary outcome: pre-registered transit safety outcome sensitive to the intervention, not general citywide incident counts.
- Counterfactual: route/station/time matched comparison or quasi-experimental deployment where operationally safe.
- Principal blocker: candidate-specific outcome and causal chain are not established to the required standard.
- Required acquisition: exact deployment increment, affected stations/routes/shifts, comparable untreated exposure, incidents/exposure denominator, cost, displacement to adjacent routes/shifts, lawful measurement linkage.
- No effect size or ROI is asserted.

## Case 006 — ANCHOR
- Candidate: `ANCHOR`
- Status: `HISTORICAL BLOCKED — CURRENT PROSPECTIVE EXPERIMENT POSSIBLE`
- Marginal unit: deployable ANCHOR response/team-hours or calls served, with cost tracked separately.
- Mechanism to test: non-police/co-response capacity changes disposition and downstream emergency-service demand for eligible calls.
- Primary outcome: pre-registered eligible-call disposition/system outcome, with serious-harm safety monitoring.
- Counterfactual: matched eligible calls/locations/times or stepped-wedge/quasi-experimental design if operationally feasible.
- Principal blocker: ANCHOR was not an operating intervention at the historical boundary; current operation cannot be used to rewrite 2023.
- Required acquisition: prospective authorized exposure ledger, eligibility rules, comparison design, outcomes, safety events, spillovers and implementation deviations.
- No historical recommendation is issued.

## Case 007 — Downtown Safety Outreach
- Candidate: `DOWNTOWN_SAFETY_OUTREACH`
- Status: `BLOCKED — NO EXECUTABLE HISTORICAL EXPERIMENT`
- Marginal unit: outreach worker-hours/team-hours, with actual incremental cost tracked.
- Mechanism to test: added outreach contacts/referrals/services alter eligible-client trajectories and emergency/public-safety demand.
- Primary outcome: pre-registered client/system outcome with an explicit denominator and follow-up horizon.
- Counterfactual: matched service areas/time periods or stepped rollout where feasible.
- Principal blocker: candidate-specific causal exposure and attribution are not resolved.
- Required acquisition: exposure ledger, service dose, eligible population, comparison, outcome ownership, serious-harm monitoring, displacement, data completeness.
- Do not equate contacts/services delivered with impact.

## Case 008 — Youth Social Development
- Candidate: `YOUTH_SOCIAL_DEVELOPMENT`
- Status: `BLOCKED — NO EXECUTABLE HISTORICAL EXPERIMENT`
- Marginal unit: incremental program slots/youth served or staff-hours, only where actual allocation can be reconstructed.
- Mechanism to test: program exposure changes intermediate developmental/risk outcomes that may affect later system/public-safety outcomes.
- Primary outcome: registered proximal outcome first; downstream serious-harm outcomes only where attribution is defensible.
- Counterfactual: matched eligible youth/sites or phased rollout; no causal claim from aggregate trend alone.
- Principal blocker: historical candidate definition and candidate-specific causal chain remain incomplete.
- Required acquisition: eligibility, actual dose, comparator, baseline, follow-up, attrition/missingness, implementation fidelity and harm monitoring.

## Case 009 — Traffic Safety Action
- Candidate: `TRAFFIC_SAFETY_ACTION`
- Status: `BLOCKED — WHOLE-PLAN ATTRIBUTION PROHIBITED`
- Marginal unit: must be decomposed to an individual actionable component (camera, engineering change, enforcement hour, etc.).
- Mechanism/outcome: component-specific chain only.
- Counterfactual: component-level comparison/design; citywide plan-level before/after cannot identify marginal component impact.
- Principal blocker: component decomposition and marginal causal effect.
- Required acquisition: intervention component, quantity/cost, treated exposure, comparator, traffic/seasonality controls, safety outcome and serious-injury pathway.
- No whole-plan ROI or causal effect is permitted.

## Case 010 — Red Light Camera
- Candidate: `RED_LIGHT_CAMERA`
- Status: `BLOCKED — NO EXECUTABLE HISTORICAL EXPERIMENT`
- Marginal unit: deployable camera/site-year or enforcement exposure, with actual cost.
- Mechanism: deterrence changes red-light violations and collision risk at treated intersections.
- Primary outcome: pre-registered intersection-level violation/collision outcome, with serious-injury linkage where measurable.
- Counterfactual: matched untreated intersections or phased deployment with traffic volume and engineering controls.
- Principal blocker: candidate-specific reconstruction, attribution and serious-harm chain.
- Required acquisition: exact sites/timing, exposure denominator, traffic volume, camera uptime, comparator, collision severity, concurrent engineering/enforcement, spillover.

## Case 011 — Fire Response Capacity
- Candidate: `FIRE_RESPONSE_CAPACITY`
- Status: `BLOCKED — ACQUISITION PRIORITY`
- Marginal unit: deployable fire crew-hours/apparatus-hours.
- Mechanism: added capacity changes availability/response reliability and may change fire outcome severity.
- Primary outcome: registered response-performance measure plus incident-level severity outcome where attribution is possible.
- Counterfactual: station/shift matched comparison, phased staffing, or other quasi-experimental design.
- Principal blocker: clean marginal intervention and outcome chain not yet established.
- Required acquisition: authorized staffing/apparatus increment, dispatch exposure, station/shift assignment, demand/incident mix, response target, fire severity/property-loss measures, concurrent changes and spillover.

## Case 012 — Community Paramedic Supports
- Candidate: `COMMUNITY_PARAMEDIC_SUPPORTS`
- Status: `BLOCKED — NO EXECUTABLE HISTORICAL EXPERIMENT`
- Marginal unit: community-paramedic visit/team-hours or eligible-patient service dose.
- Mechanism: additional community care changes avoidable emergency-service utilization and patient outcomes.
- Primary outcome: registered eligible-patient emergency-department/911 utilization or other validated system outcome, with safety outcomes.
- Counterfactual: matched eligible patients or phased rollout; avoid aggregate program trend attribution.
- Principal blocker: historical candidate definition and marginal exposure are incomplete.
- Required acquisition: eligibility, actual service dose, comparator, baseline utilization, follow-up, safety events, missingness and competing interventions.

## Case 013 — OPS Body-Worn Cameras
- Candidate: `OPS_BODY_WORN_CAMERAS`
- Status: `HISTORICAL BLOCKED — ADMISSIBILITY/EXPERIMENT GAP`
- Marginal unit: camera-equipped deployable officer-hours/FTE-hours or incremental camera deployment unit.
- Mechanism: recording changes evidence availability, accountability and potentially complaints/use-of-force outcomes.
- Primary outcome: pre-registered officer/event-level outcome sensitive to camera exposure.
- Counterfactual: phased deployment or matched officer/event exposure with legal/privacy controls.
- Principal blocker: historical publication-time admissibility and candidate-specific causal design remain unresolved.
- Required acquisition: what was known and deployable at the historical date, rollout timing, actual exposure, comparator, outcomes, compliance/activation, privacy constraints and implementation deviations.
- Current 2026 rollout information remains current-learning only.

## Case 014 — Emergency Shelter Capacity
- Candidate: `EMERGENCY_SHELTER_CAPACITY`
- Status: `BLOCKED — ACQUISITION PRIORITY`
- Marginal unit: incremental shelter bed-night capacity or funded bed/service package, only if actual allocation and eligibility can be established.
- Mechanism: added capacity changes access to shelter and potentially downstream emergency/health/public-safety demand.
- Primary outcome: registered eligible-person housing/shelter stability or system outcome; serious-harm pathway must be explicit before causal claims.
- Counterfactual: matched eligible demand periods/locations or phased capacity expansion; aggregate homelessness trend is insufficient.
- Principal blocker: historical outcome/system-outcome chain is absent at candidate-specific marginal resolution.
- Required acquisition: actual incremental beds/bed-nights, cost, eligibility, occupancy, unmet demand, comparator, downstream outcomes, displacement and data completeness.

## Common adversarial gate for 004–014
Before any case can become model-eligible:
1. Remove the strongest supporting evidence and rerun.
2. Widen uncertainty and correlated-error assumptions.
3. Apply transportability and staleness penalties.
4. Strengthen status quo and credible alternatives.
5. Perturb resource quantity/cost and normative priorities.
6. Test plausible counterfactuals and spillovers.
7. Require recommendation stability; otherwise label unstable.
8. If a critical input is absent or unmeasurable, return `NO RECOMMENDATION` or `INCONCLUSIVE_DATA_FAILURE` rather than fill the gap.

## Batch result
**Cases 004–014 are instantiated in the RC3 execution layer. None is promoted to a fabricated historical recommendation.** The cases with a real prospective operational possibility (notably 006, and potentially 003/011/012 depending on authorized exposure records) can proceed when an actual allocation/exposure ledger exists. All historical identities remain anchored to the RC1 decision boundary.
