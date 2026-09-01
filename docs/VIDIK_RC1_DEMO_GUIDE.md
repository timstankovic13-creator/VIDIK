# VIDIK RC1 Demonstration Guide

## Start here
Open `VIDIK_RC1_PLAYGROUND.html` in a browser. It is a self-contained demonstration artifact and requires no server.

## Demonstration sequence
1. Select Ottawa, Toronto, or Melbourne.
2. Set the resource pool and declared priority.
3. Run the shadow decision.
4. Inspect the evidence/provenance and Why/Why-not explanation.
5. Review the municipal casebook and its evidence-level limitations.
6. Enter a predicted and observed outcome.
7. Review the outcome and inspect the error/drift signal.
8. Recalibrate only after an outcome review; the sandbox requires an explicit parameter target.
9. Inspect the audit trail.

## Important interpretation
The standalone playground demonstrates the lifecycle interaction and evidence discipline. It is not the full production engine and it does not claim a live municipal deployment. The repository's canonical application and test suite remain the source of truth for production behavior.

## Evidence labels
- Retrospective: real historical municipal evidence reconstructed with temporal controls.
- Shadow: VIDIK recommendation compared with an actual historical decision.
- Live pilot: requires an actual municipal/operator implementation and measured post-implementation outcome.
