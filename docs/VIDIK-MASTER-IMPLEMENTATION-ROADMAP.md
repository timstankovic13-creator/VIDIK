# VIDIK Master Product & Implementation Roadmap

## Purpose

This is the master implementation specification for VIDIK. It consolidates the product vision, decision-intelligence architecture, evidence rules, user experience, governance, learning, municipal portability, and production requirements developed across the VIDIK work.

This document supersedes fragmented milestone-only interpretations. A feature is not considered complete merely because a test exists or a PR is green: implementation, integration, validation, failure behavior, auditability, and production usability must all be established.

## Core product

VIDIK is a jurisdiction-portable municipal decision-intelligence platform. Its job is to help decision-makers allocate scarce municipal resources across a defensible intervention universe—not simply identify the most dangerous place or maximize a single score.

It must support public-sector, public-facing, business, research, and enterprise use, including an On-Demand “Submit a Decision” workflow.

The canonical decision chain is:

Status Quo → Options → Optimize → Why → Why Not → Human Override → Consequence → Audit → Outcome Review → Learning

The canonical Decision Object chain is:

objective → problem → intervention universe → evidence graph → causal identification → production function → marginal resource/effect → uncertainty → opportunity cost → equity/implementation constraints → scenario/sensitivity → decision → immutable audit record

## Non-negotiable scientific/integrity rules

- Status quo must remain an explicit option/baseline.
- Unknown is never silently converted to zero.
- Municipal observations are not causal evidence merely because they are official.
- Comparable-city similarity is not causal admissibility.
- Synthetic marginal-resource models cannot activate production optimization.
- Unsupported or non-admissible interventions are excluded from optimization rather than presented as recommendations.
- Causal evidence must have explicit provenance, timing, admissibility, and freshness/verification treatment.
- Study date and current provenance verification date must remain distinct.
- Missing/failed/stale/corrupt sources must fail closed where required.
- No common scalar should be invented for fundamentally incomparable harms or units.
- Counterfactuals must be defensible and decision-specific.
- Every recommendation must be explainable through its evidence and model lineage.
- Human overrides must be explicit, attributable, reasoned, and retained.

## Product/UI requirements

- Browser-first and phone-friendly; Android APK is not the current priority.
- Warm, accessible, non-institutional presentation.
- Answer-first primary interaction.
- City/context banner and clear jurisdiction context.
- Keep raw technical data available but secondary to the decision explanation.
- Preserve the intervention universe rather than reducing the product to a small demo set.
- Target broad outcome coverage, including the planned 20+ outcome depth for public safety, housing, health, and environment.
- Core explanation surfaces: Why, Options, Evidence, Model, Uncertainty, Challenge, VOI, Audit.
- Resource/budget/priority/constraint controls must actually change the decision path when they are intended to.
- Save/reload must preserve the complete decision state where persistence is promised.
- Mobile critical paths must remain usable.
- UI and engine recommendations must never disagree silently.

## Evidence and municipal portability

- Maintain the large intervention/evidence universe (including the established 115-source universe: 80 original + 35 added).
- Maintain reproducible municipal source adapters.
- Current real-city evidence slice: Ottawa, Toronto, Melbourne.
- Adapters must preserve source identity, provenance, freshness/staleness, normalization, validation, and failure behavior.
- Real municipal observations feed the evidence/data layer without being promoted to causal effects.
- Official-source fallbacks must be explicitly labelled and dated; they must never masquerade as live data.
- Preserve blocked cases when operational marginal exposure or defensible untreated counterfactual evidence is unavailable.
- Continue acquisition endpoints for Ottawa Cases 009–010 rather than manufacturing effects.
- Maintain jurisdiction portability rather than hard-coding Ottawa assumptions into the core engine.
- Deep VIDIK Cities and Global Comparator Layer remain planned product capabilities and must not be treated as implemented merely because comparable-city data exist.
- Municipal Innovation & Transfer Intelligence remains a distinct capability from causal admissibility.

## Decision intelligence

Implement and validate:

1. Decision Object as the single end-to-end decision record.
2. Explicit objective/problem/constraints.
3. Complete intervention universe and admissibility filtering.
4. Evidence graph and parameter lineage.
5. Causal identification and counterfactual gates.
6. Production functions and marginal resource/effect evidence.
7. Optimization only over admissible, evidence-supported options.
8. Opportunity-cost reasoning.
9. Equity and implementation constraints.
10. Scenario analysis and sensitivity.
11. Uncertainty propagation and uncertainty budget.
12. VOI/EVPI/EVSI where evidence supports those calculations.
13. Recommendation-flip thresholds and identification of unstable decisions.
14. Why/Why-not explanations.
15. Human override with rationale and consequence tracking.
16. Decision Integrity Score and supporting integrity diagnostics.
17. Immutable audit record.

## Artifact persistence

Persist a complete, inspectable, reproducible artifact containing, as applicable:

- Decision Object.
- Inputs and constraints.
- Municipal/source snapshots and provenance.
- Evidence graph and parameter lineage.
- Admissibility decisions.
- Baseline/status quo.
- Candidate options.
- Optimization/scenario configuration.
- Counterfactual assumptions.
- Sensitivity/uncertainty/VOI outputs.
- Recommendation and alternatives.
- Why/Why-not explanations.
- Human override and rationale.
- Consequence projections.
- Audit events.
- Version/build identifiers.
- Validation/integrity status.

