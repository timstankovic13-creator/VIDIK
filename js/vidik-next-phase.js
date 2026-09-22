'use strict';

const crypto = require('node:crypto');
const { SOURCE_REGISTRY } = require('./source-registry');

const SOURCE_TYPES = Object.freeze(['local-program', 'official-data', 'research', 'intervention-library', 'comparable-city']);
const REQUIRED_GRAPH_RELATIONS = Object.freeze([
  'problem->outcome', 'problem->intervention', 'intervention->mechanism',
  'intervention->evidence', 'evidence->population', 'evidence->jurisdiction',
  'intervention->implementation', 'intervention->resource', 'outcome->observation',
  'decision->outcome'
]);

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).sort().join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
function hash(value) { return crypto.createHash('sha256').update(stable(value)).digest('hex'); }
function tokens(text = '') { return String(text).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter(Boolean); }
function unique(values) { return [...new Set(values.filter(Boolean).map(String))]; }

function buildExternalSourceNetwork(problem, context = {}) {
  const base = String(problem || '').trim();
  if (!base) throw new Error('external-source-network-problem-required');
  const jurisdictions = unique([context.jurisdiction, ...(context.comparatorJurisdictions || []), 'international']);
  const sourceNetwork = SOURCE_REGISTRY
    .filter(source => jurisdictions.includes(source.jurisdiction) || source.jurisdiction === 'international')
    .map(source => ({
      sourceId: source.sourceId,
      provider: source.provider,
      jurisdiction: source.jurisdiction,
      domain: source.domain,
      tier: source.tier,
      accessMethod: source.accessMethod,
      endpoint: source.url,
      query: `${base} ${source.domain === 'causal-evidence' ? 'effectiveness causal evidence' : 'program intervention service'}`.trim(),
      discoveryOnly: source.domain === 'intervention-universe' || source.domain === 'comparator-innovation',
      causalEvidenceSource: source.domain === 'causal-evidence',
      effectsImported: false
    }));
  return {
    problem: base,
    sourceNetwork,
    sourceCount: sourceNetwork.length,
    jurisdictions: unique(sourceNetwork.map(source => source.jurisdiction)),
    hash: hash(sourceNetwork)
  };
}

function buildDecisionKnowledgeGraph({ problem, candidates = [], evidenceIndex = {}, context = {}, statusQuo = null, outcomes = [] } = {}) {
  if (!String(problem || '').trim()) throw new Error('knowledge-graph-problem-required');
  const nodes = [{ id: 'problem', type: 'problem', label: String(problem).trim() }];
  const edges = [];
  const addNode = (id, type, label, attributes = {}) => { if (!nodes.some(node => node.id === id)) nodes.push({ id, type, label, attributes }); };
  const addEdge = (from, relation, to, attributes = {}) => edges.push({ from, relation, to, attributes });
  addNode('status-quo', 'intervention', 'Status quo', { explicit: statusQuo?.explicit === true });
  addEdge('problem', 'problem->intervention', 'status-quo', { counterfactual: true });
  candidates.forEach(candidate => {
    const id = `intervention:${candidate.id}`;
    addNode(id, 'intervention', candidate.name || candidate.id, { source: candidate.source || candidate.discovery?.source || null });
    addEdge('problem', 'problem->intervention', id);
    const mechanism = candidate.mechanism || candidate.discovery?.mechanism;
    if (mechanism) { const mid = `mechanism:${hash(mechanism).slice(0, 12)}`; addNode(mid, 'mechanism', mechanism); addEdge(id, 'intervention->mechanism', mid); }
    const implementation = candidate.implementation || candidate.implementationEnvironment;
    if (implementation) { const iid = `implementation:${hash(implementation).slice(0, 12)}`; addNode(iid, 'implementation', implementation); addEdge(id, 'intervention->implementation', iid); }
    const resource = candidate.resource || candidate.cost || candidate.resourceRequirement;
    if (resource != null) { const rid = `resource:${hash(resource).slice(0, 12)}`; addNode(rid, 'resource', String(resource)); addEdge(id, 'intervention->resource', rid); }
    const evidence = evidenceIndex[candidate.id] || {};
    for (const [type, claim] of Object.entries(evidence)) {
      if (!claim || typeof claim !== 'object') continue;
      const eid = `evidence:${candidate.id}:${type}`;
      addNode(eid, 'evidence', `${candidate.name || candidate.id}:${type}`, { status: claim.status || 'unknown', sourceIds: claim.sourceIds || [] });
      addEdge(id, 'intervention->evidence', eid, { evidenceType: type });
      if (claim.population) { const pid = `population:${hash(claim.population).slice(0, 12)}`; addNode(pid, 'population', String(claim.population)); addEdge(eid, 'evidence->population', pid); }
      if (claim.jurisdiction) { const jid = `jurisdiction:${hash(claim.jurisdiction).slice(0, 12)}`; addNode(jid, 'jurisdiction', String(claim.jurisdiction)); addEdge(eid, 'evidence->jurisdiction', jid); }
    }
    const tags = unique(candidate.problemTags || []);
    tags.forEach(tag => { const oid = `outcome:${hash(tag).slice(0, 12)}`; addNode(oid, 'outcome', tag); addEdge('problem', 'problem->outcome', oid); });
  });
  outcomes.forEach(outcome => {
    const oid = `observation:${hash(outcome).slice(0, 12)}`; addNode(oid, 'observation', outcome.metric || 'Observed outcome', { observed: outcome.observed ?? null });
    addEdge('problem', 'outcome->observation', oid);
  });
  return { version: 1, nodes, edges, requiredRelations: REQUIRED_GRAPH_RELATIONS, graphHash: hash({ nodes, edges }) };
}

