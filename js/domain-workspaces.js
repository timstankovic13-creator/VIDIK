'use strict';

const WORKSPACE_DEFINITIONS = Object.freeze({
  business: {
    label: 'Business',
    purpose: 'Strategy, market, investment and resource-allocation decisions.',
    fields: [
      ['decisionType','Decision type','market entry / expansion / product / operations / investment'],
      ['market','Market / geography','Where is the decision being made?'],
      ['capital','Available capital','Optional amount or capital ceiling'],
      ['horizon','Decision horizon','e.g. 12 months, 3 years'],
      ['constraints','Hard constraints','Regulatory, capacity, staffing, financing or other constraints']
    ],
    output: ['Opportunity / options','Demand and market evidence','Resource and cost constraints','Risk and uncertainty','Decision and next actions']
  },
  community: {
    label: 'Public / Community',
    purpose: 'Community needs, service gaps, program choices and resource allocation.',
    fields: [
      ['population','Population / community','Who is affected?'],
      ['need','Need / outcome','What community condition should change?'],
      ['resources','Available resources','Funding, volunteers, services or capacity'],
      ['equity','Equity considerations','Who must benefit or avoid disproportionate burden?'],
      ['implementation','Implementation constraints','Partners, access, capacity, timing or legal constraints']
    ],
    output: ['Need and affected population','Intervention / service universe','Evidence and applicability','Equity and feasibility','Decision and accountability record']
  },
  research: {
    label: 'Research',
    purpose: 'Evidence discovery, synthesis, gap analysis and reproducible research decisions.',
    fields: [
      ['question','Research question','What relationship, intervention or claim is being investigated?'],
      ['population','Population / setting','Who or what is in scope?'],
      ['evidenceType','Evidence target','Causal, observational, systematic review, implementation, economic or mixed'],
      ['jurisdiction','Target jurisdiction','Where should evidence be applicable?'],
      ['gap','Known evidence gap','What remains uncertain or contested?']
    ],
    output: ['Question framing','Evidence universe','Quality / applicability','Knowledge gaps and uncertainty','Reproducible research artifact']
  },
  enterprise: {
    label: 'Enterprise',
    purpose: 'Cross-functional operating, portfolio, technology, workforce and capital decisions.',
    fields: [
      ['function','Business function','Operations / product / technology / workforce / finance / portfolio'],
      ['decisionType','Decision type','Prioritize / build-buy / invest / expand / reduce / redesign'],
      ['resources','Resources at stake','Budget, people, capacity or assets'],
      ['horizon','Decision horizon','e.g. quarter, 1 year, 3 years'],
      ['risk','Risk constraints','Risk tolerance, dependencies, compliance or service limits']
    ],
    output: ['Decision scope','Options and dependencies','Evidence / benchmarks','Resource, risk and scenario analysis','Decision record and review triggers']
  }
});

function buildWorkspaceContext(audience, input = {}) {
  const definition = WORKSPACE_DEFINITIONS[audience];
  if (!definition) throw new Error('unsupported-workspace');
  const context = { workspace: audience, purpose: definition.purpose, fields: {} };
  for (const [key] of definition.fields) {
    const value = typeof input[key] === 'string' ? input[key].trim() : input[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') context.fields[key] = value;
  }
  return context;
}

function workspaceOutputTemplate(audience) {
  const definition = WORKSPACE_DEFINITIONS[audience];
  return definition ? [...definition.output] : [];
}

module.exports = { WORKSPACE_DEFINITIONS, buildWorkspaceContext, workspaceOutputTemplate };
