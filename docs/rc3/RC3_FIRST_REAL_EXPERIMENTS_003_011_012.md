# RC3 — First Real Experiments: Cases 003, 011, 012

## Purpose

Move RC3 from experiment scaffolding to executable decision experiments without manufacturing causal effects or recommendations.

## Cases

- **003 Paramedic capacity:** prospective experiment. Unit = deployable paramedic crew-hours. Requires an authorized allocation/exposure ledger, frozen comparator, primary outcome, downstream outcomes, spillover/displacement log, and counterfactual identification.
- **011 Fire response capacity:** prospective experiment. Unit = deployable fire crew-hours/apparatus-hours. Requires incident-level exposure and comparator data; aggregate call volume is not a causal outcome by itself.
- **012 Community paramedic supports:** prospective experiment. Unit = visit/team-hours or eligible-patient service dose. Requires an eligible population, marginal exposure, matched comparator, outcome linkage, and counterfactual validation.

## Eligibility rule

A case is eligible for effect estimation only when its experiment contract is complete and every evidence record is admissible. The gate rejects:

- evidence after the historical decision boundary when it is being used as historical evidence;
- aggregate program spend presented as a marginal exposure;
- before/after evidence presented as causal without an appropriate design;
- population mismatch;
- failed transportability;
- stale evidence;
- unresolved evidence conflict;
- descriptive-only designs for causal effect estimation.

## Prediction and learning

Predictions are frozen before outcome observation. The learning schedule retains the original decision identity at 6-month, 1-year, 2-year, and 5-year checkpoints. Outcome absence or data failure remains inconclusive rather than being converted into success or failure.

## Next execution gate

The next substantive milestone is not another synthetic recommendation. It is the first authorized real allocation/exposure record that can populate Case 003's contract and support a defensible counterfactual. Cases 011 and 012 can proceed in parallel when their own authorized exposure records exist.
