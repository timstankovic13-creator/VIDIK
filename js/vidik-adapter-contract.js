const REQUIRED = Object.freeze(['jurisdiction','timezone','interventionMap','sourceRegistry','fieldMappings','temporalCoverage','privacyRules','authorizationRules','decisionTemplates','outcomeDefinitions','unsupportedFields']);

function validateAdapter(adapter) {
  const missing = REQUIRED.filter(k => adapter?.[k] == null);
  const arrays = ['interventionMap','sourceRegistry','fieldMappings','decisionTemplates','outcomeDefinitions','unsupportedFields'];
  const malformed = arrays.filter(k => adapter?.[k] != null && !Array.isArray(adapter[k]));
  return { valid: missing.length === 0 && malformed.length === 0, missing, malformed };
}

function normalizeEvidence(adapter, record) {
  const mapped = {};
  for (const [canonical, local] of Object.entries(adapter.fieldMappings || {})) {
    if (record?.[local] !== undefined) mapped[canonical] = record[local];
  }
  return mapped;
}

module.exports = { REQUIRED, validateAdapter, normalizeEvidence };
