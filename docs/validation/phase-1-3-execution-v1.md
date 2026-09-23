# Phase 1–3 Execution Protocol — Open-World Validation

Status: executable validation protocol.

## Objective

Run the flagship open-world decision, the independent external benchmark, and the 80-problem Discovery Quality Battery as one coordinated validation program.

This follows a TEVV-style structure: system testing, adversarial evaluation, and eventual user/field validation should produce distinct evidence rather than one aggregate green number. NIST's current evaluation guidance likewise emphasizes customized test/evaluation/verification/validation and combining model testing, red teaming, and user testing where appropriate.

## Phase 1 — Architecture freeze

The current production architecture is the baseline. No major production subsystem is introduced by this validation.

Allowed changes are limited to:
- genuine defects exposed by validation;
- missing instrumentation required to observe a stated metric;
- test/oracle corrections that do not weaken assertions.

Forbidden:
- weakening assertions to obtain green;
- adding curated candidate lists to make discovery pass;
- silently changing the problem;
- suppressing failed searches;
- treating unknown evidence as zero;
- rerunning unchanged failures without root-cause analysis.

## Phase 2 — Flagship

Decision:
“How should a municipality allocate $10M of new spending over three years to reduce violent crime?”

Required observable outputs:
1. problem definition;
2. discovery ledger;
3. candidate universe;
4. negative-control rejection;
5. evidence linkage;
6. transferability state;
7. completeness challenge;
8. status quo;
9. uncertainty;
10. opportunity cost;
11. sensitivity;
12. VOI;
13. rejected alternatives and reasons;
14. recommendation permission state;
15. replayable audit artifact.

A recommendation is not considered a success merely because one is produced. Unsupported recommendations are failures.

## Phase 3 — Independent benchmark + battery

The external reference universe in `tests/fixtures/open-world-violent-crime-reference-universe-v1.json` is an evaluation oracle only. It must not become production discovery input.

The 80-problem fixture remains the breadth battery.

Report separately:
- discovery recall by reference family;
- false-positive intervention rate;
- missed-class rate;
- evidence-linkage failure rate;
- transferability failure rate;
- provenance failure rate;
- missing-option detection rate;
- cross-domain leakage;
- governance blocks;
- decision-readiness failures.

Do not collapse these into a single score.

## Root-cause loop

When a failure appears:

1. preserve the failing artifact;
2. identify the first incorrect state transition;
3. determine whether the defect is discovery, classification, evidence, transferability, governance, persistence, or test/oracle design;
4. fix the smallest real defect;
5. rerun the affected test plus the relevant regression gates;
6. compare before/after failure counts;
7. do not declare success until the original failure mode is gone.

## Gate

Phase 1–3 is complete only when we have:
- an independently scored flagship result;
- an external benchmark result;
- the 80-problem battery result;
- a failure/root-cause ledger;
- a decision about whether the current architecture is sufficient for the next phase.

Green CI alone is not sufficient evidence of product capability.
