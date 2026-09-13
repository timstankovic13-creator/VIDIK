# VIDIK complete data acquisition protocol

## Purpose

VIDIK must acquire the data required to form a defensible decision object, not merely fetch a municipal headline number or attach a hand-selected causal estimate. Acquisition is a first-class production subsystem.

The acquisition pipeline is:

**Discover → classify → retrieve → snapshot → parse → normalize → validate → provenance → admissibility → parameterize → decision → outcome feedback**

No downstream decision component may silently substitute missing data with zero, a synthetic value, a stale value, or an unrelated jurisdiction.

## Required data domains

For every decision, VIDIK builds a requirement manifest. Requirements are driven by the problem, objective, jurisdiction, decision horizon, intervention universe, and optimization question.

1. **Problem and outcome definition** — exact outcome, numerator/denominator, unit, geography, population, period, baseline, target, and acceptable measurement alternatives.
2. **Local baseline and trends** — current level, historical series, seasonality, spatial distribution, relevant population denominators, and known measurement breaks.
3. **Population and equity context** — population, age/sex where relevant, income/deprivation, housing status, disability/accessibility where lawful and necessary, Indigenous/community context where appropriate, and other decision-relevant stratifiers. Sensitive attributes are minimized and governed.
4. **Intervention universe** — all plausibly relevant interventions identified from municipal programs/services, procurement/service inventories, policy instruments, implementation registries, and external evidence. A missing local program must not be mistaken for a missing intervention.
5. **Intervention implementation data** — eligibility, capacity, coverage, staffing, locations, throughput, waitlists, utilization, operating constraints, implementation lead time, legal authority, and dependencies.
6. **Costs and resources** — budget, staffing, unit cost, marginal cost, fixed cost, capital/operating split, available resource envelope, and opportunity cost inputs.
7. **Causal evidence** — intervention definition, population, comparator/status quo, outcome, effect estimate, uncertainty, study design, study date, source jurisdiction, implementation context, and transportability evidence.
8. **Constraints and feasibility** — legal/regulatory constraints, procurement constraints, physical capacity, workforce constraints, geography, implementation time, and service-system dependencies.
9. **Geospatial/contextual data** — boundaries, service locations, road/network context, exposure denominators, travel/access measures, and other spatial joins required by the problem.
10. **Comparator and innovation evidence** — comparable jurisdictions, demonstrated interventions, implementation lessons, transferability conditions, and failure evidence.
11. **Outcome-learning data** — post-decision implementation, exposure/delivery, outcome, cost, adverse effects, equity effects, and measurement quality sufficient for outcome review and drift detection.

## Source hierarchy

VIDIK prefers sources in this order, subject to fitness for the specific claim:

1. Official machine-readable administrative/API/open-data source.
2. Official structured statistical/data product.
3. Official report or publication with stable document provenance.
4. Peer-reviewed or otherwise independently scrutinized causal research for causal parameters.
5. High-quality comparator/implementation evidence for discovery and transfer intelligence.
6. Secondary sources only for discovery or triangulation unless independently validated.

A source can be authoritative for one purpose and inadmissible for another. For example, a municipal count can establish local observed context but cannot by itself establish a causal intervention effect.

## Discovery

Discovery searches the jurisdiction and problem space for candidate sources before acquisition. It should inspect:

- municipal open-data portals and APIs
- municipal departments/program pages and service inventories
- regional/provincial/state/federal statistical systems
- public health and justice/safety administrative datasets where applicable
- procurement/budget/service-performance publications
- census and survey products
- GIS/ArcGIS/CKAN/Socrata catalogues
- research repositories and bibliographic indexes
- comparable-city and implementation registries

Discovery records candidate sources even when they are unusable. This produces an explicit evidence gap rather than silently narrowing the universe.

## Retrieval and snapshot

Every acquired source is recorded with:

- canonical source URL and URL actually retrieved
- provider/owner and jurisdiction
- dataset/document identifier and version where available
- retrieval timestamp
- publication/as-of timestamp
- content type and schema/format
- content hash
- license/usage restriction when available
- extraction method
- adapter version
- upstream status and failure details

