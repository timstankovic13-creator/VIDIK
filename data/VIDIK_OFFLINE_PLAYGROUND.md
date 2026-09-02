# VIDIK RC4 Offline Playground

## Purpose

`offline-playground.html` is the hands-on, zero-network exercise surface for the current RC4 branch. It does not call GitHub Actions, municipal APIs, external evidence services, or remote JavaScript.

## What is covered

1. **Decision exercise** — select any frozen Case 001–014, change city/resource pool/risk ceiling, inspect the fail-closed decision, evidence gate, model state, Why/Why-not, uncertainty, and trade-offs.
2. **Adversarial validation** — runs deterministic offline attacks against historical immutability, fail-closed recommendation behavior, numeric validity, override discipline, causal gates, and marginal-exposure requirements.
3. **Decision lifecycle** — persist decision memory, create a snapshot, record a human adoption/override with rationale, record outcome checkpoints, run recalibration only with an explicit target and sufficient observations, and inspect the audit record.

## Historical boundary

All frozen cases remain anchored at `2023-12-06`. The playground never promotes a historical case into a recommendation merely because later evidence exists.

## RC4 streams

- 006 ANCHOR — eligible-call response exposure
- 009 ASE — site-month enforcement exposure
- 010 RLC — intersection-month camera exposure
- 014 Shelter — marginal bed-night exposure

The public-data result remains claim-scaled: descriptive/decision-support information may be displayed, while causal effect, ROI, and recommendation promotion remain blocked without the required exposure, comparator/design, and measurement conditions.

## Offline status

This surface is intended for product/logic exercise while GitHub Actions minutes are unavailable. It is **not** a substitute for CI certification or real municipal operational evidence. A green offline surface means the software path is exercisable and fail-closed; it does not mean a real-world recommendation is evidence-proven.

## Local validation

```bash
npm run test:offline
npm run test:offline:gate
npm run test:offline:playground
```

For browser use, open `offline-playground.html` from the branch checkout. Because it is completely self-contained, it can also be copied out of the repository and opened as a local file.
