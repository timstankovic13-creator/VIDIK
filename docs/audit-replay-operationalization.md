# Audit replay and governance export

VIDIK can export a tamper-evident DecisionArtifact chain into `VIDIK.AuditReplayBundle.v1` and replay the persisted operational state without recomputing or silently changing the historical decision.

The export is fail-closed: the source artifact store must pass the existing SHA-256 artifact and chain verification before a bundle is written.

Each exported decision retains its sequence, chain hash, decision ID, creation time, exact artifact content hash, full DecisionArtifact, audit state, governance state, learning state, and provenance. This makes review/recalibration/failure context inspectable alongside the decision that produced it.

The replay view exposes the persisted recommendation plus the same audit, governance, learning, and provenance state. It is reconstruction of the recorded decision state, not a claim that current evidence would produce the same recommendation today.
