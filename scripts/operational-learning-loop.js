'use strict';

const { createOutcomeLearningStore } = require('./outcome-learning');
const { createOperationalGovernanceStore } = require('./operational-governance');

const CHECKPOINTS = Object.freeze(['6-month', '1-year', '2-year', '5-year']);

function fail(code, detail) {
  const error = new Error(detail ? `${code}: ${detail}` : code);
  error.code = code;
  throw error;
}

function createOperationalLearningLoop(options = {}) {
  if (!options.decisionId || typeof options.decisionId !== 'string') fail('invalid-decision-id');
  const learning = options.learningStore || createOutcomeLearningStore({ filePath: options.learningFilePath });
  const governance = options.governanceStore || createOperationalGovernanceStore({ filePath: options.governanceFilePath });

  return {
    decisionId: options.decisionId,
    scheduleAllReviews(decisionAt) {
      return CHECKPOINTS.map(checkpoint => governance.scheduleReview({ decisionId: options.decisionId, checkpoint, decisionAt }));
    },
    status(now = new Date()) {
      return {
        reviews: governance.reviewStatus(options.decisionId, now),
        learning: learning.lifecycle(options.decisionId, now),
        drift: learning.driftReport(options.decisionId),
      };
    },
    recordOutcome(input) {
      if (!input || input.decisionId !== options.decisionId) fail('decision-id-mismatch');
      const outcome = learning.recordOutcome(input);
      return { outcome, status: this.status(input.outcomeAt || new Date()) };
    },
    proposeRecalibration(input) {
      if (!input || input.decisionId !== options.decisionId) fail('decision-id-mismatch');
      const signal = learning.recalibrationSignal(input);
      const proposal = governance.proposeRecalibration({
        decisionId: options.decisionId,
        parameterName: input.parameterName,
        proposedValue: signal.suggestedValue,
        basis: 'outcome-learning-signal',
      });
      return { signal, proposal };
    },
    decideRecalibration(proposalId, decision, input = {}) {
      return governance.decideRecalibration(proposalId, decision, input);
    },
    completeReview(reviewId, input = {}) {
      return governance.completeReview(reviewId, input);
    },
    integrity() {
      return { learning: learning.verifyIntegrity(), governance: governance.verifyIntegrity() };
    },
  };
}

module.exports = { CHECKPOINTS, createOperationalLearningLoop };
