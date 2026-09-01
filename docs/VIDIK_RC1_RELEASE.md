# VIDIK RC1 — Release Definition

## Purpose
Freeze a known-good product reference for demonstration, retrospective reconstruction, shadow decisions, and future municipal pilots.

## Evidence levels
1. **Validated** — synthetic/acceptance validation.
2. **Retrospective** — real historical municipal evidence reconstructed without temporal leakage.
3. **Shadow** — VIDIK recommendation compared with the historical municipal decision; no claim of causation.
4. **Live pilot** — real VIDIK decision, real implementation, measured post-implementation outcome, and learning.

## Current position
RC1 supports levels 1–3. Level 4 requires an actual municipal/operator deployment and subsequent measurement.

## Core lifecycle
Source → provenance → normalized evidence → decision model → recommendation → Decision Object → human adoption/override → snapshot → outcome observation → outcome review → drift → explicit recalibration → new model result → preserved audit history.

## Non-negotiable claims discipline
- Historical reconstruction may use only evidence available on or before the decision date.
- Shadow recommendations are not presented as municipal decisions.
- Validation fixtures are never represented as real intervention outcomes.
- Observational outcome changes are not automatically treated as causal impact.
- Model changes must identify the explicit calibration target and preserve prior decision history.

## RC1 exit criteria
- Main branch baseline green at the release SHA.
- Municipal lifecycle tests green.
- Retrospective/shadow tests green.
- Browser acceptance green.
- Full regression green.
- Procurement/security/privacy readiness documents present.
- Three municipal case records prepared for Ottawa, Toronto, and Melbourne where evidence supports the case.
