# October Release Gate

GitHub Actions is intentionally not used while included minutes are exhausted.

## Pre-CI offline gate
- public-safety 5M lab deterministic;
- benchmark deterministic and known-answer scenarios pass;
- red-team suite pass;
- historical boundary immutable;
- evidence acquisition/MSE rules pass;
- customer lifecycle invariants pass;
- transportability adapter checks pass;
- value-benchmark instrumentation present;
- demo package internally consistent.

## October CI gate
Run only targeted certification first: changed-module tests, browser acceptance, then the smallest required regression. Escalate to full regression only after targeted gates are green. Never use CI as exploratory debugging.

CI success is a release certification, not evidence that a real-world causal recommendation is justified.
