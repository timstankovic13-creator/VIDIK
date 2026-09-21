# VIDIK Insight Quality Benchmark History

This file is the durable comparison record for the Insight Quality / Discovery Quality battery.

## Baseline — pre-hardening

Source: pre-hardening 60-case Insight Quality Battery.

| Metric | Baseline |
|---|---:|
| STRONG | 0/60 |
| USEFUL-INCOMPLETE | 42/60 |
| BLOCKED | 18/60 |
| Average candidates/problem | 2.67 |
| Average actionable ratio | 55% |
| Expected intervention-class hits | 14/60 |
| Expected-family coverage | 37/60 |
| Cases with 2 independent evidence sources | 0/60 |

## Checkpoint 1 — Node 24 + discovery hardening

Run: 35611730568
Commit: a5fb38527ce3454f556bda5044253886ad72a0ce

| Metric | Checkpoint 1 | Change vs baseline |
|---|---:|---:|
| STRONG | 5/60 | +5 |
| USEFUL-INCOMPLETE | 41/60 | -1 |
| BLOCKED | 14/60 | -4 |
| Average candidates/problem | 2.80 | +0.13 |
| Average actionable ratio | 62% | +7 pts |
| Expected intervention-class hits | 21/60 | +7 |
| Expected-family coverage | 43/60 | +6 |
| Cases with 2 independent evidence sources | 38/60 | +38 |

## Interpretation

This is a benchmark checkpoint, not a claim of production readiness. Battery grades are automated triage. The next target is to eliminate the remaining BLOCKED cases and reduce false/weak candidates, especially document/record-like literature results and cross-domain leakage.

## Next diagnostic cohort

The 14 BLOCKED cases from Checkpoint 1 are retained as the immediate discovery-failure cohort:

- business — improve small business survival
- business — reduce customer churn
- business — reduce employee turnover
- business — reduce workplace injuries
- business — reduce supply chain disruption
- business — increase employee training completion
- community — reduce youth violence
- community — improve disaster preparedness
- community — reduce heat exposure
- research — study interventions to reduce pedestrian injuries
- research — study workforce displacement from automation
- enterprise — reduce digital access gaps
- enterprise — reduce cybersecurity incident risk
- enterprise — reduce procurement cycle time

The next implementation pass should diagnose source-selection/fallback failure first, then semantic candidate precision, before rerunning the full 60-case battery.
