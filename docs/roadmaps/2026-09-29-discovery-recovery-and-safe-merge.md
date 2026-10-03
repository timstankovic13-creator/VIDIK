# VIDIK Discovery Recovery & Safe-Merge Roadmap
Date: 2026-09-29
Status: Active; diagnostic branch only. Do not merge wholesale.

## Invariants
- Preserve main's green baseline; no unverified changes or blanket merge.
- Do not weaken relevance, provenance, evidence, or safety gates to improve counts.
- Keep case-set and scoring definitions fixed when comparing metrics.
- Separate discovery leads from evidence supporting causal effectiveness.
- Report only measured results; keep diagnostic tooling separate unless production observability is justified.

## Gates
1. Branch audit: compare diagnostic branch to main; inventory all commits/files; classify diagnostic-only, functional, and risky changes; identify safe merge candidates.
2. Root-cause repair: classify blocked cases by source selection, query generation, retrieval/transport/upstream, empty response, extraction, relevance rejection, classification/family assignment, deduplication, and other. Produce case-level evidence and a quantified failure histogram before selecting a fix.
3. Targeted repair: fix the largest verified root cause; add regression coverage for the actual failure; preserve strict relevance and evidence thresholds.
4. Selective integration: integrate only validated production-safe fixes; run targeted regressions and required main checks. Keep diagnostics and experiments isolated. Do not merge the whole branch.
5. Discovery certification: target >=45/60 relevant cases on the fixed first-60 case slice, with the same strict scoring; report the standalone 60-case diagnostic separately if its case set differs. Report 40-case open-world results separately.
6. Flagship acceptance: end-to-end test “How should a municipality allocate $10M of new spending over three years to reduce violent crime?” Require source provenance, a broad intervention universe, relevant options, uncertainty, opportunity costs, equity/implementation constraints, and an auditable decision record. Discovery hits are not causal evidence.
7. Production readiness: separately verify persistence, security, audit integrity, failure handling, outcome review, monitoring, and operational reliability. No production-ready claim until gates are evidenced.

## Current known baseline (must be rechecked against actual workflow artifacts)
- Diagnostic branch is 6 commits ahead of main and 0 behind at roadmap creation.
- Changed files in compare: 3 diagnostic workflows, 2 diagnostic tests, and a 5-addition/2-deletion instrumentation change in js/source-driven-intervention-discovery.js.
- Prior recorded metrics: first 60 of the 100-case battery = 30/60 cases with at least one relevant candidate; separate stage diagnostic = 47/60 by its own case/metric definition; 40-case open-world expansion = 18/40 with relevant candidates. Do not conflate these measurements.
- These results are milestones, not production certification.

## Operating loop
Audit -> instrument/classify -> verify largest failure bucket -> targeted fix/test -> selective merge -> run required certification -> inspect case-level regressions -> repeat until all applicable gates pass or a concrete blocker is documented.
