# Clean VIDIK recovery baseline — 2026-10-06

This branch intentionally starts from the current `main` head.

The prior diagnostic PR (#285) accumulated 233 commits and is closed. Its diagnostic changes are preserved in Git history but are not part of this certification path.

## Certification rule

- Do not modify production discovery logic to make CI green.
- Establish the current main behavior first.
- Use the existing 60-problem discovery battery as the baseline.
- Certification target: at least 45 of the original 60 cases must register an expected intervention-class hit.
- Preserve failure-closed evidence, provenance, and recommendation boundaries.
- If the clean baseline misses the target, fix the smallest demonstrated production cause only; do not add another broad diagnostic stack.

This file exists solely to make the clean recovery/certification branch explicit and reviewable.
