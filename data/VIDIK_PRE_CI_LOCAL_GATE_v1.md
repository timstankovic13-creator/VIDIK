# VIDIK Pre-CI Local Gate v1

Before spending any Actions minutes, the release candidate must pass locally:

- executable Decision Benchmark;
- canonical lifecycle and historical leakage checks;
- exact MSE/request-gate checks for 006/009/010/014;
- municipal adapter contract and Ottawa/Toronto/Melbourne portability checks;
- adversarial/reproducibility checks;
- customer-package/demo integrity checks;
- no syntax/module-load failures.

The local gate is a release-preparation gate, not a substitute for CI. Once Actions capacity returns, run the consolidated CI sequence defined by the release manifest.
