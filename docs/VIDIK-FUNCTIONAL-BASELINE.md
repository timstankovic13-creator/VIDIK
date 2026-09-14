# VIDIK Functional Baseline

## Baseline scope

This baseline is the post-discovery-transfer-intelligence state. It preserves the existing municipal/evidence/decision pipeline and adds a general discovery and learning layer without weakening existing recommendation gates.

## Functional chain

1. **Problem intake** — arbitrary problem text is normalized into a repeatable search strategy.
2. **Intervention discovery** — strategy covers local programs, official data, research, intervention libraries, and comparable-city leads.
3. **Candidate universe** — candidates are normalized, semantically deduplicated, provenance-preserving, and hashed.
4. **Evidence gate** — missing or unsupported required evidence remains a gap; unknown is never converted to zero.
5. **Decision analysis** — ranking remains evidence-gated and the existing uncertainty/sensitivity/VOI gates remain authoritative.
6. **Why / Why-not** — supported alternatives and the status quo are retained as explicit counterfactual context.
7. **Comparable-city transfer** — city solutions are leads only; causal effects are never silently imported and transferability is explicitly assessed.
8. **Outcome learning** — outcomes are recorded against an immutable decision baseline; recalibration is proposed for governed review, not automatic mutation.

## Safety invariants

- A failed required source remains visible as failed and can block recommendation.
- A source that was not searched is distinguishable from an empty search.
- Candidate provenance is created from trusted source context rather than candidate-supplied provenance.
- Candidate-universe hashes are stable to ordering and change when the universe changes.
- Comparable-city evidence is not treated as local causal evidence.
- The status quo must remain explicit before a recommendation is permitted.
- Sensitivity flips remain recommendation blockers.
- Invalid/non-finite uncertainty or VOI cannot silently become valid evidence.
- Historical decision artifacts are not rewritten by learning.
- Parameters are not automatically mutated by outcome learning.

## Validation baseline

The baseline is not considered functional merely because the new battery passes. The existing municipal, evidence, production, three-city, independent-verification, discovery, and trustworthiness suites remain part of the regression gate.

The new seven-part battery covers:

- arbitrary-problem search strategy expansion;
- candidate-universe construction and provenance;
- search completeness/failure semantics;
- evidence and ranking gates;
- comparable-city transferability boundaries;
- why/why-not and robustness/recommendation flips;
- outcome recording and governed recalibration.

## Product meaning

VIDIK is now intended to operate as an evidence-constrained decision-intelligence system rather than a hand-curated recommendation demo: **problem -> discover -> evidence -> compare -> stress-test -> explain -> decide -> audit -> observe -> learn**.
