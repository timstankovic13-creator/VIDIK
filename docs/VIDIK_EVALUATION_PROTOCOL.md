# VIDIK Retrospective / Shadow Evaluation Protocol

## Objective
Evaluate whether VIDIK can produce a defensible municipal recommendation from information that was genuinely available at the time, without using future information.

## Procedure
1. Freeze a historical decision date.
2. Build a source registry containing publication/retrieval dates.
3. Exclude all evidence published after the decision date.
4. Normalize contemporaneous evidence and preserve source lineage.
5. Run the decision model with the frozen evidence set.
6. Record recommendation, alternatives, uncertainty, and assumptions.
7. Separately record the actual municipal decision.
8. Compare recommendation and actual decision without scoring agreement as causal proof.
9. Where a public implementation and outcome exist, record them separately with provenance.
10. Assess whether observed changes are descriptive, predictive, or causally attributable.

## Required anti-leakage tests
- Future publication date rejected.
- Future retrieval-only source rejected if its content was unavailable at the decision date.
- Outcome data unavailable to the historical recommendation stage.
- Later recalibration unavailable to the frozen historical run.

## Interpretation
Agreement is evidence of alignment, not proof of correctness. Divergence is a diagnostic signal, not proof that the municipality was wrong or VIDIK was right.

## Reporting
Every case report must show the frozen information set, recommendation, actual decision, divergence/agreement, outcome availability, limitations, and audit trail.
