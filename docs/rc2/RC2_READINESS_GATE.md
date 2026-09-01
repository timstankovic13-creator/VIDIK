# VIDIK RC2 Readiness Gate

**Base:** RC1 `fee012fab5c2a4437f0a63c754e1ce70a9f3b696`
**Historical boundary:** `2023-12-06`
**Current status:** `IN PROGRESS — EVIDENCE ACQUISITION REQUIRED`

## Gates

1. **Evidence plane separation** — IMPLEMENTED / TESTED
2. **001–014 evidence ledger** — INITIAL TRIAGE COMPLETE; source-level extraction remains required
3. **Candidate-specific outcome + systemOutcome evidence** — NOT YET COMPLETE
4. **Serious-harm pathways** — NOT YET COMPLETE
5. **Causal identification / attribution** — NOT YET COMPLETE across candidates
6. **Counterfactual / status quo** — framework ready; candidate-specific estimates required
7. **Transportability** — engine support exists; candidate-specific assessments required
8. **Staleness / evidence conflict / correlated uncertainty** — engine support exists; candidate-specific inputs required
9. **Sensitivity / recommendation-flip testing** — implemented and validated in RC2 governance suite
10. **VOI / evidence prioritization** — implemented and validated in RC2 governance suite
11. **Common-unit comparison** — protocol defined; candidate inputs required
12. **Adversarial recommendation stress suite** — protocol defined; substantive candidate runs require model-eligible evidence
13. **Outcome-learning loop** — protocol defined; lifecycle implementation exists; candidate deployment objects require real outcomes
14. **Final RC2 substantive gate** — BLOCKED until gates 3–8 and candidate-specific evidence are complete

## Non-negotiable rule

RC2 does **not** convert the RC1 `NO RECOMMENDATION` states into recommendations merely because later evidence is available. Later evidence is useful for current decisions and learning, but historical reconstruction requires the original boundary and provenance rules.

## Exit condition

RC2 can be marked READY only when at least one candidate has a complete, admissible, candidate-specific causal chain and passes the full uncertainty, transportability, counterfactual, alternative, stress, lineage, and outcome-learning checks without an unresolved recommendation flip that invalidates the decision.
