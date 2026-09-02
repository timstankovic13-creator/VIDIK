# VIDIK Offline Completion Matrix

## Purpose

This matrix defines what can be completed and verified without GitHub Actions or live municipal systems.

| Layer | Offline state | External dependency |
|---|---|---|
| Decision Object / canonical workflow | Implementable + testable | None for deterministic logic |
| Historical decision boundary | Frozen + testable | None |
| Evidence admissibility / MSE | Implementable + testable | Source access only for real acquisition |
| Acquisition request discipline | Implementable + testable | Municipal response for actual data |
| Counterfactual / causal gates | Implementable + testable | Real data/design for effect estimation |
| Fail-closed recommendation logic | Implementable + testable | None for logic |
| Benchmark | Implementable + testable | None with synthetic fixtures |
| Reproducibility | Implementable + testable | None |
| Adversarial validation | Implementable + testable | None for software-level attacks |
| Municipal adapter contracts | Implementable + testable | Live feeds for production ingestion |
| Customer decision workflow | Implementable + testable | Customer data for real decisions |
| Outcome learning lifecycle | Implementable + testable | Real post-decision outcomes |
| Production ingestion | Architecture-ready | Credentials/APIs/data agreements |
| Real causal estimates | Blocked until gates pass | Authorized exposure + comparator + outcomes |
| Real municipal recommendation | Blocked until gates pass | Admissible evidence + execution context |
| GitHub CI release certification | Pending | Actions capacity / alternate runner |

## Release principle

Offline completion is not a substitute for real-world evidence. It is the environment in which deterministic software, governance, contracts, fixtures, benchmarks, and failure behavior are completed before external dependencies are introduced.

A green offline gate therefore means **software-ready**, not **evidence-proven**.

## Current external blockers

1. Municipal operational evidence required for the four RC4 causal packages.
2. Authorized marginal allocation/exposure records.
3. Defensible untreated/comparison structures.
4. Production/customer validation.
5. GitHub-hosted CI certification when Actions capacity returns.

Nothing in this matrix authorizes promotion around those blockers.
