# VIDIK Canonical Municipal Demo Workflow v1

## Demo question

> Should the municipality allocate the next marginal unit of a scarce public-safety resource to option A, option B, or the status quo?

The demo deliberately supports all three outcomes: recommendation, decision-support-only, and `NO RECOMMENDATION`.

## 1. Intake

User supplies decision question, deadline, resource unit, options, jurisdiction and decision owner.

## 2. Evidence triage

VIDIK identifies the minimum evidence needed for the exact claim, checks temporal admissibility and classifies evidence as descriptive, decision-support or causal.

## 3. Analysis

VIDIK constructs the resource → capacity → activity → outcome chain, status quo, alternatives, uncertainty and sensitivity. It does not promote an unsupported causal claim.

## 4. Answer

The first screen shows the answer, confidence, status-quo comparison and the most important reason. If blocked, it shows exactly which gate failed and the smallest evidence package that could resolve it.

## 5. Explain

The user can open Why, Why-not, Evidence, Model, Trade-offs, Uncertainty, Assumptions and Audit.

## 6. Decide

The human decision-maker accepts, modifies or rejects the VIDIK output. Any override requires rationale and leaves the original output immutable.

## 7. Record

VIDIK freezes an audit snapshot containing decision identity, evidence/model versions, inputs, output and human action.

## 8. Learn

Outcome checkpoints compare predictions and realized outcomes without mutating the historical decision.

## Demo success condition

A complete run must end in either a defensible recommendation or an explicit, useful block. No manual developer intervention, hidden data substitution or unsupported claim is permitted.
