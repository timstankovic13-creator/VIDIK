# VIDIK Current Build — 9.2.1

## Frozen baseline
- Main commit: `237b3ae903587b2d0aa867d1b94faff48390dd8e`
- Status: validated/frozen reference baseline
- Post-merge browser validation: Run #77 (`33324741447`) — success

## What is visible in the canonical HTML
- City selector: Ottawa / Toronto / Melbourne
- Resource pool and risk controls
- Evidence readiness and recommendation
- Evidence → claim → parameter → decision pipeline
- Evidence registry
- Candidates and optimizer/frontier
- Why / Why-not
- Uncertainty
- VOI
- Outcome learning and checkpoints
- WUP 2025 global municipal readiness census
- Security & acceptance controls
- Adapter registry
- Decision audit
- Hostile validation

## Current data
- WUP 2025 population >=50k census: 12,138-record reference dataset
- Below-50k expansion tier: 4,690-record target, not enabled
- Evidence provenance registry
- Municipal adapters for Ottawa/Toronto/Melbourne are contract-ready, not live
- Municipal Reference Pack v1 manifest is being prepared separately; it does not yet claim that all listed domains have been physically cached.

## How to view it
The repository source is available from GitHub. An interactive browser deployment requires a static host/staging host; the frozen baseline itself should not be altered just to create a preview.

## Release discipline
All new data-pack and production-readiness work must remain on separate branches until the full browser acceptance and post-merge validation gates pass.