Artifacts must survive save/reload and be reproducible from their recorded inputs/version information.

## Learning and lifecycle

Operationalize:

- Outcome recording.
- Serialized/race-safe learning updates.
- Recalculation only after required outcome writes complete.
- 6-month, 1-year, 2-year, and 5-year outcome review lifecycle.
- Drift monitoring.
- Outcome-to-model feedback with provenance.
- Failure Registry.
- Decision Drift monitoring.
- Learning audit trail.
- Separation of observed outcomes from causal claims until admissibility is established.
- Ability to review, challenge, and roll back inappropriate learning/model changes.

## Governance

Implement and validate:

- Human override and approval controls.
- Immutable audit history.
- Decision Integrity Score.
- Failure Registry.
- Explicit non-goals and residual-risk register.
- Privacy/data-retention/export rules.
- Roles and responsibilities.
- Procurement/governance readiness.
- Challenge/review workflow.
- Kill-switch/failure-closed behavior for unsafe or invalid decision paths.

## Production engineering

Before production/pilot:

- Clean production build/deploy from a fresh checkout.
- Environment/configuration validation.
- Failure/restart/recovery testing.
- Health checks, logging, error reporting, observability, and alerting.
- Managed database architecture where persistence requires it.
- TLS.
- SSO/IdP and authorization model.
- Secrets management.
- Backups and tested recovery.
- Retention/access controls.
- Dependency/security scanning.
- Input/output boundary validation.
- Tenant isolation and hostile cross-tenant tests.
- Load/concurrency/performance testing.
- Large city/evidence-universe performance testing.
- Browser/device matrix.
- Degraded-network/offline/error-path behavior.
- Accessibility/keyboard audit.
- Mobile acceptance review.
- Recommendation/explanation consistency testing.

## Independent hostile validation

Before calling VIDIK production-ready, attempt to:

- produce a materially wrong recommendation while passing superficial tests;
- bypass evidence lineage;
- manipulate uncertainty;
- bypass admissibility gates;
- exploit stale/corrupt sources;
- create an invalid counterfactual;
- bypass tenant/data isolation;
- cause UI/engine recommendation divergence;
- corrupt or lose audit/artifact state;
- create unsafe learning/drift behavior.

Document residual risks and explicit non-goals rather than weakening tests.

## Implementation sequence

### Phase A — Recovery and truth baseline

- Preserve the known-good `8de9e413` production/UI baseline.
- Keep PR #98 changes out of the recovery path unless independently justified.
- Audit PR #100 and all current red checks before merge.
- Establish one authoritative current head and CI state.
- Inventory implemented vs missing vs partially implemented requirements in this document.

### Phase B — Complete current Step 5–6 integration

- Finish sensitivity/uncertainty/VOI/recommendation-flip behavior.
- Finish complete decision/audit/counterfactual artifact persistence.
- Resolve the municipal experiment-runner contract defect and all regression failures.
- Resolve monster-matrix architectural gaps rather than masking them.
- Re-run the complete required suite from the final candidate commit.
- Do not merge while required checks are red.

### Phase C — Evidence/adapter hardening

- Verify Ottawa/Toronto/Melbourne source adapters end to end.
- Verify provenance, freshness, normalization, failure-closed behavior, and reproducibility.
- Preserve explicit blocked states for cases lacking authorized marginal exposure/counterfactuals.
- Independently verify production parameters/evidence lineage.

### Phase D — Learning/drift/governance

- Complete outcome persistence and review lifecycle.
- Complete drift/failure registry controls.
- Complete override/audit/governance workflows.
- Validate that learning cannot silently convert observations into unsupported causal parameters.

### Phase E — Production infrastructure

- Managed persistence, TLS, identity/access control, secrets, backups/recovery, monitoring, logging, retention, and operational controls.
- Security/dependency review.
- Reliability/load/concurrency testing.

### Phase F — Independent acceptance

- Independent causal/evidence review.
- Independent hostile security and integrity testing.
- Accessibility/mobile acceptance.
- External municipal workflow/usability review.
- Document accepted residual risks.

### Phase G — Pilot gate

Pilot only when the critical gates are passed or explicitly accepted with documented residual risk. Production-ready status requires a fresh post-merge validation on `main`.

## Definition of done

A capability is DONE only when:

1. The code exists.
2. It is connected to the real production decision path.
3. It preserves the integrity rules above.
4. Failure/edge cases are handled correctly.
5. It has automated validation appropriate to the risk.
6. The browser/mobile product exposes it correctly when user-facing.
7. It is persisted/auditable when lifecycle state requires persistence.
8. It has been exercised against real municipal evidence where applicable.
9. It does not depend on cosmetic test weakening or synthetic evidence masquerading as real evidence.
10. The relevant full regression/release gates are green.

## Current gate

PR #100 is not itself proof of completion. It must remain unmerged until its latest head and the broader regression are green and the remaining architectural gaps have been resolved or explicitly documented as non-production gaps.

This roadmap is intended to prevent future drift: future work should map to a requirement above, and any newly discovered requirement must be added here before being silently treated as complete.
