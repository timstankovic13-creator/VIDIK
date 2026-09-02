# VIDIK Offline Release Gate

## Purpose

Provide a deterministic pre-CI gate while GitHub-hosted Actions minutes are unavailable. This is not a substitute for the October CI release gate; it is the local evidence that code is internally consistent before spending CI minutes.

## Rules

1. Never trigger Actions merely to discover whether a change works.
2. Run deterministic Node tests locally first.
3. A failed local gate is `BLOCKED`, never a release candidate.
4. A passing local gate does not claim GitHub CI is green.
5. Browser, dependency, platform, and hosted-runner behavior remain CI-only release checks.
6. No PR is opened solely to obtain a CI result while the Actions budget is exhausted.

## Current deterministic suite

- `tests/rc4-evidence-acquisition-spec.test.js`
- `tests/rc4-evidence-request-gate.test.js`
- `tests/vidik-adversarial-reproducibility.test.js`

Runner: `js/vidik-offline-release-gate.js`

## October release sequence

When Actions minutes return, run the smallest targeted CI gate first. Only after it is green should the full regression/browser suite be spent. The exact commit SHA tested must be recorded.

## Interpretation

`PASS` = all listed offline deterministic tests passed.

`BLOCKED` = at least one listed test failed.

Neither status authorizes a historical recommendation. VIDIK's substantive fail-closed evidence gates remain unchanged.
