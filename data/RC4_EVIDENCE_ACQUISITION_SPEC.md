# RC4 Evidence Acquisition Specification v1

**Status:** PRE-REQUEST FREEZE
**Purpose:** Define the smallest evidence package that could move Cases 006, 009, 010, and 014 from current public-evidence levels to defensible effect estimation. No data request should be made outside this specification.

## Governing rules

1. Historical decisions remain frozen at `2023-12-06`; later evidence cannot rewrite them.
2. A dataset is requested only if its absence blocks a preregistered causal claim or a required measurement gate.
3. Program-wide totals are not treated as marginal exposure.
4. Descriptive evidence cannot substitute for a counterfactual.
5. Operational data must preserve enough granularity to reconstruct exposure, treatment timing, outcomes, and comparison units.
6. If the requested package cannot establish the comparator/design, the case remains `NO RECOMMENDATION`.
7. No request is justified merely because the data would be interesting.

## Case 006 — ANCHOR

**Target causal question:** What is the effect of marginal eligible-call ANCHOR response exposure on downstream police/emergency-service utilization and repeat demand, relative to a defensible untreated/comparison pathway?

**Marginal unit:** eligible-call response exposure.

### Minimum causal package
- Call-level eligible-call universe for the preregistered study period.
- Timestamp and location sufficient to define eligibility and comparison strata.
- ANCHOR dispatch/response assignment and response timing.
- Police involvement/dispatch outcome for the same calls.
- Repeat-call linkage identifier or privacy-preserving linkage sufficient to measure preregistered repeat demand.
- Downstream emergency-service utilization needed by the preregistered outcome definition.
- A defensible comparison mechanism: comparable eligible calls/areas, quasi-random/operational assignment, or another preregistered design-supported comparator.
- Treatment/expansion periods and any operational eligibility changes.

**Not sufficient alone:** annual call totals, ANCHOR's aggregate share handled without police, or expansion-date reporting.

**Stop condition:** If call-level exposure cannot be reconstructed or no defensible comparator exists, do not estimate an effect.

## Case 009 — Automated Speed Enforcement

**Target causal question:** What is the effect of marginal site-month ASE enforcement exposure on preregistered speed/safety outcomes relative to a defensible untreated or interrupted-treatment counterfactual?

**Marginal unit:** site-month enforcement exposure.

### Minimum causal package
- Site-level enforcement activation/deactivation dates and operational uptime.
- Site/date speed observations already identified by public data.
- Site/date collision outcomes with severity and reliable site/approach linkage.
- Approach/intersection traffic volume or another validated exposure denominator.
- Complete treatment history sufficient to identify untreated/baseline periods and removal/reinstatement periods.
- Concurrent interventions at the site/approach (road redesign, signal changes, other enforcement, construction, etc.) with timing.
- Any exclusions or outages needed to implement the frozen analysis plan.

**Not sufficient alone:** violations, average speed, or camera location data without the outcome denominator and concurrent-treatment history.

**Promising design:** the post-removal natural experiment, subject to confirmation that treatment timing, comparison units, traffic exposure, collision linkage, and concurrent interventions support the preregistered design.

**Stop condition:** If concurrent interventions or the comparison structure cannot be reconstructed, effect estimation remains blocked.

## Case 010 — Red-light cameras

**Target causal question:** What is the effect of marginal intersection-month camera exposure on preregistered safety outcomes relative to untreated/pre-treatment comparison periods or intersections?

**Marginal unit:** intersection-month camera exposure.

### Minimum causal package
- Intersection-level camera activation/deactivation and operating status.
- Treatment history by intersection.
- Intersection/date violation measures.
- Approach/intersection traffic volume or validated exposure denominator.
- Collision outcomes with severity and reliable intersection/approach linkage.
- Concurrent intervention history by intersection and study period.
- Sufficient untreated/pre-treatment comparison history to implement the preregistered design.

**Not sufficient alone:** violation counts plus camera locations.

**Stop condition:** If traffic exposure, collision linkage, or comparator/concurrent-treatment history is unavailable at the required granularity, do not estimate an effect.

## Case 014 — Emergency shelter capacity

**Target causal question:** What is the effect of marginal additional bed-night exposure on preregistered housing/shelter outcomes relative to comparable demand periods/sites or a defensible capacity shock?

**Marginal unit:** bed-night exposure.

### Minimum causal package
- Site/date bed inventory and capacity changes.
- Site/date occupancy and admissions.
- Actual nights/bed-night exposure attributable to the marginal capacity.
- Exit destination/outcome at the required follow-up horizon.
- A defensible comparison: comparable demand periods/sites, phased capacity change, or another preregistered capacity-shock design.
- Any eligibility/placement rule changes and concurrent program changes affecting outcomes.

**Not sufficient alone:** total beds, occupancy, admissions, or annual shelter outcomes without marginal exposure and comparison structure.

**Stop condition:** If marginal bed exposure cannot be isolated or no defensible comparison/capacity shock exists, effect estimation remains blocked.

## Cross-case request discipline

Before any request is sent, VIDIK should be able to answer all of these for the proposed fields:

- Which frozen claim does this field serve?
- Which gate does it unlock?
- What is the unit and time granularity?
- What linkage is required?
- What privacy-preserving form is acceptable?
- What comparator/design does it support?
- What would make the request unnecessary?
- What result would still cause a fail-closed outcome?

### Request packages

**Package A — ANCHOR:** call-level exposure + assignment + police/downstream outcomes + comparator/design fields.

**Package B — ASE:** operational treatment history + traffic exposure + collision severity/site linkage + concurrent interventions.

**Package C — RLC:** operational treatment history + traffic exposure + collision severity/site linkage + concurrent interventions + comparison history.

**Package D — Shelter:** marginal bed exposure + site/date capacity changes + outcome linkage + comparison/capacity-shock fields + concurrent changes.

No additional fields should be requested merely for completeness.

## Promotion standard

A case may move to effect estimation only when the experiment contract, authorized allocation/exposure, temporal admissibility, causal design/comparator, and measurement requirements are all satisfied. Evidence acquisition itself never creates a recommendation.
