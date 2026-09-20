'use strict';
const { retrieve, parsePayload, sha256 } = require('./data-acquisition');
const { SOURCE_REGISTRY } = require('./source-registry');
const CKAN_SOURCE_IDS = new Set(['ca-program-discovery','ca-ontario-program-discovery','us-open-data-program-discovery','uk-open-data-program-discovery','au-open-data-program-discovery','nz-open-data-program-discovery','ie-open-data-program-discovery']);
const GOVUK_SOURCE_IDS = new Set(['uk-gov-program-discovery']);
function normalizeText(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function normalizeInterventionName(value) { return normalizeText(value).toLowerCase().replace(/\b(the|a|an)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\b(programme|initiative|project|pilot)\b/g, 'program').replace(/\b(centre|center)\b/g, 'centre').replace(/\s+/g, ' ').trim(); }
function buildGovUkSearchUrl(source, query, { rows = 10 } = {}) { if (!source?.url || !GOVUK_SOURCE_IDS.has(source.sourceId)) throw new Error('unsupported-govuk-intervention-source'); if (!String(query || '').trim()) throw new Error('source-driven-query-required'); if (!Number.isInteger(rows) || rows < 1 || rows > 100) throw new Error('source-driven-page-size-invalid'); const url = new URL(source.url); url.searchParams.set('q', String(query).trim()); url.searchParams.set('count', String(rows)); url.searchParams.set('fields', 'title,description,link,format'); return url.toString(); }
function buildCkanSearchUrl(source, problem, { rows = 25 } = {}) { if (!source?.url || !CKAN_SOURCE_IDS.has(source.sourceId)) throw new Error('unsupported-ckan-intervention-source'); if (!String(problem || '').trim()) throw new Error('source-driven-problem-required'); if (!Number.isInteger(rows) || rows < 1 || rows > 100) throw new Error('source-driven-page-size-invalid'); const url = new URL(source.url); url.searchParams.set('q', String(problem).trim()); url.searchParams.set('rows', String(rows)); return url.toString(); }
const NON_INTERVENTION_TERMS = ['dataset','data set','census','statistics','statistic','report','budget','indicator','information','dashboard','administrative records','records','open data','mapping data','survey','profile','monitoring data','raw data'];
const INTERVENTION_TERMS = ['program','programme','service','initiative','intervention','pilot','project','grant','funding','subsidy','benefit','shelter','clinic','treatment','outreach','prevention','enforcement','patrol','training','support service','fund','funding','scheme','action plan','housing first','rapid rehousing','transit','bus lane','bike lane','protected lane','infrastructure','facility','voucher','inspection','licensing','permit','regulation','cash transfer','food bank','cooling centre','cooling center','emergency response','staffing','capacity','broadband subsidy','internet subsidy','device lending','device grant','public wi-fi','public wifi','digital inclusion','digital literacy','community technology centre','community technology center','computer access'];
const STRONG_INTERVENTION_TERMS = INTERVENTION_TERMS.filter(term => !['prevention','intervention'].includes(term));
const GENERIC_ACTION_TERMS = new Set(['prevention','intervention']);
const INTERVENTION_FAMILIES = [
  ['housing','housing','shelter','housing first','rapid rehousing','supportive housing','rental assistance','eviction prevention','tenant legal assistance'],
  ['food-access','food','food bank','food access','food voucher','community food hub','mobile market','community kitchen','school meal'],
  ['public-safety','crime','violence','assault','domestic violence','sexual violence','partner assault','violence response','prevention','enforcement','patrol','policing','deterrence','violence interruption','credible messenger','safe passage'],
  ['mobility-safety','bike lane','protected lane','bus lane','transit','traffic','traffic calming','pedestrian crossing','signal timing','bus priority'],
  ['health-service','clinic','treatment','health','emergency response','care navigation','community paramedicine','mobile crisis','community health worker','overdose prevention'],
  ['climate-resilience','cooling centre','cooling center','cooling infrastructure','shade infrastructure','tree canopy','heat','smoke','emergency response','clean air shelter','home cooling','flood mitigation','stormwater','weatherization'],
  ['employment','training','worker','employment','staffing','job placement','career pathway','apprenticeship','reskilling','wage subsidy'],
  ['economic-support','grant','funding','subsidy','benefit','voucher','cash transfer','working capital','business financing','utility assistance','energy assistance'],
  ['infrastructure','infrastructure','facility','project','preventive maintenance','asset management','capacity expansion','redundancy','retrofit'],
  ['digital-access','broadband','internet','wi-fi','wifi','device','digital literacy','public computer','community technology','hotspot','digital inclusion'],
  ['regulatory','inspection','licensing','permit','regulation','compliance','internal controls','governance'],
  ['accessibility','accessibility','accessible design','assistive technology','accommodation','inclusive service'],
  ['cybersecurity','zero trust','multi factor authentication','endpoint detection','security awareness','backup and recovery','incident response']
];
const INTERVENTION_FAMILY_SEARCH_TERMS = Object.freeze({
  'public-safety':['violence interruption','focused deterrence','hot spot policing','community violence intervention','street outreach','credible messenger','safe passage','place-based crime prevention','environmental design','firearm violence prevention'],
  housing:['housing first','rapid rehousing','supportive housing','rental assistance','eviction prevention','shelter diversion','tenant legal assistance','community land trust','housing navigation'],
  'health-service':['community paramedicine','mobile crisis response','care navigation','community health worker','mobile clinic','overdose prevention','naloxone distribution','primary care access'],
  'food-access':['food voucher','community food hub','mobile market','community kitchen','school meal program','grocery subsidy'],
  'climate-resilience':['cooling centre','clean air shelter','home cooling','cooling infrastructure','shade infrastructure','tree canopy','smoke filtration','flood mitigation','stormwater management','home weatherization','evacuation support'],
  'mobility-safety':['bus priority','transit frequency','protected bike lane','pedestrian crossing','traffic calming','signal timing','road diet','safe routes'],
  employment:['job placement','career pathway','manager training','flexible scheduling','skills training','internal mobility','apprenticeship','reskilling','redeployment','worker transition','displacement support','wage subsidy'],
  'economic-support':['small business grant','small business loan','working capital support','business continuity support','business retention program','business advisory service','procurement support','utility assistance','energy bill assistance','cash transfer'],
  infrastructure:['preventive maintenance','asset management','capacity expansion','redundancy','retrofit','route optimization','warehouse automation'],
  'digital-access':['broadband subsidy','broadband voucher','internet access support','digital lifeline fund','device lending','device grant','public wi-fi','digital literacy training','community technology centre','computer access program'],
  regulatory:['permit modernization','one stop permitting','digital permitting','inspection reform','licensing reform','compliance automation','internal controls'],
  accessibility:['accessible design','assistive technology','accommodation program','inclusive customer service','inclusive service design'],
  cybersecurity:['zero trust','multi factor authentication','endpoint detection','security awareness training','backup and recovery','incident response']
});
function inferInterventionFamily(text) { const normalized = normalizeText(text).toLowerCase(); const matches = INTERVENTION_FAMILIES.filter(([, ...terms]) => terms.some(term => normalized.includes(term))); return matches.length ? matches.map(([family]) => family) : ['other']; }
const WORKSPACE_TAXONOMIES = Object.freeze({
  municipal: {
    safety: ['hot spot policing','focused deterrence','violence interruption','community violence intervention','street outreach','safe routes','traffic calming','automated speed enforcement'],
    housing: ['housing first','rapid rehousing','supportive housing','rental assistance','eviction prevention','shelter diversion','tenant legal assistance'],
    health: ['mobile crisis response','community paramedicine','primary care access','care navigation','overdose prevention','naloxone distribution','safe consumption services'],
    food: ['food voucher','community food hub','school meal program','mobile market','grocery subsidy'],
    climate: ['cooling centre','clean air shelter','home cooling','cooling infrastructure','shade infrastructure','tree canopy','smoke filtration','flood mitigation','stormwater management'],
    mobility: ['bus priority','transit frequency','protected bike lane','pedestrian crossing','traffic calming','signal timing'],
    economic: ['small business grant','small business loan','small business financing','working capital support','business continuity support','business retention program','business advisory service','procurement support','customer retention program','job training','wage subsidy','utility assistance','cash transfer','home energy assistance','energy bill assistance','utility bill assistance','energy efficiency retrofit','weatherization assistance'],
    employment: ['job placement','career pathway','job training','skills training','apprenticeship','reskilling','redeployment','worker transition','displacement support','wage subsidy'],
    governance: ['permit modernization','one stop permitting','digital permitting','inspection reform'],
    publicService: ['library service redesign','extended library hours','mobile library','self service library','queue management','appointment scheduling','service capacity expansion','digital inclusion program','broadband subsidy','internet subsidy','device lending','device grant','public wi-fi','public wifi','community technology centre','digital literacy training','computer access'],
    environment: ['noise mitigation','noise barrier','quiet pavement','water treatment','water quality monitoring','source water protection'],
    digitalAccess: ['digital inclusion','digital inclusion program','digital inclusion programme','broadband subsidy','broadband voucher','broadband voucher scheme','internet access support','digital lifeline fund','device lending','device grant','public wi-fi','public wifi','digital literacy training','community technology centre','computer access program']
  },
  business: {
    employment: ['retention program','career pathway','manager training','flexible scheduling','employee assistance','skills training','internal mobility'],
    economic: ['customer retention program','loyalty program','pricing intervention','working capital support','supplier diversification','inventory buffer'],
    safety: ['safety training','engineering control','near miss program','ergonomic assessment','safety incentive'],
    infrastructure: ['preventive maintenance','route optimization','warehouse automation','capacity expansion','redundancy'],
    accessibility: ['accessible design','assistive technology','accommodation program','inclusive customer service'],
    governance: ['compliance automation','internal controls','data governance program','procurement reform']
  },
  community: {
    safety: ['violence interruption','youth mentoring','credible messenger','community patrol','safe passage'],
    housing: ['housing first','rental assistance','tenant support','community land trust','housing navigation'],
    health: ['peer support','mobile clinic','community health worker','care navigation','mental health outreach'],
    food: ['community food hub','food voucher','mobile market','community kitchen','school meal program'],
    climate: ['cooling centre','clean air shelter','disaster preparedness training','evacuation support','home weatherization'],
    employment: ['job placement','bridge training','language training','apprenticeship support'],
    digitalAccess: ['digital inclusion','broadband voucher','internet access support','device lending','digital literacy']
  },
  research: {
    safety: ['hot spot policing','focused deterrence','violence interruption','community violence intervention'],
    housing: ['housing first','rapid rehousing','supportive housing','rental assistance','eviction prevention'],
    health: ['care navigation','community paramedicine','mobile crisis response','overdose prevention'],
    climate: ['cooling centre','clean air shelter','smoke filtration','home weatherization','flood mitigation'],
    mobility: ['traffic calming','bus priority','protected bike lane','pedestrian crossing'],
    employment: ['job training','wage subsidy','career pathway','reskilling program','worker displacement','displacement support','redeployment','worker transition'],
    digitalAccess: ['digital inclusion','broadband voucher','internet access support','device lending','digital literacy']
  },
  enterprise: {
    cybersecurity: ['zero trust','multi factor authentication','endpoint detection','security awareness training','backup and recovery'],
    governance: ['data governance program','master data management','privacy impact assessment','compliance automation','internal controls'],
    economic: ['process automation','workflow redesign','supplier diversification','capacity planning'],
    employment: ['workforce planning','manager training','employee assistance','skills training','internal mobility'],
    digitalAccess: ['digital inclusion','broadband voucher','internet access support','device lending','digital literacy'],
    accessibility: ['accessible design','assistive technology','service accommodation','inclusive service design'],
    infrastructure: ['preventive maintenance','asset management','capacity expansion','redundancy','incident response']
  }
});

function inferWorkspaceDomains(problem, workspace = 'municipal') {
  const p=normalizeText(problem).toLowerCase();
  const aliases={municipal:{safety:['crime','violence','injur','gun','opioid','overdose','road safety'],housing:['homeless','housing','eviction','rough sleeping'],health:['health','hospital','clinic','overcrowding','opioid','overdose','mental'],food:['food','hunger','nutrition'],climate:['heat','wildfire','smoke','flood','climate','disaster'],mobility:['transit','traffic','pedestrian','mobility','congestion'],economic:['business','cost','poverty','income','affordability','energy burden','utility burden','energy bill','utility bill','energy costs'],employment:['employment','worker','workforce','job','training','displacement','redeployment','worker transition'],governance:['permit','permitting','regulatory','compliance'],publicService:['library','libraries','library service','wait time','wait times','queue','queues','service access','customer service'],environment:['water contamination','water quality','noise pollution','noise','air pollution'],digitalAccess:['digital access','internet access','broadband','internet','wifi','wi-fi','digital divide','device access','computer access']},business:{employment:['employee','turnover','hiring','training','burnout','workforce'],economic:['business','churn','survival','supply','cost','pricing','delivery'],safety:['injury','workplace','safety'],infrastructure:['delivery','maintenance','capacity'],accessibility:['accessibility','disability','accessible'],governance:['compliance','procurement','governance']},community:{safety:['violence','safety','youth'],housing:['housing','homeless','rent','eviction'],health:['health','mental','healthcare'],food:['food','hunger'],climate:['heat','wildfire','smoke','disaster','evacuation'],employment:['employment','job','newcomer','training'],digitalAccess:['digital access','internet access','broadband','internet','wifi','wi-fi','digital divide','device access','computer access']},research:{safety:['crime','violence','injury','opioid'],digitalAccess:['digital access','internet access','broadband','internet','wifi','wi-fi','digital divide','device access','computer access'],housing:['homeless','housing','eviction'],health:['health','hospital','overdose','mental'],climate:['heat','wildfire','smoke','flood'],mobility:['transit','traffic','pedestrian','mobility'],employment:['employment','workforce','automation','worker displacement','displacement','redeployment','worker transition','labor','labour','job loss','job transition','workforce transition','occupational transition','career transition','worker retraining']},enterprise:{cybersecurity:['cybersecurity','cyber','security incident'],governance:['governance','data','compliance','regulatory'],economic:['procurement','cycle time','automation','workflow','supplier','capacity'],employment:['employee','burnout','workforce','training'],accessibility:['accessibility','accessible','disability'],digitalAccess:['digital access','internet access','broadband','internet','wifi','wi-fi','digital divide','device access','computer access'],infrastructure:['maintenance','infrastructure','asset','emergency response']}};
  const taxonomy=WORKSPACE_TAXONOMIES[workspace]||WORKSPACE_TAXONOMIES.municipal, selected=aliases[workspace]||aliases.municipal, domains=[];
  for(const [domain,keywords] of Object.entries(selected)) if(keywords.some(keyword=>p.includes(keyword))) domains.push(domain);
  for(const [domain,phrases] of Object.entries(taxonomy)) if(phrases.some(phrase=>p.includes(String(phrase).toLowerCase()))) domains.push(domain);
  return [...new Set([...domains,...discoveryDomains(p)])];
}
function taxonomyTerms(problem, workspace = 'municipal') {
  const domains = inferWorkspaceDomains(problem, workspace);
  const taxonomy = WORKSPACE_TAXONOMIES[workspace] || WORKSPACE_TAXONOMIES.municipal;
  return [...new Set(domains.flatMap(domain => taxonomy[domain] || []))];
}

function isActionableInterventionTitle(title,notes='',{allowDescriptionSignals=false}={}){
  const titleText=normalizeText(title).toLowerCase(), text=normalizeText(title+' '+notes).toLowerCase(), signalText=allowDescriptionSignals ? text : titleText;
  if(!titleText) return false;
  if(/\b(data|dataset|statistics|statistic|indicator|dashboard|observations?|temperature|fatalities|measurements?|counts?|trends?|profile|census|report|infographic|archive|map|mapping|inventory|directory|register|records?|catalogue|catalog|portal|database|series|timeseries|time series|list|index|metadata|results?|questionnaire|survey|feedback|findings?|evaluation|assessment results?)\b/i.test(titleText)) return false;
  if(/\b(provider list|service provider list|list of providers|recipient|recipients|grantee|grantees|awardee|awardees|beneficiar(?:y|ies)|participant list|participant registry)\b/i.test(titleText)) return false;
  const explicitProgram=/\b(program|programme|service|initiative|intervention|pilot|project|grant|fund|funding|subsidy|benefit|voucher|scheme|action plan|training|clinic|shelter|treatment|outreach|enforcement|patrol|assistance|support|response|reform|modernization|automation|navigation|assessment|governance)\b/i.test(signalText);
  const concreteAction=/\b(provide|expand|deploy|implement|operate|fund|subsidize|regulate|inspect|train|hire|staff|build|install|retrofit|convert|redesign|reduce|increase|improve|prevent|manage|maintain)\b/i.test(signalText);
  const concreteServiceObject=/\b(housing first|rapid rehousing|supportive housing|violence interruption|community violence intervention|hot spot policing|focused deterrence|street outreach|traffic calming|speed enforcement|protected (bike|bicycle) lane|pedestrian crossing|community paramedicine|mobile clinic|care navigation|food voucher|cooling (centre|center)|clean air shelter|wage subsidy|cash transfer|preventive maintenance|zero trust|multi factor authentication|endpoint detection|broadband subsidy|internet subsidy|device lending|device grant|public wi-fi|public wifi|digital inclusion|digital literacy|community technology (centre|center)|computer access program)\b/i.test(titleText);
  return explicitProgram || concreteAction || concreteServiceObject;
}
function buildDiscoveryQueries(problem,workspace='municipal'){
  const original=normalizeText(problem),normalized=original.toLowerCase(),queries=new Set([original]);
  const stripped=normalized.replace(/\b(reduce|increase|improve|prevent|address|mitigate|lower|decrease|support|expand|eliminate|evaluate|study)\b/g,' ').replace(/\s+/g,' ').trim();
  if(stripped&&stripped!==normalized) queries.add(stripped);
  const expected=new Set(expectedInterventionFamilies(original,workspace));
  const families=[...new Set([...expected,...inferInterventionFamily(normalized)])];
  const taxonomy=taxonomyTerms(original,workspace);
  // Reserve a taxonomy query for each relevant workspace domain before filling the
  // finite budget with broader family queries. This preserves problem-specific forms
  // (e.g. customer retention, zero trust, device lending) without starving the
  // intervention-family expansion that protects missing-option detection.
  const domains=inferWorkspaceDomains(original,workspace);
  const reservedTaxonomy=new Set();
  const workspaceTaxonomy=WORKSPACE_TAXONOMIES[workspace]||WORKSPACE_TAXONOMIES.municipal;
  for(const domain of domains){
    const first=workspaceTaxonomy[domain]?.[0];
    if(first){ queries.add(original+' '+first); reservedTaxonomy.add(first); }
  }
  for(const family of families){
    for(const term of (INTERVENTION_FAMILY_SEARCH_TERMS[family]||[])) queries.add(original+' '+term);
  }
  for(const term of taxonomy) if(!reservedTaxonomy.has(term)) queries.add(term);
  return [...queries].filter(Boolean).slice(0,18);
}
function classifyCkanRecord(row) { const title = normalizeText(row?.title || row?.name); const notes = normalizeText(row?.notes || row?.description); const tags = Array.isArray(row?.tags) ? row.tags.map(tag => normalizeText(tag?.display_name || tag?.name)).filter(Boolean).slice(0, 12) : []; const text = `${title} ${notes} ${tags.join(' ')}`.toLowerCase(); const negative = NON_INTERVENTION_TERMS.filter(term => title.toLowerCase().includes(term)); const positive = INTERVENTION_TERMS.filter(term => title.toLowerCase().includes(term)); const strongPositive = STRONG_INTERVENTION_TERMS.filter(term => title.toLowerCase().includes(term)); if (!title) return { accepted: false, reason: 'missing-title', positiveSignals: [], negativeSignals: [], families: [] }; if (negative.length > 0 && strongPositive.length === 0) return { accepted: false, reason: 'non-intervention-resource', positiveSignals: [], negativeSignals: negative, families: [] }; if (negative.length > 0 && /\b(report|dataset|census|budget|statistics|indicator|dashboard|survey|profile|information|records?)\b/i.test(title)) return { accepted: false, reason: 'non-intervention-resource', positiveSignals: positive, negativeSignals: negative, families: [] }; if (/\b(data|statistics|report|dashboard|information|records?)\b/i.test(title) && !/\b(program|programme|service|initiative|intervention|project|pilot)\b/i.test(title)) return { accepted: false, reason: 'non-intervention-resource', positiveSignals: positive, negativeSignals: negative, families: [] }; const actionablePositive = strongPositive.filter(term => !GENERIC_ACTION_TERMS.has(term)); if (positive.length === 0 || actionablePositive.length === 0 || !isActionableInterventionTitle(title)) return { accepted: false, reason: 'insufficient-intervention-signal', positiveSignals: [], negativeSignals: negative, families: [] }; return { accepted: true, reason: 'intervention-signal', positiveSignals: positive, negativeSignals: negative, families: inferInterventionFamily(text) }; }
function extractGovUkInterventionLeads(payload, source, problem, workspace = 'municipal') { const results = Array.isArray(payload?.results) ? payload.results : []; return results.map((row, index) => { const title = normalizeText(row?.title); const description = normalizeText(row?.description); if (workspace !== 'research' && /\bresearch (grant|grants|funding|project|study)\b/i.test(title)) return null; if (!title || !isActionableInterventionTitle(title, description, { allowDescriptionSignals: true })) return null; const candidate = { name: title, discoveryText: description }; if (!interventionMatchesProblem(problem, candidate, workspace)) return null; const canonicalName = normalizeInterventionName(title); if (!canonicalName) return null; return { id: `source:${source.sourceId}:${row?.link || index + 1}`, name: title, canonicalName, interventionFamily: inferInterventionFamily(title + ' ' + description), problemTags: [String(problem).toLowerCase()], domains: [source.domain], requiredEvidence: ['causal','implementation','cost','equity'], discoveryText: `${title} ${description}`.trim(), evidenceStatus: 'potential', discovery: { source: source.sourceId, sourceType: 'government-program-search', jurisdiction: source.jurisdiction, leadOnly: true, effectsImported: false, discoveryOnly: true, externalId: row?.link || null, classification: { basis: 'official-government-search-result', format: row?.format || null }, provenance: [{ sourceId: source.sourceId, sourceType: 'government-program-search', jurisdiction: source.jurisdiction, evidenceStatus: 'potential', externalId: row?.link || null }] } }; }).filter(Boolean); }
function extractCkanInterventionLeads(payload, source, problem, workspace = 'municipal') { const results = Array.isArray(payload?.result?.results) ? payload.result.results : []; return results.map((row, index) => { const title = normalizeText(row?.title || row?.name); if (workspace !== 'research' && /\bresearch (grant|grants|funding|project|study)\b/i.test(title)) return null; const classification = classifyCkanRecord(row);
    if (classification.accepted && !isActionableInterventionTitle(normalizeText(row?.title || row?.name))) return null; if (!classification.accepted) return null; if (!interventionMatchesProblem(problem, { name: normalizeText(row?.title || row?.name), discoveryText: normalizeText((row?.notes || row?.description || '') + ' ' + (Array.isArray(row?.tags) ? row.tags.map(tag => normalizeText(tag?.display_name || tag?.name)).join(' ') : '')) }, workspace)) return null; const id = row.id || row.name || `${source.sourceId}-${index + 1}`; const notes = normalizeText(row.notes || row.description); const tags = Array.isArray(row.tags) ? row.tags.map(tag => normalizeText(tag?.display_name || tag?.name)).filter(Boolean).slice(0, 12) : []; const family = classification.families; const canonicalName = normalizeInterventionName(title); return { id: `source:${source.sourceId}:${id}`, name: title, canonicalName, interventionFamily: family, problemTags: [String(problem).toLowerCase(), ...tags].filter(Boolean).slice(0, 13), domains: [source.domain], requiredEvidence: ['causal','implementation','cost','equity'], discoveryText: `${title} ${notes} ${tags.join(' ')}`, evidenceStatus: 'potential', discovery: { source: source.sourceId, sourceType: 'intervention-library', jurisdiction: source.jurisdiction, leadOnly: true, effectsImported: false, discoveryOnly: true, datasetId: row.id || row.name || null, classification: { basis: classification.reason, positiveSignals: classification.positiveSignals, negativeSignals: classification.negativeSignals, families: family }, provenance: [{ sourceId: source.sourceId, sourceType: 'intervention-library', jurisdiction: source.jurisdiction, evidenceStatus: 'potential' }] } }; }).filter(Boolean); }
function buildOpenAlexInterventionSearchUrl(source, query, { rows = 10 } = {}) {
  if (!source || source.sourceId !== 'openalex-works') throw new Error('unsupported-openalex-intervention-source');
  const url = new URL(source.url);
  url.searchParams.set('search', String(query || '').trim());
  url.searchParams.set('per-page', String(rows));
  return url.toString();
}
function openAlexAbstractText(row) {
  const index = row?.abstract_inverted_index;
  if (!index || typeof index !== 'object') return '';
  const tokens = [];
  for (const [term, positions] of Object.entries(index)) {
    if (!Array.isArray(positions)) continue;
    for (const position of positions) tokens.push([position, term]);
  }
  return tokens.sort((x, y) => x[0] - y[0]).map(item => item[1]).join(' ');
}
function extractOpenAlexInterventionLeads(payload, source, problem, workspace = 'municipal', query = '') {
  const rows = Array.isArray(payload?.results) ? payload.results : [];
  const taxonomy = taxonomyTerms(problem, workspace).map(term => String(term).toLowerCase()).filter(term => term.length > 4);
  const expectedFamilies = expectedInterventionFamilies(problem, workspace);
  const familyTerms = expectedFamilies.flatMap(family => INTERVENTION_FAMILY_SEARCH_TERMS[family] || []).map(term => String(term).toLowerCase());
  // Literature is evidence about interventions, not an intervention registry. Do not let
  // generic words such as "program", "service", or "intervention" manufacture candidates.
  const terms = [...new Set([...taxonomy, ...familyTerms])];
  const leads = [];
  const problemDomains = inferWorkspaceDomains(problem, workspace);
  for (const row of rows.slice(0, 20)) {
    const title = normalizeText(row?.display_name || '');
    if (!title) continue;
    const abstract = normalizeText(openAlexAbstractText(row));
    const searchable = (title + ' ' + abstract).trim();
    const lower = searchable.toLowerCase();
    const matched = terms.filter(term => lower.includes(term)).sort((x,y)=>y.length-x.length).slice(0, 3);
    const titleMatched = matched.filter(term => title.toLowerCase().includes(term));
    const explicitResearchCue = /\b(randomi[sz]ed|trial|quasi-experimental|difference-in-differences|evaluation|evaluated|implemented|implementation|assigned|intervention group|control group|pilot|program|programme|service|initiative|treatment)\b/i.test(searchable);
    const textDomains = [...new Set([...discoveryDomains(searchable), ...inferWorkspaceDomains(searchable, workspace)])];
    const domainRelevant = !problemDomains.length || problemDomains.some(domain => textDomains.includes(domain));
    const queryTerms = terms.filter(term => String(query || '').toLowerCase().includes(term)).slice(0, 4);
    // An abstract-only match is retained only when the paper actually describes an
    // implemented/evaluated intervention. This prevents study/report titles from becoming
    // intervention candidates merely because the abstract mentions a domain word.
    const fallbackTerms = matched.length ? [] : (domainRelevant && explicitResearchCue ? queryTerms : []);
    for (const term of [...new Set([...titleMatched, ...(titleMatched.length ? [] : fallbackTerms)])].slice(0, 3)) {
      const name = term.replace(/\b(programme|initiative|project|pilot)\b/g,'program').replace(/\b(centre|center)\b/g,'centre');
      const candidate = { name, discoveryText: searchable };
      if (!interventionMatchesProblem(problem, candidate, workspace)) continue;
      const canonicalName = normalizeInterventionName(name);
      if (!canonicalName) continue;
      const titleMatch = title.toLowerCase().includes(term);
      const queryMatch = String(query || '').toLowerCase().includes(term);
      leads.push({
        id: 'source:' + source.sourceId + ':' + (row.id || row.doi || canonicalName) + ':' + canonicalName,
        name, canonicalName, interventionFamily: inferInterventionFamily(name),
        problemTags: [String(problem).toLowerCase()], domains: [source.domain],
        requiredEvidence: ['causal','implementation','cost','equity'], discoveryText: searchable, evidenceStatus: 'potential',
        discovery: { source: source.sourceId, sourceType: 'intervention-literature', jurisdiction: source.jurisdiction, leadOnly: true, effectsImported: false, discoveryOnly: true, externalId: row.id || row.doi || null,
          extraction: titleMatch ? 'taxonomy-term-from-literature-title' : 'taxonomy-term-from-literature-abstract',
          provenance: [{ sourceId: source.sourceId, sourceType: 'intervention-literature', jurisdiction: source.jurisdiction, evidenceStatus: 'potential', externalId: row.id || row.doi || null, discoveryQuery: query || null, relevanceStatus: queryMatch ? 'query-match' : (titleMatch ? 'title-match' : 'abstract-match') }] }
      });
    }
  }
  return leads;
}
function canonicalSource(source) { return SOURCE_REGISTRY.find(candidate => candidate.sourceId === source?.sourceId) || null; }
function sourceMatchesJurisdiction(source, jurisdiction) { const canonical = canonicalSource(source); if (!canonical) return false; if (source.jurisdiction !== canonical.jurisdiction) return false; return !jurisdiction || canonical.jurisdiction === jurisdiction || canonical.jurisdiction === 'international'; }
function selectInterventionSources({ problem, jurisdiction = null } = {}) { const normalizedProblem = String(problem || '').toLowerCase(); const terms = normalizedProblem.split(/[^a-z0-9-]+/).filter(Boolean); const eligible = SOURCE_REGISTRY.filter(source => (CKAN_SOURCE_IDS.has(source.sourceId) || GOVUK_SOURCE_IDS.has(source.sourceId)) && sourceMatchesJurisdiction(source, jurisdiction)); const matched = eligible.filter(source => source.discoveryTags.some(tag => terms.includes(String(tag).toLowerCase()) || normalizedProblem.includes(String(tag).toLowerCase()))); return matched.length ? matched : eligible; }
function buildApplicabilityAudit({ problem, jurisdiction = null, suppliedSources = null } = {}) { const normalizedProblem = String(problem || '').toLowerCase(); const terms = normalizedProblem.split(/[^a-z0-9-]+/).filter(Boolean); const eligible = SOURCE_REGISTRY.filter(source => (CKAN_SOURCE_IDS.has(source.sourceId) || GOVUK_SOURCE_IDS.has(source.sourceId)) && sourceMatchesJurisdiction(source, jurisdiction)); const matched = eligible.filter(source => source.discoveryTags.some(tag => terms.includes(String(tag).toLowerCase()) || normalizedProblem.includes(String(tag).toLowerCase()))); const rejectedSuppliedSources = Array.isArray(suppliedSources) && jurisdiction ? suppliedSources.filter(source => !sourceMatchesJurisdiction(source, jurisdiction)).map(source => ({ sourceId: source.sourceId, jurisdiction: source.jurisdiction, canonicalJurisdiction: canonicalSource(source)?.jurisdiction || null, reason: canonicalSource(source) ? 'jurisdiction-mismatch' : 'unregistered-source' })) : []; return { problem, jurisdiction, eligibleSources: eligible.map(source => source.sourceId), matchedSources: matched.map(source => source.sourceId), rejectedSuppliedSources, fallbackUsed: matched.length === 0 && eligible.length > 0, decision: matched.length ? 'tag-matched' : (eligible.length ? 'broad-fallback' : 'no-eligible-source'), consideredCount: eligible.length }; }
function deduplicateInterventionLeads(leads = []) { const groups = new Map(); for (const lead of leads) { const key = lead.canonicalName || normalizeInterventionName(lead.name); if (!key) continue; const existing = groups.get(key); if (!existing) { groups.set(key, { ...lead, id: `universe:${sha256(key).slice(0, 16)}`, sourceIds: [lead.discovery?.source].filter(Boolean), sourceCount: 1, sourceProvenance: lead.discovery?.provenance || [], interventionFamily: lead.interventionFamily || ['other'] }); continue; } existing.sourceIds = [...new Set([...existing.sourceIds, lead.discovery?.source].filter(Boolean))]; existing.sourceCount = existing.sourceIds.length; existing.sourceProvenance = [...existing.sourceProvenance, ...(lead.discovery?.provenance || [])]; existing.interventionFamily = [...new Set([...existing.interventionFamily, ...(lead.interventionFamily || [])])]; existing.discovery = { ...existing.discovery, corroboratedBySources: existing.sourceIds.length, leadOnly: true, effectsImported: false, discoveryOnly: true }; } return [...groups.values()]; }
function buildInterventionUniverseAssessment({ problem, jurisdiction = null, sourceSearches = [], candidates = [], requestedSourceCount = 0 } = {}) { const usable = sourceSearches.filter(search => search.status !== 'search-failed'); const failed = sourceSearches.filter(search => search.status === 'search-failed'); const deduped = deduplicateInterventionLeads(candidates); const families = [...new Set(deduped.flatMap(candidate => candidate.interventionFamily || ['other']))]; const coverage = requestedSourceCount > 0 ? usable.length / requestedSourceCount : 0; const evidenceReadyLeads = deduped.filter(candidate => candidate.requiredEvidence?.length).length; return { problem, jurisdiction, sourcesAttempted: sourceSearches.length, usableSources: usable.length, failedSources: failed.length, sourceCoverageRatio: coverage, rawCandidateCount: candidates.length, uniqueCandidateCount: deduped.length, interventionFamilies: families, evidenceRequirementsAttached: evidenceReadyLeads === deduped.length, discoveryComplete: sourceSearches.length > 0 && failed.length === 0 && deduped.length > 0, recommendationEligible: false, stoppingReason: sourceSearches.length === 0 ? 'no-source-searches' : failed.length === sourceSearches.length ? 'all-sources-failed' : deduped.length === 0 ? 'no-intervention-candidates' : failed.length ? 'partial-source-failure' : 'candidate-universe-discovered' }; }
const DISCOVERY_DOMAIN_GROUPS = [['public-safety',['crime','violence','assault','robbery','homicide','policing','enforcement','patrol','public safety']],['housing',['housing','homeless','shelter','rent','rehousing','tenancy','eviction']],['food',['food','nutrition','grocery','meal','hunger','food insecurity','food access']],['energy',['energy','utility','electricity','weatherization','heating','cooling','fuel','power','energy burden']],['mobility',['transit','bus','rail','mobility','commute','signal','traffic','delay','congestion','travel time','pedestrian','crossing','sidewalk','bike','bicycle','road safety']],['health',['health','hospital','clinic','patient','treatment','care','emergency department','urgent care','overcrowding','patient flow','opioid','overdose','mortality']],['climate',['wildfire','smoke','air quality','filtration','clean air','fire season','heat','heatwave','extreme heat','cooling','temperature','flood','flooding','stormwater','drainage','resilience']],['employment',['employment','worker','job','workforce','training','displacement']],['economic',['poverty','low income','income','benefit','subsidy','grant','voucher','affordability','economic hardship']],['education',['youth','child','children','student','school','education']],['accessibility',['senior','seniors','aging','elderly','disability','accessible','accessibility','caregiver']],['environment',['environment','pollution','waste','recycling','emissions','air pollution']],['infrastructure',['infrastructure','road resurfacing','water billing','drainage','stormwater','utility billing']]];
const CROSS_DOMAIN_COMPATIBILITY = {'public-safety':new Set(['housing','health','mobility','food','climate']),housing:new Set(['public-safety','health','economic']),food:new Set(['housing','economic','health']),energy:new Set(['housing','health','climate','economic']),mobility:new Set(['public-safety']),health:new Set(['public-safety','housing','food','energy','climate']),climate:new Set(['health','mobility']),employment:new Set(['economic','housing']),economic:new Set(['housing','food','employment','health','energy']),education:new Set(['housing','employment','health']),accessibility:new Set(['housing','health','mobility']),environment:new Set(['climate','health']),infrastructure:new Set([])};
function discoveryDomains(text) { const normalized = normalizeText(text).toLowerCase(); return DISCOVERY_DOMAIN_GROUPS.filter(([,terms]) => terms.some(term => normalized.includes(term))).map(([name]) => name); }
function directConceptOverlap(problem, candidate) { const stop = new Set(['reduce','increase','improve','prevent','address','mitigate','lower','decrease','support','expand','eliminate','household','households','community','municipal','program','programme','project','service','initiative','intervention','pilot','public','local','city','cities','problem','issues','issue','and','the','for','of','to','in','on','from','with']); const tokens = value => normalizeText(value).toLowerCase().replace(/[^a-z0-9\s-]/g,' ').split(/\s+/).filter(token => token && token.length > 2 && !stop.has(token)).map(token => token.replace(/ies$/,'y').replace(/s$/,'')); const p = new Set(tokens(problem)); return tokens(candidate).some(token => p.has(token)); }
function interventionMatchesProblem(problem,candidate,workspace='municipal'){
  const problemText=normalizeText(problem),candidateText=normalizeText((candidate?.name||'')+' '+(candidate?.discoveryText||''));
  const problemLower=problemText.toLowerCase(),candidateLower=candidateText.toLowerCase();
  const problemDomains=inferWorkspaceDomains(problemText,workspace),candidateDomains=[...new Set([...discoveryDomains(candidateText),...inferWorkspaceDomains(candidateText,workspace)])];
  const taxonomy=taxonomyTerms(problemText,workspace).map(term=>term.toLowerCase()).filter(Boolean);
  // A candidate is relevant when it is explicitly named by the problem's workspace taxonomy,
  // shares meaningful problem concepts, or is in the same/cross-compatible intervention domain.
  // Generic words such as "program" or "service" never count as semantic evidence.
  const taxonomyHit=taxonomy.some(term=>candidateLower.includes(term));
  const problemTokens=evidenceConceptTokensForIntervention(problemLower);
  const candidateTokens=evidenceConceptTokensForIntervention(candidateLower);
  const tokenHit=problemTokens.some(token=>candidateTokens.includes(token));
  if(taxonomyHit) return true;
  // For genuinely novel problems with no inferred domain, retain an explicitly actionable
  // lead rather than silently converting an unknown problem into a zero-candidate result.
  // The lead remains discovery-only and cannot become recommendation-eligible without
  // candidate-specific evidence. Data/report records are already rejected upstream.
  if(!problemDomains.length) return tokenHit || directConceptOverlap(problemText,candidateText) || isActionableInterventionTitle(candidate?.name || '', candidate?.discoveryText || '');
  if(tokenHit) return true;
  if(!candidateDomains.length) return false;
  if(candidateDomains.some(domain=>problemDomains.includes(domain))) return true;
  return problemDomains.some(a=>candidateDomains.some(b=>CROSS_DOMAIN_COMPATIBILITY[a]?.has(b)));
}
function evidenceConceptTokensForIntervention(value){
  return [...new Set(normalizeText(value).toLowerCase().replace(/[^a-z0-9\s-]/g,' ').split(/\s+/)
    .filter(token=>token.length>3 && !['reduce','increase','improve','prevent','address','mitigate','lower','decrease','support','expand','eliminate','evaluate','study','effective','problem','access','service','program','programme','intervention','ways'].includes(token))
    .map(token=>token.replace(/ies$/,'y').replace(/s$/,'')))];
}
function expectedInterventionFamilies(problem,workspace='municipal'){
  const domains=inferWorkspaceDomains(problem,workspace),map={safety:['public-safety'],housing:['housing'],health:['health-service'],food:['food-access'],climate:['climate-resilience'],mobility:['mobility-safety'],economic:['economic-support'],employment:['employment'],governance:['regulatory'],publicService:['public-service'],environment:['environmental'],cybersecurity:['cybersecurity'],infrastructure:['infrastructure'],accessibility:['accessibility'],digitalAccess:['digital-access']};
  return [...new Set(domains.flatMap(domain=>map[domain]||[]))];
}
function discoveryCoverage(problem,workspace,candidates){
  const expected=expectedInterventionFamilies(problem,workspace),observed=[...new Set(candidates.flatMap(candidate=>candidate.interventionFamily||[]))],matched=expected.filter(family=>observed.includes(family));
  return {expectedFamilies:expected,observedFamilies:observed,missingFamilies:expected.filter(family=>!observed.includes(family)),coverageRatio:expected.length?matched.length/expected.length:1};
}
function missingFamilySearchQueries(problem,workspace,candidates=[]){
  const coverage=discoveryCoverage(problem,workspace,candidates),queries=[];
  for(const family of coverage.missingFamilies){
    for(const term of (INTERVENTION_FAMILY_SEARCH_TERMS[family]||[]).slice(0,3)) queries.push(`${normalizeText(problem)} ${term}`);
  }
  return [...new Set(queries)].slice(0,12);
}
async function discoverSourceDrivenInterventions({problem,jurisdiction=null,workspace='municipal',sources=null,fetchImpl,now=new Date(),rows=25}={}){
  const supplied=Array.isArray(sources)?sources:null,selected=(supplied?supplied.filter(source=>sourceMatchesJurisdiction(source,jurisdiction)).map(source=>({...canonicalSource(source),...source})):selectInterventionSources({problem,jurisdiction})).map(source=>canonicalSource(source)?({...canonicalSource(source),...source}):source).filter(Boolean).filter((source,index,all)=>all.findIndex(candidate=>candidate.sourceId===source.sourceId)===index);
  const applicability=buildApplicabilityAudit({problem,jurisdiction,suppliedSources:supplied}),sourceSearches=[],rawCandidates=[],queries=buildDiscoveryQueries(problem,workspace);
  for(const source of selected){
    const attempts=[],sourceCandidates=[];
    for(const query of queries){
      try{
        const sourceUrl = GOVUK_SOURCE_IDS.has(source.sourceId) ? buildGovUkSearchUrl(source, query, { rows }) : buildCkanSearchUrl(source, query, { rows }); const snapshot=await retrieve({...source,url:sourceUrl},{fetchImpl,now}),payload=parsePayload(snapshot.bytes,snapshot.retrieval.contentType);
        if(payload.format!=='json')throw new Error('source-driven-response-not-json');
        const leads=GOVUK_SOURCE_IDS.has(source.sourceId) ? extractGovUkInterventionLeads(payload.value,source,problem,workspace) : extractCkanInterventionLeads(payload.value,source,problem,workspace);rawCandidates.push(...leads);sourceCandidates.push(...leads);
        const interim=deduplicateInterventionLeads(rawCandidates),coverage=discoveryCoverage(problem,workspace,interim);
        attempts.push({query,status:leads.length?'candidates-found':'searched-empty',candidatesReturned:leads.length,recordsConsidered:Array.isArray(payload.value?.result?.results)?payload.value.result.results.length:0,provenance:snapshot.retrieval,failureReason:null,cumulativeUniqueCandidates:interim.length,expectedFamilies:coverage.expectedFamilies,observedFamilies:coverage.observedFamilies,missingFamilies:coverage.missingFamilies});
        if(interim.length>=3&&(coverage.expectedFamilies.length===0||coverage.coverageRatio>=0.5))break;
      }catch(error){attempts.push({query,status:'search-failed',candidatesReturned:0,recordsConsidered:0,provenance:null,failureReason:error?.message||'source-driven-search-failed',cumulativeUniqueCandidates:deduplicateInterventionLeads(rawCandidates).length});}
    }
    const failedAttempts=attempts.filter(a=>a.status==='search-failed').length,usableAttempts=attempts.filter(a=>a.status!=='search-failed').length,finalCandidates=deduplicateInterventionLeads(sourceCandidates),coverage=discoveryCoverage(problem,workspace,finalCandidates);
    sourceSearches.push({sourceId:source.sourceId,sourceType:'intervention-library',jurisdiction:source.jurisdiction,originalProblem:problem,queriesAttempted:attempts.length,failedQueryCount:failedAttempts,usableQueryCount:usableAttempts,status:finalCandidates.length?(coverage.missingFamilies.length?'candidate-universe-expanded-incomplete':'candidates-found'):(attempts.length&&failedAttempts===attempts.length?'search-failed':'searched-empty'),candidatesReturned:attempts.reduce((sum,a)=>sum+a.candidatesReturned,0),attempts,expectedFamilies:coverage.expectedFamilies,observedFamilies:coverage.observedFamilies,missingFamilies:coverage.missingFamilies,failureReason:finalCandidates.length?null:(failedAttempts===attempts.length?attempts[attempts.length-1]?.failureReason||null:null)});
  }
  let candidates=deduplicateInterventionLeads(rawCandidates),coverage=discoveryCoverage(problem,workspace,candidates);
  const allowLiteratureFallback = !Array.isArray(sources) || sources.some(source => source?.sourceId === 'openalex-works');
  if (allowLiteratureFallback && (candidates.length === 0 || (coverage.expectedFamilies.length && coverage.coverageRatio < 0.5))) {
    const literatureSource = SOURCE_REGISTRY.find(source => source.sourceId === 'openalex-works');
    if (literatureSource) {
      const literatureFamilies = expectedInterventionFamilies(problem, workspace).flatMap(family => INTERVENTION_FAMILY_SEARCH_TERMS[family] || []).slice(0, 8); const literatureTerms = [...taxonomyTerms(problem, workspace).slice(0, 4), ...literatureFamilies].map(term => `"${term}"`); const literatureQueries = [literatureTerms.length ? `"${problem}" OR ${literatureTerms.join(' OR ')}` : problem];
      const attempts = [];
      for (const query of literatureQueries) {
        try {
          const snapshot = await retrieve({...literatureSource, url:buildOpenAlexInterventionSearchUrl(literatureSource, query, { rows })},{fetchImpl,now});
          const payload = parsePayload(snapshot.bytes, snapshot.retrieval.contentType);
          if (payload.format !== 'json') throw new Error('intervention-literature-response-not-json');
          const leads = extractOpenAlexInterventionLeads(payload.value, literatureSource, problem, workspace, query);
          rawCandidates.push(...leads);
          const interim = deduplicateInterventionLeads(rawCandidates);
          const interimCoverage = discoveryCoverage(problem, workspace, interim);
          attempts.push({query,status:leads.length?'candidates-found':'searched-empty',candidatesReturned:leads.length,recordsConsidered:Array.isArray(payload.value?.results)?payload.value.results.length:0,provenance:snapshot.retrieval,failureReason:null,cumulativeUniqueCandidates:interim.length,expectedFamilies:interimCoverage.expectedFamilies,observedFamilies:interimCoverage.observedFamilies,missingFamilies:interimCoverage.missingFamilies});
          if (interim.length >= 3 && (!interimCoverage.expectedFamilies.length || interimCoverage.coverageRatio >= 0.5)) break;
        } catch (error) {
          attempts.push({query,status:'search-failed',candidatesReturned:0,recordsConsidered:0,provenance:null,failureReason:error?.message||'intervention-literature-search-failed',cumulativeUniqueCandidates:deduplicateInterventionLeads(rawCandidates).length});
        }
      }
      const literatureCandidates = deduplicateInterventionLeads(rawCandidates).filter(candidate => candidate.discovery?.source === 'openalex-works');
      const literatureCoverage = discoveryCoverage(problem, workspace, literatureCandidates);
      sourceSearches.push({sourceId:literatureSource.sourceId,sourceType:'intervention-literature',jurisdiction:literatureSource.jurisdiction,originalProblem:problem,queriesAttempted:attempts.length,failedQueryCount:attempts.filter(a=>a.status==='search-failed').length,usableQueryCount:attempts.filter(a=>a.status!=='search-failed').length,status:literatureCandidates.length?(literatureCoverage.missingFamilies.length?'candidate-universe-expanded-incomplete':'candidates-found'):(attempts.length&&attempts.every(a=>a.status==='search-failed')?'search-failed':'searched-empty'),candidatesReturned:attempts.reduce((sum,a)=>sum+a.candidatesReturned,0),attempts,expectedFamilies:literatureCoverage.expectedFamilies,observedFamilies:literatureCoverage.observedFamilies,missingFamilies:literatureCoverage.missingFamilies,failureReason:literatureCandidates.length?null:attempts.find(a=>a.status==='search-failed')?.failureReason||null});
      candidates=deduplicateInterventionLeads(rawCandidates);
      coverage=discoveryCoverage(problem,workspace,candidates);
    }
  }
  const universe=buildInterventionUniverseAssessment({problem,jurisdiction,sourceSearches,candidates:rawCandidates,requestedSourceCount:selected.length + sourceSearches.filter(search=>search.sourceId==='openalex-works').length});
  universe.expectedInterventionFamilies=coverage.expectedFamilies;universe.observedInterventionFamilies=coverage.observedFamilies;universe.missingInterventionFamilies=coverage.missingFamilies;universe.coverageRatio=coverage.coverageRatio;universe.discoveryExpandedWhenWeak=sourceSearches.some(s=>s.queriesAttempted>1);
  universe.stoppingReason=sourceSearches.length===0?'no-source-searches':sourceSearches.every(s=>s.status==='search-failed')?'all-sources-failed':candidates.length===0?'no-intervention-candidates':coverage.missingFamilies.length?'candidate-universe-incomplete':'candidate-universe-discovered';
  return {schemaVersion:'vidik.source-driven-intervention-discovery.v8',problem,workspace,sourcesSelected:selected.map(s=>s.sourceId),discoveryQueries:queries,sourceApplicability:applicability,sourceSearches,rawCandidateCount:rawCandidates.length,candidates,interventionUniverse:universe,discoveryHash:sha256({problem,workspace,sourceApplicability:applicability,discoveryQueries:queries,sourceSearches,candidates:candidates.map(candidate=>({id:candidate.id,name:candidate.name,canonicalName:candidate.canonicalName,interventionFamily:candidate.interventionFamily,discovery:candidate.discovery}))}),recommendationEligible:false};
}
module.exports = { CKAN_SOURCE_IDS, GOVUK_SOURCE_IDS, WORKSPACE_TAXONOMIES, inferWorkspaceDomains, taxonomyTerms, isActionableInterventionTitle, expectedInterventionFamilies, discoveryCoverage, INTERVENTION_FAMILIES, buildCkanSearchUrl, buildGovUkSearchUrl, buildDiscoveryQueries, normalizeInterventionName, inferInterventionFamily, classifyCkanRecord, extractCkanInterventionLeads, extractGovUkInterventionLeads, canonicalSource, sourceMatchesJurisdiction, selectInterventionSources, buildApplicabilityAudit, deduplicateInterventionLeads, buildInterventionUniverseAssessment, extractOpenAlexInterventionLeads, discoverSourceDrivenInterventions };
