# VIDIK Open-World Decision Proof — Flagship Case

Status: validation design only. No production behavior changed. No test run is requested by this phase.

## Decision
How should a municipality allocate **$10M of new spending over three years to reduce violent crime**?

This is a stress test of VIDIK's decision-intelligence thesis, not a predetermined policy recommendation.

## What VIDIK must prove
1. Start from the problem, not a preselected intervention list.
2. Search across the required source classes and preserve provenance.
3. Discover actionable interventions and intervention families that were not seeded as demo candidates.
4. Reject records, datasets, reports, evaluations, organizations, and descriptive pages that are not interventions.
5. Distinguish a plausible intervention from evidence that it works.
6. Distinguish evidence that an intervention works somewhere from evidence that it transfers to the target jurisdiction.
7. Surface missing intervention classes when the initial search is narrow.
8. Preserve the status quo as an explicit competing option.
9. Show uncertainty, sensitivity, opportunity cost and VOI before allowing a recommendation.
10. Explain why candidates are included and why plausible alternatives are not advanced.
11. Produce a replayable, auditable decision artifact without fabricating evidence or effects.

## Reference discovery lanes
These are **benchmark lanes, not recommendations**. A successful run does not need every lane, but unexplained absence of an obvious lane should count against discovery completeness.

- Community violence intervention / violence interruption
- Focused deterrence / group-violence intervention
- Hot-spot policing / place-based policing
- Problem-oriented policing
- Street lighting / place-based environmental changes
- Vacant-property / blight remediation
- Youth employment / paid summer employment
- Cognitive behavioral / behavioral intervention programs
- Hospital/community violence intervention
- Domestic/intimate-partner violence prevention where relevant to the defined outcome
- Reentry / post-release support where relevant
- Substance-use treatment or diversion where relevant to the defined mechanism/outcome
- Place-based outreach / credible-messenger programs
- Built-environment / public-space interventions
- Firearm-risk reduction interventions where jurisdictionally lawful and applicable
- Prevention-oriented social-service interventions with a defensible violence mechanism

The system must not treat this reference list as the candidate universe. It exists to test whether open-world discovery can reach materially different intervention classes.

## Required output
### A. Problem definition
- outcome definition
- population
- geography
- time horizon
- budget
- constraints
- status quo

### B. Discovery ledger
For every source class:
- searched / not searched / failed
- queries or search lanes
- candidates returned
- candidates rejected
- candidates advanced
- provenance
- failure reason where applicable

### C. Candidate universe
For each candidate:
- intervention name
- intervention family
- mechanism
- source provenance
- problem relevance
- evidence relevance
- implementation relevance
- transferability status
- evidence state
- unknowns

### D. Completeness challenge
VIDIK must explicitly answer:
- What obvious classes did we find?
- What classes appear missing?
- Why might they be missing?
- What additional bounded searches were triggered?
- What remains unknown?

### E. Decision layer
Only after discovery/evidence gates:
- status quo
- feasible options
- resource/effect relationship
- uncertainty
- sensitivity
- opportunity cost
- VOI
- rejected alternatives + reasons
- recommendation permission state

## Failure conditions
The proof fails if VIDIK:
- returns data records as interventions;
- silently substitutes a curated registry for open-world discovery;
- treats no results as proof that no interventions exist;
- hides source-search failures;
- converts evidence gaps into zero effects;
- imports comparable-city effects as local effects;
- makes a recommendation while discovery/evidence/analysis gates are incomplete;
- cannot explain why a plausible option was rejected;
- cannot expose a meaningful missing-option state;
- fabricates provenance, evidence, estimates, or candidate descriptions.

## Success condition
The goal is not a high test count.

The goal is a decision artifact that demonstrates **open-world discovery → evidence qualification → constrained decision analysis → auditability** on a problem that was not reduced to a hand-built candidate list.
