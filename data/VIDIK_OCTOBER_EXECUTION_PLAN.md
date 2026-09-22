# VIDIK October Execution Plan

October is the first CI-authoritative release window after the current Actions-minute exhaustion.

## Before CI returns

- complete local benchmark, lifecycle, adapter and adversarial checks;
- freeze benchmark fixtures and expected outputs;
- prepare one consolidated release candidate rather than many speculative PRs;
- keep municipal acquisition requests blocked until the frozen MSE gate authorizes them;
- prepare the exact CI matrix to run once, with failures diagnosed from logs before any rerun.

## First CI window

1. Run targeted unit/regression suite for all new modules.
2. Run browser acceptance.
3. Run full regression.
4. Run benchmark fixture suite.
5. Verify main baseline at the actual merge SHA.
6. Only then merge the release candidate.

## Rule

No Actions run is justified merely to see whether a change passes. Every October run must have a named release-gate purpose and a pre-existing local validation result.
