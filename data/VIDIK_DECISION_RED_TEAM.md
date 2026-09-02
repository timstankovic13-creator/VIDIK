# Decision Red Team

Attack the decision system, not the UI.

## Required attacks
- strong-looking but temporally inadmissible evidence;
- aggregate evidence with missing treatment exposure;
- hidden confounding and concurrent interventions;
- spillover / displacement;
- correlated uncertainty represented as independent;
- denominator and population changes;
- contradictory evidence with unequal quality;
- extreme but technically valid parameter values;
- missing outcome linkage;
- recommendation flips under plausible sensitivity changes;
- malicious numeric/string input and unsafe URLs;
- human override that attempts to erase the original recommendation.

## Pass condition
The system either reaches the known correct state or refuses safely. A red-team pass is specifically **not** permission to convert synthetic or incomplete evidence into a real-world recommendation.
