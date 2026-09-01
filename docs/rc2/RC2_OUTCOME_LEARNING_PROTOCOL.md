# VIDIK RC2 Outcome Learning Protocol

## Immutable historical decision

The historical decision object remains immutable. Outcome observations are appended to a separate learning state and linked by the original decision snapshot/hash.

## Checkpoints

Default checkpoints remain:

- 6 months;
- 1 year;
- 2 years;
- 5 years.

Each checkpoint records implementation exposure, predicted outcome, observed outcome, confidence/uncertainty, sample size, and provenance.

## Learning loop

`decision snapshot -> implementation -> observed outcome -> prediction error -> drift test -> recalibration -> updated current model`

Recalibration must never overwrite the original decision, recommendation, rationale, override, evidence set, or snapshot hash.

## Drift

Drift must distinguish:

- measurement/data drift;
- implementation/exposure drift;
- parameter drift;
- outcome-model drift;
- structural/system drift.

A detected drift event is retained in decision memory and triggers review according to severity.

## RC2 completion requirement

For any candidate moved to real model evaluation, the outcome-learning object must be initialized before recommendation release so that the future observation path is auditable from day one.
