# VIDIK developer integration contract

## Current integration surface

VIDIK is currently integration-ready as a Node/HTML reference implementation, not yet as a hosted public HTTP API.

### Core modules

- `js/city-source-adapters.js` — municipal source identity/provenance contracts.
- `js/municipal-decision-context.js` — normalized municipal context.
- `js/municipal-decision-mapping.js` — mapping into decision context.
- `js/vidik-canonical-decision-object.js` — canonical Decision Object.
- `js/decision-intelligence-9.7.js` — sensitivity, correlated uncertainty, recommendation flips and VOI.
- `js/decision-artifact-store.js` — integrity-protected artifact creation, append and replay.
- `js/decision-lifecycle-9.6.js` — outcome learning/lifecycle controls.

### CLI entry points

- `npm run run:municipal-decision`
- `npm run run:canonical-municipal-decision`
- `npm run run:real-three-city-evidence`
- `npm run run:persisted-artifacts`

### Required developer guarantees

An integration must preserve:

1. provenance on every municipal observation;
2. explicit causal evidence separate from local observations;
3. fail-closed validation for malformed or inadmissible inputs;
4. deterministic artifact integrity verification;
5. immutable historical decision records;
6. explicit governance and override events;
7. outcome learning as a controlled lifecycle rather than silent mutation.

## Future hosted API boundary

A future server/API layer should expose these conceptual operations without moving trust decisions into the client:

- `POST /v1/decision-context`
- `POST /v1/decisions/analyze`
- `POST /v1/decisions/{id}/persist`
- `GET /v1/decisions/{id}`
- `POST /v1/decisions/{id}/verify`
- `POST /v1/decisions/{id}/override`
- `POST /v1/outcomes`
- `POST /v1/reviews/recalculate`

These are **design contracts only** until a server implementation exists. Do not advertise them as live endpoints.

## Authentication/tenant boundary

For a hosted deployment, tenant and role claims must originate from the authenticated server-side identity. Client-supplied tenant identifiers must never authorize access.

## Versioning

Production integrations should pin the VIDIK decision schema and analysis version, persist the exact version in every artifact, and treat schema changes as migration events. Historical artifacts must remain replayable under their recorded version.

## Developer acceptance

A developer integration is acceptable when a clean checkout can:

1. install locked dependencies;
2. run the municipal and decision-intelligence test suites;
3. execute the three-city decision path;
4. persist and verify a complete artifact;
5. detect a deliberately tampered artifact;
6. reproduce the same decision analysis from the same inputs.

## Explicit boundary

The current repository does **not** by itself provide a production API server, tenant-aware network authorization, managed database, identity provider or cloud deployment. Those remain deployment work, not hidden assumptions.
