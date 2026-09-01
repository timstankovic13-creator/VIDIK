# VIDIK Security Policy

## Scope
VIDIK 9.2.1 is a validated reference implementation. Production deployment requires environment-specific security controls described in the Production Readiness Assessment.

## Reporting
Do not disclose suspected vulnerabilities publicly. Report them privately to the repository maintainers with reproduction steps, affected component, and impact.

## Baseline controls
- Fail closed on invalid numeric, provenance, transportability, and uncertainty inputs.
- Keep recommendation-driving evidence traceable to provenance and parameter lineage.
- Keep the frozen validated baseline immutable.
- Review dependency and workflow changes before merge.
- Do not commit credentials, tokens, API keys, or municipal secrets.

## Release requirement
A production release must pass the repository's acceptance suite plus dependency/security scanning, deployment health/recovery checks, and environment-specific tenant/security validation.