Redirects are followed only through an allowlisted/validated source policy. Retrieval failure is a data-quality event, not permission to use a fallback value without recording the fallback.

## Normalization

Raw source fields are mapped into canonical VIDIK fields with explicit:

- semantic field ID
- unit and denominator
- geography/jurisdiction
- population definition
- time period and timezone where relevant
- aggregation method
- missing/null semantics
- transformation and conversion history

The normalized value remains linked to the raw snapshot and source claim.

## Validation

Validation has four independent layers:

1. **Structural** — schema, types, required fields, encoding, duplicate keys.
2. **Semantic** — field meaning, unit, denominator, population, geography, period.
3. **Temporal** — freshness, publication lag, stale-source policy, measurement breaks.
4. **Cross-source** — reconciliation/triangulation where independent sources should agree; disagreement is surfaced, not averaged away.

Out-of-range, contradictory, stale, or semantically ambiguous values are blocked from production parameterization until resolved or explicitly accepted under a documented uncertainty policy.

## Evidence admissibility

Acquisition does not make evidence admissible. Admissibility is claim-specific.

Each evidence item is classified as one of:

- `verified` — independently verified and directly usable for the claim;
- `supported` — credible and usable with stated limitations;
- `estimated` — derived/estimated with an explicit method and uncertainty;
- `potential` — discovery lead only; never used as a production parameter;
- `blocked` — failed a required admissibility rule.

The same source may produce multiple evidence items with different admissibility classes.

## Missing evidence and failure-closed behavior

`unknown` is a first-class state. Missing data must never become zero.

When a required item is unavailable, VIDIK should:

1. search the next approved source tier;
2. attempt an approved alternate representation of the same source;
3. triangulate only when the measurement semantics remain compatible;
4. record the unresolved gap;
5. block only the affected claim/decision component where possible;
6. return a blocked decision when a missing requirement makes the decision unsafe.

The system must preserve the distinction between `not observed`, `not available`, `not applicable`, `zero`, and `failed acquisition`.

## Intervention discovery

Intervention discovery is separate from evidence attachment. For each problem, VIDIK should construct an intervention candidate universe from local services plus external intervention/evidence discovery. Each candidate receives:

- intervention identity and mechanism
- target population/problem
- required resources and capacity
- implementation requirements
- known benefits/harms
- evidence candidates
- jurisdictions studied
- evidence quality/admissibility
- local availability
- cost information
- feasibility constraints
- uncertainty

A candidate with no admissible evidence is retained as a candidate/evidence gap, not deleted. It cannot receive a production recommendation until the evidence requirements are met.

## Causal evidence acquisition

Causal acquisition must search independently of municipal context. A municipal source can tell VIDIK what is happening locally; it does not automatically tell VIDIK what intervention caused an outcome.

For every causal parameter VIDIK requires the intervention, comparator/status quo, outcome, population, effect estimate, uncertainty, design, study date, source jurisdiction, implementation context, and transportability assessment. Direct local evidence is preferred. Transported evidence requires an explicit similarity/transportability assessment and must never be silently relabelled as local evidence.

## Cost/resource acquisition

Optimization requires marginal resource/effect inputs, not merely total budgets. VIDIK should acquire fixed and marginal costs separately and preserve the resource unit. If only total program cost is available, it must not be presented as marginal cost without an explicit derivation.

## Outcome learning

After a decision, acquisition switches from planning mode to outcome mode. VIDIK captures what was actually implemented, exposure/dose, timing, cost, observed outcome, adverse/equity effects, and measurement quality. These observations feed outcome review, calibration, drift detection, and future evidence assessment; they do not retroactively rewrite the original immutable decision artifact.

## Production rule

The production decision engine consumes only normalized, provenance-bound, validated evidence objects. It must never directly consume an arbitrary URL, scraped number, UI value, or hand-entered production parameter.