function buildWhyWhyNot({ ranked = [], evidenceIndex = {}, statusQuo = null, analysis = {}, robustness = null } = {}) {
  const winner = ranked.find(item => item.recommendationEligible && item.score != null) || null;
  const alternatives = ranked.map(item => {
    const evidence = evidenceIndex[item.candidateId] || {};
    const contradictions = Object.values(evidence).filter(value => ['contradicted', 'conflicting'].includes(value?.status)).length;
    const reasons = [];
    if (!item.evidenceComplete) reasons.push('evidence-incomplete');
    if (contradictions) reasons.push('contradicting-evidence');
    if (winner && item.candidateId !== winner.candidateId && item.score != null && item.score < winner.score) reasons.push('lower-supported-value');
    if (item.score == null) reasons.push('not-scoreable');
    return {
      candidateId: item.candidateId,
      why: item.candidateId === winner?.candidateId ? ['highest-supported-score-among-eligible-options'] : [],
      whyNot: unique(reasons),
      keyAssumption: analysis[item.candidateId]?.keyAssumption || null,
      reversalCondition: analysis[item.candidateId]?.reversalCondition || null
    };
  });
  return {
    winner: winner?.candidateId || null,
    why: winner ? alternatives.find(item => item.candidateId === winner.candidateId) : null,
    whyNot: alternatives.filter(item => item.candidateId !== winner?.candidateId),
    statusQuo: {
      explicit: statusQuo?.explicit === true,
      compared: Boolean(winner),
      reason: statusQuo?.explicit === true ? (winner ? 'explicit-counterfactual' : 'no-supported-option-beats-status-quo') : 'status-quo-missing'
    },
    robustness: robustness || null,
    informationWorthObtaining: ranked.filter(item => !item.evidenceComplete).map(item => ({ candidateId: item.candidateId, value: 'resolve-evidence-gap-before-recommendation' }))
  };
}

function adversarialDecisionStress({ baseline, scenarios = [], malformed = {}, transportability = [] } = {}) {
  const baselineWinner = baseline?.winner || null;
  const scenarioWinners = scenarios.map(scenario => scenario.winner || null);
  const flips = scenarioWinners.filter(winner => winner && winner !== baselineWinner);
  const failures = [];
  if (malformed.nonFiniteEstimate) failures.push('non-finite-estimate');
  if (malformed.negativeVOI) failures.push('negative-voi');
  if (malformed.missingUncertainty) failures.push('missing-uncertainty');
  if (malformed.missingStatusQuo) failures.push('missing-status-quo');
  if (transportability.some(item => item.effectsImported || item.causalEffectTransferred)) failures.push('causal-effect-import');
  return { baselineWinner, recommendationFlips: flips.length, failures, blocked: flips.length > 0 || failures.length > 0, stable: flips.length === 0 && failures.length === 0 };
}

