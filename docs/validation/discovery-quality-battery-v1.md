# VIDIK Discovery Quality Battery v1

Status: validation design only. This document defines the 80-problem benchmark for morning review. It does not authorize or trigger CI.

## Scoring dimensions

Each case should eventually be assessed on the same dimensions:

- **D1 Discovery:** plausible actionable intervention classes are surfaced.
- **D2 Actionability:** records/reports/datasets/organizations are not promoted as interventions.
- **D3 Relevance:** candidates address the stated problem through a defensible mechanism.
- **D4 Diversity:** multiple intervention mechanisms/classes are represented where they plausibly exist.
- **D5 Evidence linkage:** evidence is attached to the candidate/intervention, not merely the topic.
- **D6 Transferability:** jurisdiction/context differences are explicit.
- **D7 Completeness:** missing-option risk is surfaced and bounded expansion occurs.
- **D8 Governance:** unknown is not zero; failed searches remain failures; recommendation gates remain intact.
- **D9 Provenance:** candidate origin and source type remain traceable.
- **D10 Decision readiness:** the resulting universe is usable for downstream resource/opportunity-cost analysis.

A case should never be scored solely on whether it returns candidates.

## Anti-overfitting rule

The benchmark contains reference intervention lanes for evaluation, but production discovery must not use this fixture as its candidate registry. The test oracle should assess **classes/mechanisms and failure modes**, not require exact names or exact counts.

## 80 decision problems

### Municipal / public safety
1. reduce violent crime
2. reduce youth violence
3. reduce domestic violence
4. reduce pedestrian fatalities
5. reduce traffic injuries
6. reduce opioid overdose deaths
7. reduce emergency department overcrowding
8. reduce homelessness
9. reduce eviction filings
10. reduce extreme-heat illness

### Municipal / environment, infrastructure and access
11. reduce wildfire smoke exposure
12. reduce flood damage
13. reduce residential energy burden
14. reduce urban air pollution
15. reduce drinking-water service interruptions
16. reduce construction permitting delays
17. improve public transit reliability
18. reduce traffic congestion
19. improve accessibility of public buildings
20. reduce illegal dumping

### Housing / community
21. increase access to affordable housing
22. reduce chronic homelessness
23. reduce shelter demand
24. reduce food insecurity
25. improve newcomer employment
26. reduce social isolation among seniors
27. improve rural healthcare access
28. improve disaster preparedness
29. reduce heat exposure among vulnerable residents
30. improve access to childcare

### Health
31. reduce hospital readmissions
32. reduce avoidable emergency-department visits
33. improve primary-care access
34. improve medication adherence
35. reduce preventable falls among older adults
36. improve prenatal care access
37. reduce smoking prevalence
38. improve vaccination uptake
39. reduce untreated mental-health service gaps
40. improve continuity of care after hospital discharge

### Education / workforce
41. reduce chronic school absenteeism
42. improve literacy outcomes
43. improve high-school graduation
44. reduce youth unemployment
45. improve apprenticeship completion
46. reduce employee turnover
47. reduce workplace injuries
48. improve employee training completion
49. reduce workforce displacement from automation
50. improve hiring success

### Enterprise / operations
51. reduce customer churn
52. reduce procurement cycle time
53. reduce cybersecurity incident risk
54. improve data governance
55. reduce regulatory compliance delays
56. reduce infrastructure maintenance backlog
57. improve emergency response coordination
58. reduce supply-chain disruption
59. reduce delivery delays
60. improve accessibility of digital services

### Research / policy evaluation
61. evaluate interventions to reduce homelessness
62. evaluate ways to reduce hospital waiting times
63. evaluate interventions for food insecurity
64. study effective heat-health interventions
65. study interventions to reduce pedestrian injuries
66. study opioid-overdose prevention
67. study wildfire-smoke mitigation
68. study energy-poverty interventions
69. study interventions to improve rural mobility
70. study workforce displacement interventions

### Cross-domain / deliberately difficult
71. reduce social isolation
72. reduce barriers to digital access
73. improve disaster evacuation
74. reduce public-sector service backlogs
75. reduce small-business failure
76. reduce community-level inequality in service access
77. improve response to extreme weather
78. reduce preventable injuries in public spaces
79. improve coordination across emergency and social services
80. allocate scarce funding across competing community priorities

## Required challenge variants

The battery should eventually run each problem through at least these conceptual challenges:

### Variant A — ordinary phrasing
Use the problem exactly as written.

### Variant B — natural-language phrasing
Paraphrase the objective without using canonical taxonomy terms.

### Variant C — sparse evidence
Constrain or simulate a weak source library and verify that VIDIK expands discovery rather than declaring no options.

### Variant D — contaminated sources
Include records, reports, datasets, provider directories and evaluation titles alongside genuine interventions.

### Variant E — cross-domain leakage
Give the system plausible candidates from a neighboring domain and verify that they are not promoted without a defensible mechanism.

### Variant F — missing-class challenge
Intentionally remove one plausible intervention family from the initial candidate pool and verify that missing-option logic can trigger bounded expansion.

## Battery completion rule

Do not collapse the battery to a single pass/fail number.

The eventual report should show:
- per-dimension results;
- failures by root cause;
- false-positive intervention rate;
- missed-class rate;
- source-search failure rate;
- missing-option detection rate;
- evidence-linkage failures;
- cross-domain leakage rate;
- cases blocked correctly by governance;
- representative artifacts for both successful and failed cases.

The benchmark exists to tell us **what VIDIK does not yet know how to do**, not to manufacture a green result.
