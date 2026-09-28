# VIDIK Discovery Development — Layers 1–6

Status: active development on `validation/flagship-comparable-city-integration`.

This section expands intervention discovery without changing the evidence gate, recommendation boundary, or production decision architecture.

## 1. Mechanism discovery
Search for how a problem can be acted on: programs, services, grants, subsidies, staffing, outreach, infrastructure, technology, process redesign, partnerships, and domain-specific mechanisms. Mechanism terms are retrieval pivots only.

## 2. Administrative-footprint discovery
Search the administrative structures through which interventions are actually delivered: municipal programs, contracts, procurement, funding programs, service contracts, implementation programs, operating models, and agency/service-delivery structures.

## 3. Comparable-organization intelligence
Extend comparable intelligence beyond cities to agencies and organizations with analogous operating problems: transit agencies, housing authorities, health systems, public-safety agencies, utilities, universities, emergency-management organizations, and large employers. These are discovery leads, never imported causal effects.

## 4. Outcome → mechanism → intervention graph
Represent discovery as a traceable chain:
problem → outcome → mechanism → intervention family → concrete intervention → implementation model → evidence.
A discovered intervention remains evidence-gated before it can affect a decision.

## 5. Negative-space discovery
Measure what intervention families, mechanisms, and implementation models remain unsubstantiated after bounded retrieval. Missing coverage is reported as uncertainty/coverage information rather than silently converted into zero.

## 6. Human/market implementation intelligence
Search implementation reality: vendors, nonprofits, operating partners, existing programs/contracts, deployment models, staffing requirements, and implementation constraints. Market or implementation presence is not effectiveness evidence.

## Development controls
- Finite source-query budget is explicitly allocated across recall, mechanism, administrative, and class layers.
- Recall anchors are bounded and prioritized.
- Mechanism/admin pivots are ranked for problem/workspace relevance before consuming the budget.
- No synthetic candidates are created from ontology terms.
- Comparable-city/organization information cannot import effects into the causal model.
- Existing production architecture remains the baseline.
- Discovery, evidence, and recommendation remain separate layers.

## Validation sequence
1. Unit/integration validation of the six discovery layers.
2. Inspect remaining blocked lanes from the 60-case battery.
3. Expand and run the 100-problem battery.
4. Evaluate intervention-family coverage, source-channel diversity, false positives, independent evidence, production relevance, comparable intelligence contribution, and negative-space coverage.
5. Validate the flagship violent-crime allocation end to end.
6. Only after technical discovery quality is stable: hard-intelligence and commercial/user validation.

