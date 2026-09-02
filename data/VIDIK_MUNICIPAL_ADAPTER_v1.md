# VIDIK Municipal Adapter v1

## Architecture

`VIDIK Core → Municipal Adapter → Evidence Registry → Decision Template → Decision Object`

The core decision logic is jurisdiction-agnostic. The adapter owns local identifiers, source connectors, terminology, calendars, organizational roles, privacy rules and field mappings.

## Adapter contract

Every municipality must declare:

- jurisdiction identity and timezone;
- intervention/resource taxonomy mapping;
- source registry and provenance rules;
- dataset field mappings and units;
- temporal coverage and update cadence;
- privacy/classification constraints;
- organizational ownership and authorization requirements;
- local decision templates;
- local outcome definitions;
- unsupported fields and explicit gaps.

## Evidence normalization

Adapters may normalize schemas but may not manufacture missing exposure, outcome, comparator, causal, or authorization fields. Missing material fields remain missing and flow into the existing fail-closed gates.

## Portability test

A new municipality should require adapter configuration and evidence onboarding—not changes to the core optimization, admissibility, governance, audit, or learning engines.

## Initial adapter targets

Ottawa, Toronto and Melbourne should share this contract. Differences belong in adapter data/configuration, not duplicated decision logic.
