# VIDIK Pilot Measurement Framework v1

## Primary proof question

Can VIDIK produce defensible municipal resource-allocation decisions faster and with less analyst effort than the customer's conventional workflow, without increasing unsupported recommendations?

## Baseline vs VIDIK measures

Capture the same measures for comparable decision work:

- time to first answer;
- time to defensible answer;
- analyst hours / touch count;
- evidence sources reviewed;
- evidence acquisition burden;
- proportion resolved as recommendation / decision support / blocked;
- appropriate-block rate;
- human correction / override rate;
- recommendation stability;
- audit completeness;
- reproducibility;
- customer decision-cycle time.

## Pilot protocol

1. Pre-register decision class, baseline workflow, decision owner and comparison unit before analysis.
2. Freeze the decision question and success metrics before analysis.
3. Record the conventional-workflow baseline using the same outcome definitions and clock boundaries used for VIDIK.
4. Run VIDIK without hidden analyst rescue, manual data substitution or post-hoc changes to the decision question.
5. Preserve all evidence/model/output snapshots.
6. Record human decision separately from VIDIK output.
7. Measure turnaround, analyst effort and evidence-acquisition burden.
8. Review outcome checkpoints where the decision has measurable outcomes.
9. Document failures, blocks and corrections—not only wins.
10. Treat any unsupported recommendation, broken audit trail or unreproducible output as a pilot acceptance failure, regardless of speed improvement.

## Pilot acceptance gate

A pilot passes only when all of the following are demonstrated on the pre-registered decision set:

- the baseline comparison is complete and comparable;
- every customer-facing claim is supported by the applicable admissibility and causal gates;
- blocked cases identify the failed gate and the smallest material evidence package needed to proceed;
- the human decision and any override remain distinguishable from the VIDIK output;
- the audit snapshot is complete and reproducible;
- workflow burden and turnaround are measured rather than asserted;
- no unsupported recommendation or hidden data substitution occurs.

If any gate fails, classify the pilot as `NOT_YET_PROVEN` rather than converting a partial success into a product-readiness claim.

## Commercial success threshold

A pilot is not a success merely because VIDIK produces a recommendation. It must demonstrate measurable workflow improvement while maintaining evidence, governance and fail-closed standards.
