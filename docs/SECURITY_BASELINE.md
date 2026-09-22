# VIDIK Security Baseline

This is an engineering baseline for municipal procurement preparation. It is not a security certification.

## Required controls

| Control area | Minimum expectation | Evidence before live deployment |
|---|---|---|
| Identity | MFA-capable authentication; unique accounts | Auth test + access review |
| Authorization | Least privilege; role separation | RBAC test |
| Tenant isolation | No cross-tenant reads/writes | Automated isolation tests |
| Transport | HTTPS/TLS for network traffic | Configuration evidence |
| Storage | Encryption at rest where supported | Provider/config evidence |
| Secrets | No credentials in source; managed secrets | Secret scan |
| Audit | Tamper-evident decision and admin events | Audit test |
| Backups | Documented backup and restore process | Restore test |
| Recovery | Defined RTO/RPO per contract | Recovery exercise |
| Dependencies | Pin/review production dependencies | Dependency report |
| Vulnerabilities | Triage and remediation process | Scan + remediation log |
| Incident response | Detection, containment, notification, recovery | Tabletop exercise |
| Change control | Reviewed, traceable model/code changes | Change records |
| Monitoring | Availability, errors, security events | Monitoring evidence |
| Data minimization | Collect only necessary data | Data inventory review |

## Decision integrity
A production decision record must preserve the original recommendation, evidence/provenance, assumptions, uncertainty, human adoption/override, implementation, outcomes, and calibration/drift history. Integrity failures must fail closed and be auditable.

## Release gate
No claim of production security readiness should be made until the controls applicable to the actual deployment have been tested and documented. Third-party assurance (for example SOC 2 or ISO 27001) is a separate procurement/compliance decision, not implied by this baseline.
