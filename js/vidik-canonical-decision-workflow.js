const STATES = Object.freeze([
  'INTAKE','QUESTION_LOCK','EVIDENCE_SCAN','ADMISSIBILITY','MODEL_BUILD','COUNTERFACTUAL','ANALYSIS','DECISION_OUTPUT','HUMAN_DECISION','AUDIT_SNAPSHOT','OUTCOME_REVIEW','LEARNING'
]);

const TERMINAL = Object.freeze(['NO_RECOMMENDATION','INCONCLUSIVE / DATA FAILURE']);

function runDecisionWorkflow(input) {
  const required = ['decisionId','question','decisionDate','resourceUnit'];
  const missing = required.filter(k => input?.[k] == null || input[k] === '');
  if (missing.length) return { status: 'NO_RECOMMENDATION', failedAt: 'INTAKE', missing };
  if (input.historical && input.evidenceDate && input.evidenceDate > input.decisionDate) {
    return { status: 'NO_RECOMMENDATION', failedAt: 'ADMISSIBILITY', reason: 'POST_DECISION_EVIDENCE' };
  }
  if (input.evidenceAdmissible !== true) {
    return { status: 'NO_RECOMMENDATION', failedAt: 'ADMISSIBILITY', reason: input.admissibilityReason || 'EVIDENCE_NOT_ADMISSIBLE' };
  }
  if (input.modelReady !== true || input.counterfactualReady !== true) {
    return { status: 'NO_RECOMMENDATION', failedAt: 'MODEL_BUILD', reason: 'MODEL_OR_COUNTERFACTUAL_INCOMPLETE' };
  }
  const output = input.recommendation ? 'RECOMMENDATION' : 'NO_RECOMMENDATION';
  return {
    status: output,
    decisionId: input.decisionId,
    question: input.question,
    recommendation: output === 'RECOMMENDATION' ? input.recommendation : null,
    why: input.why || null,
    whyNot: input.whyNot || [],
    uncertainty: input.uncertainty || null,
    whatWouldChangeAnswer: input.whatWouldChangeAnswer || [],
    historicalImmutable: true,
    lifecycle: STATES,
  };
}

module.exports = { STATES, TERMINAL, runDecisionWorkflow };
