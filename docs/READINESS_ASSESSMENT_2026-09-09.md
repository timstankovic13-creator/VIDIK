# VIDIK readiness assessment — 2026-09-09

## Purpose

This is the current boundary between **implemented**, **repository-verifiable**, and **environment-dependent** readiness. It is deliberately conservative: a test or document is not treated as proof that an external municipal deployment exists.

## Executive assessment

**Developer:** core decision/evidence architecture is substantially implemented and testable in-repository.

**Municipal pilot:** the three-city proof path is implemented for Ottawa, Toronto and Melbourne, including reproducible municipal source contracts, geography reconciliation, causal evidence separation, canonical decisions, decision intelligence and tamper-evident artifacts. A real pilot still requires deployment, identity, data-sharing, governance and operational acceptance.

**Business/commercial:** the product proposition and decision workflow are sufficiently concrete for customer discovery/demo/pilot conversations, but production SaaS operations, contractual package, pricing, SLA, security assurance and procurement materials are not yet evidence-complete.

**Production:** not certified. The repository explicitly requires managed PostgreSQL, authenticated tenant-bound access, managed secrets, TLS, encrypted/tested backups, monitoring and recovery evidence before pilot.

## Capability matrix

| Area | Current state | What is proven here | Remaining gate |
|---|---|---|---|
| Municipal ingestion | READY FOR PILOT BUILD | Ottawa/Toronto/Melbourne adapter contracts and provenance validation | Production credentials/rate limits, source-change monitoring, additional municipal adapters |
| Geography reconciliation | READY | GeoNames identity + WorldPop enrichment boundary and validation | Production service operations and freshness policy |
| Causal evidence | READY / GUARDED | Municipal observations kept separate from causal evidence; independent three-city parameter verification | Independent external review of the causal universe |
| Decision engine | READY | Canonical decision object and admissible causal pathway | Broader real marginal-resource evidence before optimization is activated |
| Sensitivity / uncertainty / VOI | READY | Bounded sensitivity, correlated uncertainty, recommendation flips, deterministic simulation and VOI | Validate against real acquisition costs and domain review |
| Decision artifacts | READY | Complete envelope, SHA-256 integrity, append-only hash chain and replay | Managed server-side persistence and operational retention |
| Outcome learning | IMPLEMENTED / NEEDS OPERATIONALIZATION | 6m/1y/2y/5y lifecycle, recalibration and drift controls exist | Real persistent deployment, scheduled reviews, ownership and live outcome feeds |
| Governance / overrides | IMPLEMENTED / NEEDS DEPLOYMENT | Override/audit/lifecycle controls exist | Municipal policy, delegated authority, privacy, records retention and approval workflow |
| Browser/mobile | IMPLEMENTED / TESTED IN REPO | Production acceptance coverage exists | Real device/browser acceptance and accessibility sign-off |
| Security | GUARDED | Fail-closed contracts and production security contract | Independent penetration test, threat model sign-off and deployment evidence |
| Infrastructure | CONTRACT-READY | PostgreSQL schema, production config and deployment acceptance contract | Provision actual environment and exercise backup/restore/recovery |
| Developer integration | LIBRARY/CLI READY | Node modules, scripts and npm test/run contracts | Public API/server SDK, versioning policy and external developer onboarding |
| Municipal buyer package | DEMO/PILOT READY | Concrete workflow and evidence/governance boundaries | Procurement, DPA/privacy, SLA, security package, implementation plan |
| Commercial operations | DISCOVERY READY | Clear product purpose and user modes established | Pricing, packaging, contracts, support, billing and customer-success operations |

## Non-negotiable scientific boundary

1. Municipal observations are context, not causal evidence.
2. Similarity/transportability cannot itself establish causal admissibility.
3. Synthetic marginal-resource models cannot activate production optimization.
4. A recommendation must remain traceable to admissible evidence and explicit assumptions.
5. Learning may produce recalibration signals but must not silently rewrite historical decisions.
6. Integrity failures, invalid uncertainty, invalid transportability or malformed production input must fail closed.

## What “ready in the next couple of hours” can honestly mean

Within a repository-only work session, VIDIK can be taken to a **demo/pilot-package-ready** state: a municipality can see the workflow, a developer can run the decision pipeline and tests, and a technical evaluator can inspect the provenance/integrity chain.

It cannot honestly be declared **production-deployed** until an actual managed environment, identity provider, secrets system, TLS endpoint, backups/restore and monitoring are provisioned and evidenced.

## Next highest-value gates

1. Execute and inspect the complete three-city canonical + persisted artifact run on clean CI.
2. Add a single machine-readable readiness manifest and release gate tying the capability matrix to tests.
3. Package a municipal pilot runbook: intake → source connection → evidence review → decision → governance → outcome review.
4. Package a developer integration contract around the existing Node modules/CLI and define the future HTTP/API boundary without pretending it already exists.
5. Package buyer/procurement requirements: security, privacy, records, accessibility, hosting, support and evidence review.
6. Provision a non-production managed environment and run the real infrastructure acceptance tests.
7. Obtain independent security/accessibility/evidence review before any production pilot.