function buildBlindBenchmark() {
  return [
    ['reduce violent crime','public-safety'], ['reduce pedestrian deaths','transport'], ['reduce emergency-department overcrowding','health'], ['reduce opioid mortality','health'],
    ['reduce homelessness','housing'], ['reduce evictions','housing'], ['reduce food insecurity','social-policy'], ['reduce urban heat','environment'],
    ['reduce air pollution','environment'], ['reduce municipal water loss','utilities'], ['reduce small-business vacancy','economic-development'], ['reduce library wait times','public-service'],
    ['reduce school absenteeism','education'], ['reduce youth unemployment','employment'], ['reduce domestic violence','public-safety'], ['reduce traffic injuries','transport'],
    ['reduce overdose deaths','health'], ['reduce chronic disease burden','health'], ['reduce wildfire exposure','environment'], ['reduce flood risk','environment'],
    ['reduce housing construction delays','housing'], ['reduce shelter overflow','housing'], ['reduce ambulance response times','health'], ['reduce paramedic offload delay','health'],
    ['reduce transit delays','transport'], ['reduce cycling injuries','transport'], ['reduce road fatalities','transport'], ['reduce noise complaints','environment'],
    ['reduce illegal dumping','environment'], ['reduce waste contamination','environment'], ['reduce energy poverty','utilities'], ['reduce utility arrears','social-policy'],
    ['reduce vacant storefronts','economic-development'], ['reduce business licensing delays','economic-development'], ['reduce public-space disorder','public-safety'], ['reduce recidivism','justice'],
    ['reduce court delay','justice'], ['reduce elder isolation','social-policy'], ['reduce newcomer employment barriers','employment'], ['reduce digital exclusion','social-policy'],
    ['reduce child-care waitlists','social-policy'], ['reduce chronic homelessness','housing'], ['reduce school violence','education'], ['reduce heat-related illness','health'],
    ['reduce stormwater flooding','utilities'], ['reduce food waste','environment'], ['reduce municipal procurement delay','administration'], ['reduce permit backlog','administration']
  ].map(([problem, domain]) => ({ problem, domain }));
}

function certifyUnseenProblem({ problem, context = {}, sourceResults = [], candidates = [], evidenceIndex = {}, ranked = [], statusQuo = { explicit: true }, robustness = null } = {}) {
  if (!String(problem || '').trim()) throw new Error('unseen-problem-required');
  const strategy = { problem: String(problem).trim(), queryCount: 5, sourceTypes: SOURCE_TYPES };
  const graph = buildDecisionKnowledgeGraph({ problem, candidates, evidenceIndex, context, statusQuo });
  const whyWhyNot = buildWhyWhyNot({ ranked, evidenceIndex, statusQuo, robustness });
  const coverage = SOURCE_TYPES.map(type => sourceResults.some(source => source.sourceType === type));
  const discoveryComplete = coverage.every(Boolean);
  return {
    certified: Boolean(discoveryComplete && graph.nodes.length >= 2 && whyWhyNot.statusQuo.explicit),
    gates: { discoveryComplete, graphPresent: graph.nodes.length >= 2, statusQuoExplicit: whyWhyNot.statusQuo.explicit },
    strategy, graphHash: graph.graphHash, whyWhyNot
  };
}

function outcomeLearningReview(records = [], baselineHash = null) {
  const baseline = baselineHash || hash(records.map(record => record.baselineDecisionHash));
  const valid = records.filter(record => Number.isFinite(Number(record.deviation)));
  const meanDeviation = valid.length ? valid.reduce((sum, record) => sum + Number(record.deviation), 0) / valid.length : null;
  return {
    baselineHash: baseline,
    sampleSize: valid.length,
    meanDeviation,
    status: valid.length ? 'governed-review' : 'insufficient-outcomes',
    historyRewrite: false,
    automaticParameterMutation: false,
    proposedOnly: true
  };
}

module.exports = {
  SOURCE_TYPES,
  REQUIRED_GRAPH_RELATIONS,
  buildExternalSourceNetwork,
  buildDecisionKnowledgeGraph,
  buildWhyWhyNot,
  adversarialDecisionStress,
  buildBlindBenchmark,
  certifyUnseenProblem,
  outcomeLearningReview
};
