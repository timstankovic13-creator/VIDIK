# VIDIK Decision Red Team

Attack the decision system, not the UI.

Required cases:
- temporal inadmissibility;
- aggregate evidence with missing treatment exposure;
- hidden confounding and concurrent interventions;
- spillover/displacement;
- correlated uncertainty treated as independent;
- denominator/population changes;
- contradictory evidence with unequal quality;
- extreme but valid parameter values;
- missing outcome linkage;
- recommendation flips under plausible sensitivity changes;
- malicious numeric/string input and unsafe URLs;
- human override attempting to erase the original recommendation.

**Pass condition:** reach the known-correct state or refuse safely. Red-team success never authorizes synthetic/incomplete evidence to become a real-world recommendation.
