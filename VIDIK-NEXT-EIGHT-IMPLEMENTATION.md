# VIDIK Next Eight Implementation

This branch executes the next eight engineering steps from the functional baseline without weakening recommendation or evidence gates.

## Implemented

1. **Blind discovery benchmark** — 48 problem statements across safety, housing, health, transport, environment, utilities, justice, education, employment, social policy, economic development, and administration. The benchmark verifies that search strategy generation is problem-driven and covers all required source classes.
2. **External source network** — jurisdiction-aware source-network planning over the governed source registry. Each planned source retains provider, jurisdiction, endpoint/access method, query, discovery/evidence role, and an explicit `effectsImported: false` boundary.
3. **Decision knowledge graph** — preserves relationships among problem, outcome, intervention, mechanism, evidence, population, jurisdiction, implementation, resource, and observed outcome rather than flattening them into a candidate list.
4. **Why/Why-Not** — adds explicit winner rationale, alternative rejection reasons, key assumptions, reversal conditions, status-quo comparison, and evidence gaps worth resolving.
5. **Comparable-city intelligence** — remains a transferability lead system. Causal effects are never imported from another jurisdiction; local validation remains required.
6. **Adversarial stress harness** — blocks sensitivity flips, malformed/non-finite estimates, negative VOI, missing uncertainty/status quo, and attempted causal-effect import.
7. **Outcome learning** — records deviation between prediction and observation and produces governed recalibration proposals while forbidding history rewrite and automatic parameter mutation.
8. **Unseen-problem certification** — requires complete source-class coverage, graph presence, and an explicit status quo before certification.

## Integration

The next-phase layer is attached to `executeDecisionDiscovery()` so it is not merely a test fixture. Every executed discovery run can now carry:

- external source-network plan
- decision knowledge graph and graph hash
- Why/Why-Not structure
- blind benchmark size
- governed learning policy

## Validation

The dedicated `VIDIK Next Eight Certification` workflow runs the eight-part battery plus existing intervention discovery, source registry/acquisition, decision-discovery, transfer-intelligence, and outcome-learning regressions.

## Still required before production certification

The eight-step layer is a functional foundation, not a claim of autonomous production readiness. The remaining work is to replace planning/contract-level source coverage with verified live acquisition across more jurisdictions, attach real evidence claims and measured outcomes to the graph, run the full unseen-problem suite against live data, and complete production release/certification gates under real-world failure and drift conditions.
