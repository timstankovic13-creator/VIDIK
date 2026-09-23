'use strict';
const { retrieve, parsePayload, sha256 } = require('./data-acquisition');
const { SOURCE_REGISTRY } = require('./source-registry');
const CKAN_SOURCE_IDS = new Set(['ca-program-discovery','ca-ontario-program-discovery','us-open-data-program-discovery','uk-open-data-program-discovery','au-open-data-program-discovery','nz-open-data-program-discovery','ie-open-data-program-discovery']);
const GOVUK_SOURCE_IDS = new Set(['uk-gov-program-discovery']);
const DISCOVERY_MAX_QUERIES_PER_SOURCE = 18;
const DISCOVERY_MIN_UNIQUE_CANDIDATES = 5;
const DISCOVERY_TARGET_FAMILY_COVERAGE = 0.75;
function normalizeText(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function normalizeInterventionName(value) { return normalizeText(value).toLowerCase().replace(/\b(the|a|an)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\b(programme|initiative|project|pilot)\b/g, 'program').replace(/\b(centre|center)\b/g, 'centre').replace(/\s+/g, ' ').trim(); }
function buildGovUkSearchUrl(source, query, { rows = 10 } = {}) { if (!source?.url || !GOVUK_SOURCE_IDS.has(source.sourceId)) throw new Error('unsupported-govuk-intervention-source'); if (!String(query || '').trim()) throw new Error('source-driven-query-required'); if (!Number.isInteger(rows) || rows < 1 || rows > 100) throw new Error('source-driven-page-size-invalid'); const url = new URL(source.url); url.searchParams.set('q', String(query).trim()); url.searchParams.set('count', String(rows)); url.searchParams.set('fields', 'title,description,link,format'); return url.toString(); }
function buildCkanSearchUrl(source, problem, { rows = 25 } = {}) { if (!source?.url || !CKAN_SOURCE_IDS.has(source.sourceId)) throw new Error('unsupported-ckan-intervention-source'); if (!String(problem || '').trim()) throw new Error('source-driven-problem-required'); if (!Number.isInteger(rows) || rows < 1 || rows > 100) throw new Error('source-driven-page-size-invalid'); const url = new URL(source.url); url.searchParams.set('q', String(problem).trim()); url.searchParams.set('rows', String(rows)); return url.toString(); }
const NON_INTERVENTION_TERMS = ['dataset','data set','census','statistics','statistic','report','budget','indicator','information','dashboard','administrative records','records','open data','mapping data','survey','profile','monitoring data','raw data'];
const INTERVENTION_TERMS = ['program','programme','service','initiative','intervention','pilot','project','grant','funding','subsidy','benefit','shelter','clinic','treatment','outreach','prevention','enforcement','patrol','training','support service','fund','funding','scheme','action plan','housing first','rapid rehousing','transit','bus lane','bike lane','protected lane','infrastructure','facility','voucher','inspection','licensing','permit','regulation','cash transfer','food bank','cooling centre','cooling center','emergency response','staffing','capacity','broadband subsidy','internet subsidy','device lending','device grant','public wi-fi','public wifi','digital inclusion','digital literacy','community technology centre','community technology center','computer access','deterrence','policing','deployment','hot spot policing','focused deterrence','violence interruption','community violence intervention','hospital based violence intervention','hospital-based violence intervention','lighting','street lighting','vacant property remediation','blight remediation','youth employment','paid summer employment','cognitive behavioral','behavioral intervention','public space','environmental safety','risk reduction','secure storage','secure-storage'];
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
  ['cybersecurity','zero trust','multi factor authentication','endpoint detection','security awareness','backup and recovery','incident response'],
  ['public-service','library service redesign','extended library hours','mobile library','queue management','appointment scheduling','service capacity expansion','digital service access'],
  ['environmental','noise mitigation','noise barrier','quiet pavement','water treatment','source water protection','air pollution control','waste reduction'],
  ['energy','home energy assistance','energy bill assistance','utility bill assistance','weatherization assistance','energy efficiency retrofit'],
  ['education','school meal program','after-school program','student support','early childhood education','tutoring']
];
const INTERVENTION_FAMILY_SEARCH_TERMS = Object.freeze({
  'public-safety':['violence interruption','focused deterrence','hot spot policing','community violence intervention','street outreach','credible messenger','safe passage','place-based crime prevention','problem-oriented policing','hot spots policing','directed patrol','vacant lot greening','vacant land restoration','blighted vacant land restoration','vacant property remediation','blight remediation','intimate partner violence prevention','domestic violence prevention','reentry support','rehabilitation and re-entry','hospital violence intervention','peer support','peer navigator','environmental design','firearm violence prevention'],
  housing:['housing first','rapid rehousing','supportive housing','rental assistance','eviction prevention','shelter diversion','tenant legal assistance','community land trust','housing navigation'],
  'health-service':['community paramedicine','mobile crisis response','care navigation','community health worker','mobile clinic','overdose prevention','naloxone distribution','primary care access'],
  'food-access':['food voucher','community food hub','mobile market','community kitchen','school meal program','grocery subsidy'],
  'climate-resilience':['wildfire smoke mitigation','smoke filtration','clean air shelter','wildfire evacuation support','cooling centre','home cooling','cooling infrastructure','shade infrastructure','tree canopy','flood mitigation','stormwater management','stormwater retention','drainage improvement','urban drainage','home weatherization','evacuation support'],
  'mobility-safety':['bus priority','transit frequency','protected bike lane','pedestrian crossing','traffic calming','signal timing','road diet','safe routes'],
  employment:['job placement','career pathway','manager training','flexible scheduling','skills training','internal mobility','apprenticeship','reskilling','redeployment','worker transition','displacement support','wage subsidy'],
  'economic-support':['small business grant','small business loan','working capital support','business continuity support','business retention program','business advisory service','procurement support','utility assistance','energy bill assistance','cash transfer'],
  infrastructure:['preventive maintenance','asset management','capacity expansion','redundancy','retrofit','route optimization','warehouse automation','emergency response coordination','incident command','business continuity response'],
  'digital-access':['broadband subsidy','broadband voucher','internet access support','digital lifeline fund','device lending','device grant','public wi-fi','digital literacy training','community technology centre','computer access program'],
  regulatory:['permit modernization','one stop permitting','one-stop permitting','one-stop shop permitting','digital permitting','online permitting','permit streamlining','permit reform','permit process redesign','permit review modernization','construction permit streamlining','inspection reform','licensing reform','compliance automation','internal controls','compliance workflow automation','regulatory workflow redesign','regulatory case management'],
  accessibility:['accessible design','assistive technology','accommodation program','inclusive customer service','inclusive service design'],
  cybersecurity:['zero trust','multi factor authentication','endpoint detection','security awareness training','backup and recovery','incident response'],
  'public-service':['library service redesign','extended library hours','mobile library','queue management','appointment scheduling','service capacity expansion','digital service access'],
  environmental:['noise mitigation','noise barrier','quiet pavement','water treatment','source water protection','air pollution control','waste reduction'],
  energy:['home energy assistance','energy bill assistance','utility bill assistance','weatherization assistance','energy efficiency retrofit'],
  education:['school meal program','after-school program','student support','early childhood education','tutoring']
});
function inferInterventionFamily(text) { const normalized = normalizeText(text).toLowerCase(); const matches = INTERVENTION_FAMILIES.filter(([, ...terms]) => terms.some(term => normalized.includes(term))); return matches.length ? matches.map(([family]) => family) : ['other']; }
const LEGACY_INTERVENTION_CLASSES = Object.freeze({
  municipal: {
    safety: ['hot-spots policing','problem-oriented policing','focused deterrence','community violence intervention','place/environmental prevention','youth violence prevention','hospital-based violence intervention','victim services','justice-system diversion','police deployment/resource allocation','lighting/CCTV/place management'],
    housing: ['supportive housing','housing first','rapid rehousing','prevention/diversion','rent assistance','support services','new affordable housing supply','zoning/planning reform','shelter/service redesign'],
    health: ['prevention','harm reduction','treatment access','outreach','primary care expansion','mobile/community care','screening','public-health regulation','health-system coordination'],
    mobility: ['road engineering','traffic calming','speed management','automated enforcement','intersection redesign','active transportation','transit service','parking/pricing','education/enforcement'],
    climate: ['green infrastructure','drainage/stormwater upgrades','flood protection','land-use controls','building standards','early warning','emergency preparedness','water conservation','asset renewal'],
    environment: ['collection/service redesign','recycling/organics','pricing/incentives','regulation','monitoring/enforcement','infrastructure investment','public education'],
    infrastructure: ['maintenance','renewal','replacement','new capital','condition-based prioritization','demand management','shared infrastructure','procurement changes'],
    economic: ['skills/training','business support','procurement/local purchasing','tax/fee incentives','infrastructure','placemaking','partnerships','targeted grants'],
    food: ['income supports','food programs','service navigation','targeted subsidies','affordable services','partnerships','prevention'],
    governance: ['zoning reform','development standards','infrastructure sequencing','incentives','fees','public land strategy','planning process redesign']
  },
  business: {
    employment: ['retention program','career pathway','manager training','flexible scheduling','employee assistance','skills training','internal mobility'],
    economic: ['customer retention program','loyalty program','pricing intervention','price stabilization support','working capital support','supplier diversification','inventory buffer'],
    infrastructure: ['preventive maintenance','asset management','capacity expansion','redundancy','route optimization','warehouse automation','emergency response coordination','business continuity response'],
    safety: ['safety training','engineering control','near miss program','ergonomic assessment','safety incentive'],
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
    employment: ['worker transition','redeployment','displacement support','reskilling program','worker displacement','job training','wage subsidy','career pathway'],
    digitalAccess: ['digital inclusion','broadband subsidy','broadband voucher','internet access support','device lending','digital literacy']
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

function legacyClassTerms(problem, workspace = 'municipal') {
  const domains = inferWorkspaceDomains(problem, workspace);
  const classes = LEGACY_INTERVENTION_CLASSES[workspace] || LEGACY_INTERVENTION_CLASSES.municipal;
  return [...new Set(domains.flatMap(domain => classes[domain] || []))];
}

function interventionClassCoverage(problem, workspace, candidates = []) {
  const expected = legacyClassTerms(problem, workspace);
  const represented = expected.filter(className => {
    const tokens = className.toLowerCase().replace(/[^a-z0-9\s-]/g,' ').split(/\s+/).filter(t => t.length > 3);
    return candidates.some(candidate => {
      const haystack = normalizeText(candidate.name + ' ' + (candidate.discoveryText || '')).toLowerCase();
      const hits = tokens.filter(token => haystack.includes(token)).length;
      return tokens.length <= 2 ? hits >= 1 : hits >= Math.min(2, tokens.length);
    });
  });
  return {
    expectedClasses: expected,
    representedClasses: represented,
    missingClasses: expected.filter(className => !represented.includes(className)),
    coverageRatio: expected.length ? represented.length / expected.length : 1
  };
}

function missingInterventionClassSearchQueries(problem, workspace, candidates = []) {
  const coverage = interventionClassCoverage(problem, workspace, candidates);
  const profile = workspace === 'enterprise' ? enterpriseProblemProfile(problem) : null;
  const classes = profile ? Object.fromEntries([['profile', profile.classes]]) : (LEGACY_INTERVENTION_CLASSES[workspace] || LEGACY_INTERVENTION_CLASSES.municipal);
  const domains = inferWorkspaceDomains(problem, workspace);
  const compatibleDomains = domains.flatMap(domain => [...(CROSS_DOMAIN_COMPATIBILITY[domain] || [])]);
  const searchDomains = [...new Set([...domains, ...compatibleDomains])];
  const represented = new Set(coverage.representedClasses);
  const queues = profile
    ? [classes.profile.filter(className => !represented.has(className))]
    : searchDomains.map(domain => (classes[domain] || []).filter(className => !represented.has(className)));
  const selected = [];
  // Stratify missing-class searches across relevant domains so the finite budget
  // cannot be consumed by the first domain in the ontology. This is coverage
  // discovery, never candidate synthesis.
  for (let round = 0; round < Math.max(...queues.map(queue => queue.length), 0) && selected.length < 8; round++) {
    for (const queue of queues) {
      if (queue[round] && selected.length < 8) selected.push(queue[round]);
    }
  }
  return selected.map(className => normalizeText(problem + ' ' + className));
}

// Workspace-specific coverage vocabulary is deliberately separate from municipal taxonomy.
// It describes what each workspace can actually deploy/study/operate; it is not a candidate registry.
Object.assign(LEGACY_INTERVENTION_CLASSES.business, {
  digitalAccess: ['remote service enablement','customer self-service','accessible digital channel','device access support'],
  health: ['occupational health program','employee assistance','mental health support','workplace health screening']
});
Object.assign(LEGACY_INTERVENTION_CLASSES.community, {
  accessibility: ['accessible design','assistive technology','accommodation support','inclusive service design'],
  infrastructure: ['community facility upgrade','transport access','neighborhood infrastructure','resilience hub'],
  publicService: ['community service navigation','extended service hours','mobile service delivery','appointment access']
});
Object.assign(LEGACY_INTERVENTION_CLASSES.research, {
  governance: ['implementation governance','policy implementation','regulatory design','institutional coordination'],
  infrastructure: ['capital intervention','infrastructure retrofit','asset renewal','service capacity'],
  economic: ['income support','wage subsidy','business support','procurement intervention']
});
Object.assign(LEGACY_INTERVENTION_CLASSES.enterprise, {
  health: ['occupational health program','employee assistance','workplace health screening','mental health support'],
  publicService: ['service redesign','queue management','appointment scheduling','self-service channel'],
  climate: ['business continuity response','facility resilience','heat adaptation','flood preparedness']
});

const WORKSPACE_TAXONOMIES = Object.freeze({
  municipal: {
    safety: ['hot spot policing','focused deterrence','violence interruption','community violence intervention','street outreach','safe routes','traffic calming','automated speed enforcement'],
    housing: ['housing first','rapid rehousing','supportive housing','rental assistance','eviction prevention','shelter diversion','tenant legal assistance'],
    health: ['mobile crisis response','community paramedicine','primary care access','care navigation','overdose prevention','naloxone distribution','safe consumption services'],
    food: ['food voucher','community food hub','school meal program','mobile market','grocery subsidy'],
    climate: ['cooling centre','clean air shelter','home cooling','cooling infrastructure','shade infrastructure','tree canopy','smoke filtration','flood mitigation','stormwater management','stormwater retention','drainage improvement','urban drainage'],
    mobility: ['bus priority','transit frequency','protected bike lane','pedestrian crossing','traffic calming','signal timing'],
    economic: ['small business grant','small business loan','small business financing','working capital support','business continuity support','business retention program','business advisory service','procurement support','customer retention program','job training','wage subsidy','utility assistance','cash transfer','home energy assistance','energy bill assistance','utility bill assistance','energy efficiency retrofit','weatherization assistance'],
    employment: ['job placement','career pathway','job training','skills training','apprenticeship','reskilling','redeployment','worker transition','displacement support','wage subsidy'],
    governance: ['permit modernization','one stop permitting','one-stop permitting','one-stop shop permitting','digital permitting','online permitting','permit streamlining','permit reform','permit process redesign','permit review modernization','construction permit streamlining','inspection reform'],
    publicService: ['library service redesign','extended library hours','mobile library','self service library','queue management','appointment scheduling','service capacity expansion','digital inclusion program','broadband subsidy','internet subsidy','device lending','device grant','public wi-fi','public wifi','community technology centre','digital literacy training','computer access'],
    environment: ['noise mitigation','noise barrier','quiet pavement','water treatment','water quality monitoring','source water protection','air pollution control','waste reduction'],
    emergencyResponse: ['emergency response coordination','incident command','business continuity response','disaster response planning'],
    digitalAccess: ['digital inclusion','digital inclusion program','digital inclusion programme','broadband subsidy','broadband voucher','broadband voucher scheme','internet access support','digital lifeline fund','device lending','device grant','public wi-fi','public wifi','digital literacy training','community technology centre','computer access program']
  },
  business: {
    employment: ['retention program','career pathway','manager training','flexible scheduling','employee assistance','skills training','internal mobility'],
    economic: ['customer retention program','loyalty program','pricing intervention','price stabilization support','working capital support','supplier diversification','inventory buffer'],
    infrastructure: ['preventive maintenance','asset management','capacity expansion','redundancy','route optimization','warehouse automation','emergency response coordination','incident command','business continuity response'],
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
function enterpriseProblemProfile(problem) {
  const p = normalizeText(problem).toLowerCase();
  const profiles = [
    { match: /cybersecurity|security incident/, classes: ['zero trust','multi factor authentication','endpoint detection','security awareness training','backup and recovery','incident response'] },
    { match: /procurement.*cycle|cycle.*procurement|procurement cycle time/, classes: [
      'procurement process redesign','procurement workflow automation','e-procurement',
      'digital procurement','procurement modernization','purchase order automation',
      'process automation','workflow redesign','supplier diversification','capacity planning'
    ] },
    { match: /employee burnout|burnout/, classes: ['workforce planning','manager training','employee assistance','skills training','internal mobility'] },
    { match: /remote service delivery/, classes: ['remote service enablement','customer self-service','accessible digital channel','device access support'] },
    { match: /regulatory compliance delays|compliance delays|regulatory.*delays/, classes: ['compliance automation','internal controls','workflow redesign','process automation','digital permitting','permit modernization','inspection reform'] },
    { match: /data governance|data stewardship|data quality|master data/, classes: ['data governance program','master data management','data stewardship program','data quality management','data standards program','privacy impact assessment','compliance automation','internal controls'] },
    { match: /infrastructure maintenance backlog|maintenance backlog/, classes: ['preventive maintenance','asset management','capacity expansion','redundancy','incident response','maintenance management system','condition-based maintenance','predictive maintenance','asset renewal'] },
    { match: /emergency response coordination/, classes: ['emergency response coordination','incident command','business continuity response','emergency operations centre','mutual aid coordination'] },
    { match: /accessibility barriers.*digital services|digital services.*accessibility barriers/, classes: ['accessible design','assistive technology','service accommodation','inclusive service design'] },
    { match: /digital access gaps/, classes: ['digital inclusion','broadband voucher','internet access support','device lending','digital literacy'] }
  ];
  return profiles.find(profile => profile.match.test(p)) || null;
}

function isEnterpriseProfileAlignedTitle(title) {
  const normalizedTitle = normalizeInterventionName(title);
  if (!normalizedTitle) return false;
  const classes = new Set([
    ...Object.values(LEGACY_INTERVENTION_CLASSES.enterprise || {}).flat(),
    ...Object.values(WORKSPACE_TAXONOMIES.enterprise || {}).flat(),
    ...[
      'remote service enablement','customer self-service','accessible digital channel','device access support',
      'business continuity response','incident command','emergency response coordination'
    ]
  ]);
  return [...classes].some(className => normalizeInterventionName(className) === normalizedTitle);
}

function taxonomyTerms(problem, workspace = 'municipal') {
  if (workspace === 'enterprise') {
    const profile = enterpriseProblemProfile(problem);
    if (profile) return [...profile.classes];
  }
  const domains = inferWorkspaceDomains(problem, workspace);
  const taxonomy = WORKSPACE_TAXONOMIES[workspace] || WORKSPACE_TAXONOMIES.municipal;
  return [...new Set(domains.flatMap(domain => taxonomy[domain] || []))];
}

const NON_INTERVENTION_ARTIFACT_PATTERNS = [
  /\b^(audit|review|notice|letter|memorandum|memo|bulletin|technical document|technical guidance|applicant guide|user guide|handbook|framework|assessment|evaluation|study|research|survey|profile|inventory|directory|register)\b/i,
  /\b(?:provider directory|service provider directory|provider list|service provider list|list of providers)\b/i,
  /\b(?:a|an|the)\s+(?:review|assessment|evaluation|study|research|audit|analysis|survey)\s+(?:of|on|into)\b/i,
  /\b(?:service|services)\s+delivery\s+by\s+type\s+of\b/i,
  /\b(?:national|regional|annual|community|local)\s+assessment\s+of\b/i,
  /\bbarriers\s+to\b.*\b(?:aged|age)\s+\d+\s+years?\s+and\s+over\b/i,
  /\b(?:excellence|best practice|best-practice)\s+in\s+(?:service|customer service)\s+delivery\b/i,
  /\b(?:use cases?|use-case catalogue|use-case catalog)\b/i,
  /\b(funding allocations?|award allocations?|casework review|regulatory casework review|withdrawn .* notices?|technical document|applicant guide|implementation guide|annual report)\b/i,
  // Search indexes frequently return announcements, guidance, notices, funding pages,
  // and outcome/administrative pages that contain intervention language but are not
  // themselves executable interventions. Reject these before positive action signals.
  /^(?:office|department|government|minister|secretary|pm:)\b/i,
  /\b(?:announces?|announced|awards?|awarded|launches?|launched|calls? for|expressions? of interest|prospectus|privacy notice|how to comply|success rates?|percentage of referrals|programme deep dive)\b/i,
  /\b(?:grant|funding)\s+announcement\b/i,
  /\b(?:fund|funding|grant)\s+(?:for|to)\s+(?:local|regional|community)\s+(?:action|projects?|organisations?|organizations?)\b/i,
  /\b(?:funding|grant)\s+to\s+help\b/i,
  /^supporting vulnerable people\b/i,
  /\b(?:grant recipients?|funding recipients?|recipient list|awardees?|grantees?)\b/i,
  /\b(?:cost effectiveness|cost-effectiveness)\s+analysis\b/i,
  /^success profiles\b/i,
  /\b(?:success rates?|programme deep dive|assessment findings?|evaluation findings?)\b/i,
  /\b\b(data|dataset|statistical|statistics|indicator|dashboard|records?|catalogue|catalog|database|metadata|timeseries|time series|case study|case-study)\b/i,
  /\b(?:letter|memorandum|memo|notice)\s+(?:from|to)\b/i,
  /\b(?:program|programme|service)\s+management\s+(?:committee|board|meeting)\b/i,
  /\bpre-?application\s+advice\b/i,
  /\b(?:project|programme|program)\s+area\b/i
];
function isActionableInterventionTitle(title,notes='',{allowDescriptionSignals=false}={}){
  const titleText=normalizeText(title).toLowerCase(), text=normalizeText(title+' '+notes).toLowerCase(), signalText=allowDescriptionSignals ? text : titleText;
  if(!titleText) return false;
  // Exact workspace-profile intervention classes are executable interventions even when
  // a shared noun (for example "data") would otherwise trip the artifact guard.
  if (isEnterpriseProfileAlignedTitle(titleText)) return true;
  if(NON_INTERVENTION_ARTIFACT_PATTERNS.some(pattern=>pattern.test(titleText))) return false;
  if(/\b(data|dataset|statistics|statistic|indicator|dashboard|observations?|temperature|fatalities|measurements?|counts?|trends?|profile|census|report|infographic|archive|map|mapping|inventory|directory|register|records?|catalogue|catalog|portal|database|series|timeseries|time series|list|index|metadata|results?|questionnaire|survey|feedback|findings?|evaluation|assessment results?)\b/i.test(titleText)) return false;
  if(/\b(provider list|service provider list|list of providers|recipient|recipients|grantee|grantees|awardee|awardees|beneficiar(?:y|ies)|participant list|participant registry)\b/i.test(titleText)) return false;
  const explicitProgram=/\b(program|programme|initiative|intervention|pilot|project|grant|fund|funding|subsidy|benefit|voucher|scheme|action plan|training|clinic|shelter|treatment|outreach|enforcement|patrol|assistance|support|response|reform|modernization|automation|navigation|governance|service)\b/i.test(signalText);
  const concreteAction=/\b(provide|expand|deploy|implement|operate|fund|subsidize|regulate|inspect|train|hire|staff|build|install|retrofit|convert|redesign|reduce|increase|improve|prevent|manage|maintain|deliver|administer)\b/i.test(signalText);
  const concreteServiceObject=/\b(food bank|food pantry|community food hub|stormwater retention|drainage improvement|urban drainage|flood mitigation|housing first|rapid rehousing|supportive housing|violence interruption|community violence intervention|hot spot policing|hot spots policing|problem-oriented policing|directed patrol|focused deterrence|street outreach|traffic calming|speed enforcement|protected (bike|bicycle) lane|pedestrian crossing|road safety infrastructure project|traffic infrastructure project|stormwater infrastructure project|community paramedicine|primary care clinic|community health worker|mobile clinic|care navigation|food voucher|cooling (centre|center)|shade infrastructure|tree canopy|smoke filtration|wildfire smoke mitigation|wildfire evacuation support|clean air shelter|wage subsidy|cash transfer|preventive maintenance|zero trust|multi factor authentication|endpoint detection|broadband subsidy|internet subsidy|device lending|device grant|public wi-fi|public wifi|digital inclusion|digital literacy|community technology (centre|center)|computer access program|e-procurement|digital procurement|procurement workflow automation|procurement process redesign|purchase order automation|digital permitting|online permitting|permit streamlining|public space|environmental safety|street lighting|vacant property remediation|blight remediation|built environment|vacant lot greening|lot greening|vacant land restoration|blighted vacant land restoration|reentry support|rehabilitation and re-entry|hospital violence intervention|intimate partner violence prevention|domestic violence prevention)\b/i.test(titleText);
  // Generic services are filtered by the positive intervention signals below; do not let the word service alone reject concrete interventions.

  return explicitProgram || concreteAction || concreteServiceObject;
}
const DISCOVERY_SYNONYM_GROUPS = Object.freeze({
  municipal: [
    [['reduce','lower','decrease','curb','cut','mitigate'], ['crime','violent crime','serious violence','community violence','public safety']],
    [['homelessness','rough sleeping','housing insecurity','housing instability'], ['reduce']],
    [['food insecurity','food insecurity and hunger','limited food access','food access gaps'], ['reduce']],
    [['emergency department overcrowding','emergency department crowding','hospital overcrowding','ED crowding'], ['reduce']],
    [['traffic congestion','congestion','traffic delays','travel delays'], ['reduce']],
    [['construction permitting delays','permit delays','permitting delays','planning approval delays'], ['reduce']],
    [['energy burden','energy affordability','utility burden','energy costs'], ['reduce']],
    [['opioid overdose deaths','overdose deaths','opioid mortality','fatal opioid overdoses'], ['reduce']],
    [['affordable childcare','childcare affordability','child care access','early childhood care access'], ['improve','increase']],
    [['pedestrian injuries','pedestrian crashes','walking injuries','road user injuries'], ['reduce']],
    [['extreme heat illness','heat-related illness','heat illness','heat health impacts'], ['reduce']],
    [['urban flooding','urban flood','flooding','flood risk','stormwater','drainage'], ['reduce','mitigate','manage']],
    [['wildfire smoke exposure','bushfire smoke exposure','smoke exposure','wildfire smoke impacts'], ['reduce']],
    [['violent crime','serious violence','community violence','crime'], ['reduce']],
  ],
  business: [
    [['customer churn','customer attrition','customer loss','client attrition'], ['reduce']],
    [['employee turnover','staff turnover','workforce attrition','employee attrition'], ['reduce']],
    [['workplace injuries','occupational injuries','work-related injuries','workplace accidents'], ['reduce']],
    [['supply chain disruption','supply chain interruptions','supply disruption','logistics disruption'], ['reduce']],
    [['energy costs','energy expenses','utility costs','energy expenditure'], ['reduce']],
    [['hiring success','recruitment success','hiring outcomes','recruitment effectiveness'], ['improve','increase']],
    [['delivery delays','delivery lead times','fulfillment delays','shipping delays'], ['reduce']],
    [['employee training completion','training completion','workforce training completion','learning completion'], ['increase','improve']],
    [['accessibility for customers with disabilities','accessible customer service','disability access','customer accessibility'], ['improve','increase']],
    [['small business survival','small business continuity','business survival','business continuity'], ['improve','increase']],
  ],
  community: [
    [['social isolation among seniors','senior social isolation','social isolation in older adults','loneliness among seniors'], ['reduce']],
    [['newcomer employment','immigrant employment','newcomer workforce integration','employment integration'], ['improve','increase']],
    [['affordable housing access','housing affordability','access to affordable housing','affordable housing availability'], ['improve','increase']],
    [['youth violence','youth offending','youth involvement in violence','youth safety'], ['reduce','prevent']],
    [['disaster preparedness','emergency preparedness','community disaster readiness','disaster readiness'], ['improve','increase']],
    [['rural healthcare access','rural health access','rural healthcare availability','access to rural health services'], ['improve','increase']],
    [['wildfire evacuation barriers','bushfire evacuation barriers','evacuation access','evacuation constraints'], ['reduce','remove']],
  ],
  research: [
    [['homelessness','rough sleeping','housing insecurity','housing instability'], ['study','evaluate']],
    [['hospital waiting times','hospital wait times','waiting times for hospital care','care delays'], ['study','evaluate']],
    [['food insecurity','hunger','food access gaps','limited food access'], ['study','evaluate']],
    [['heat-health interventions','heat health interventions','heat-related health interventions','heat illness prevention'], ['study','evaluate']],
    [['pedestrian injuries','pedestrian crashes','walking injuries','road user injuries'], ['study','evaluate']],
    [['workforce displacement from automation','automation-related job displacement','technology-driven displacement','worker displacement'], ['study','evaluate']],
    [['opioid overdose prevention','overdose prevention','opioid mortality prevention','overdose harm reduction'], ['study','evaluate']],
    [['energy poverty','energy insecurity','fuel poverty','energy affordability'], ['study','evaluate']],
    [['wildfire smoke mitigation','bushfire smoke mitigation','smoke exposure mitigation','wildfire smoke reduction'], ['study','evaluate']],
    [['rural mobility','rural transportation access','rural transport access','rural mobility barriers'], ['study','evaluate']],
  ],
  enterprise: [
    [['digital access gaps','digital divide','digital exclusion','digital access barriers'], ['reduce','close','narrow']],
    [['cybersecurity incident risk','cyber incident risk','security incident risk','cybersecurity exposure'], ['reduce','lower']],
    [['procurement cycle time','procurement lead time','purchasing cycle time','procurement delays'], ['reduce','shorten']],
    [['employee burnout','workforce burnout','staff burnout','occupational burnout'], ['reduce','prevent']],
    [['remote service delivery','remote service access','digital service delivery','remote service provision'], ['improve','increase']],
    [['accessibility barriers in digital services','digital accessibility barriers','accessible digital services','digital inclusion barriers'], ['reduce','remove']],
    [['regulatory compliance delays','compliance delays','regulatory processing delays','regulatory approval delays'], ['reduce','shorten']],
    [['data governance','information governance','data management governance','data stewardship'], ['improve','strengthen']],
    [['infrastructure maintenance backlog','asset maintenance backlog','deferred maintenance','maintenance backlog'], ['reduce','clear']],
    [['emergency response coordination','emergency coordination','incident response coordination','disaster response coordination'], ['improve','strengthen']],
  ]
});

// Narrow recall packs for concrete no-candidate failures observed in the 60-case battery.
// Retrieval anchors only; normal source/actionability/relevance gates remain authoritative.
const DISCOVERY_RECALL_PACKS = Object.freeze([
  { workspace: 'municipal', match: /violent crime|serious violence|community violence/i, terms: ['focused deterrence','community violence intervention','violence interruption','hot spot policing','hospital-based violence intervention','street outreach','problem-oriented policing','vacant property remediation','vacant lot greening','youth violence prevention','credible messenger','firearm violence prevention'] },
  { workspace: 'municipal', match: /critical infrastructure maintenance backlog|infrastructure maintenance backlog|maintenance backlog/i, terms: ['preventive maintenance','asset management','condition-based maintenance','asset renewal','infrastructure renewal','infrastructure replacement','critical infrastructure repair','maintenance prioritization','lifecycle asset management'] },
  { workspace: 'municipal', match: /wildfire smoke exposure|bushfire smoke exposure|smoke exposure/i, terms: ['wildfire smoke mitigation','smoke filtration','clean air shelter','wildfire evacuation support','cooling centre','home cooling'] },
  { workspace: 'municipal', match: /worker displacement|workforce displacement|job displacement|displaced workers/i, terms: ['worker transition','redeployment','displacement support','reskilling','job placement','wage subsidy'] },
  { workspace: 'municipal', match: /food price volatility|food price instability|volatile food prices/i, terms: ['food price stabilization','food price support','food market stabilization','food price subsidy','food supply support','food affordability program'] },
  { workspace: 'business', match: /small business survival|business survival|business continuity/i, terms: ['small business grant','small business loan','working capital support','business continuity support','business retention program','business advisory service'] },
  { workspace: 'business', match: /employee turnover|staff turnover|workforce attrition|employee attrition/i, terms: ['retention program','manager training','flexible scheduling','employee assistance','career pathway','internal mobility'] },
  { workspace: 'business', match: /workplace injuries|occupational injuries|work-related injuries|workplace accidents/i, terms: ['safety training','engineering control','ergonomic assessment','occupational health program','near miss program','safety incentive'] },
  { workspace: 'community', match: /heat exposure|extreme heat exposure/i, terms: ['cooling centre','clean air shelter','home cooling','shade infrastructure','tree canopy','cooling infrastructure'] },
  { workspace: 'community', match: /wildfire evacuation barriers|bushfire evacuation barriers|evacuation constraints|evacuation access/i, terms: ['wildfire evacuation support','evacuation support','evacuation assistance','safe passage','emergency transportation','community evacuation planning'] },
  { workspace: 'research', match: /food insecurity|hunger|food access gaps/i, terms: ['food voucher','community food hub','mobile market','community kitchen','school meal program','grocery subsidy'] },
  { workspace: 'research', match: /wildfire smoke mitigation|bushfire smoke mitigation|smoke exposure mitigation/i, terms: ['wildfire smoke mitigation','smoke filtration','clean air shelter','home weatherization','wildfire evacuation support','clean air intervention'] },
  { workspace: 'enterprise', match: /cybersecurity incident risk|cyber incident risk|security incident risk|cybersecurity exposure/i, terms: ['zero trust','multi factor authentication','endpoint detection','security awareness training','backup and recovery','incident response'] },
  { workspace: 'enterprise', match: /procurement cycle time|procurement lead time|purchasing cycle time|procurement delays/i, terms: ['procurement process redesign','procurement workflow automation','e-procurement','digital procurement','procurement modernization','purchase order automation'] },
  { workspace: 'enterprise', match: /data governance|information governance|data stewardship|data quality/i, terms: ['data governance program','master data management','data stewardship program','data quality management','data standards program','privacy impact assessment'] }
]);
function discoveryRecallTerms(problem, workspace) {
  const normalized = normalizeText(problem);
  return DISCOVERY_RECALL_PACKS.filter(pack => pack.workspace === workspace && pack.match.test(normalized)).flatMap(pack => pack.terms);
}

function expandDiscoveryVocabulary(problem, workspace = 'municipal', maxVariants = 8) {
  const original = normalizeText(problem);
  const normalized = original.toLowerCase();
  const groups = DISCOVERY_SYNONYM_GROUPS[workspace] || DISCOVERY_SYNONYM_GROUPS.municipal;
  const variants = new Set([original]);
  const verbs = new Set(['reduce','increase','improve','prevent','study','evaluate','lower','decrease','curb','cut','mitigate','close','narrow','remove','shorten','clear','strengthen']);
  for (const [first, second] of groups) {
    const firstVerb = first.find(value => verbs.has(value) && normalized.includes(value));
    const secondVerb = second.find(value => verbs.has(value) && normalized.includes(value));
    const nounList = firstVerb ? second : secondVerb ? first : (first.some(value => normalized.includes(value)) ? first : second);
    const noun = nounList.filter(value => !verbs.has(value) && normalized.includes(value)).sort((a, b) => b.length - a.length)[0];
    if (noun) {
      for (const replacement of nounList) {
        if (replacement === noun || verbs.has(replacement)) continue;
        variants.add(normalized.replace(noun, replacement));
        if (variants.size >= maxVariants) break;
      }
    }
    const verb = firstVerb || secondVerb;
    const verbList = firstVerb ? first : secondVerb ? second : null;
    if (verb && verbList) {
      for (const replacement of verbList) {
        if (replacement === verb) continue;
        variants.add(normalized.replace(verb, replacement));
        if (variants.size >= maxVariants) break;
      }
    }
    if (variants.size >= maxVariants) break;
  }
  return [...variants].slice(0, maxVariants);
}

function evidenceConceptTokensForIntervention(value){
  return [...new Set(normalizeText(value).toLowerCase().replace(/[^a-z0-9\s-]/g,' ').split(/\s+/)
    .filter(token=>token.length>3 && !['reduce','increase','improve','prevent','address','mitigate','lower','decrease','support','expand','eliminate','evaluate','study','effective','problem','access','service','program','programme','intervention','ways','measure','measures','local','delay','delays','audit','governance','response','delivery','data','customer','customers','digital'].includes(token))
    .map(token=>token.replace(/ies$/,'y').replace(/s$/,'')))];
}
function expectedInterventionFamilies(problem,workspace='municipal'){
  const domains=inferWorkspaceDomains(problem,workspace),map={safety:['public-safety'],housing:['housing'],health:['health-service'],food:['food-access'],climate:['climate-resilience'],mobility:['mobility-safety'],economic:['economic-support'],employment:['employment'],governance:['regulatory'],publicService:['public-service'],environment:['environmental'],cybersecurity:['cybersecurity'],infrastructure:['infrastructure'],accessibility:['accessibility'],digitalAccess:['digital-access'],energy:['energy'],education:['education'],emergencyResponse:['infrastructure']};
  return [...new Set(domains.flatMap(domain=>map[domain]||[]))];
}
function discoveryCoverage(problem,workspace,candidates){
  const expected=expectedInterventionFamilies(problem,workspace),observed=[...new Set(candidates.flatMap(candidate=>candidate.interventionFamily||[]))],matched=expected.filter(family=>observed.includes(family));
  return {expectedFamilies:expected,observedFamilies:observed,missingFamilies:expected.filter(family=>!observed.includes(family)),coverageRatio:expected.length?matched.length/expected.length:1};
}
function classifyDiscoveryQuery(query, problem, workspace='municipal') {
  const q=normalizeText(query).toLowerCase(), p=normalizeText(problem).toLowerCase();
  if(q===p) return 'original';
  if(q.includes('systematic review')||q.includes('meta analysis')) return 'evidence-index';
  const families=expectedInterventionFamilies(problem,workspace);
  if(families.some(f => (INTERVENTION_FAMILY_SEARCH_TERMS[f]||[]).some(t=>q.endsWith(' '+t)))) return 'family-expansion';
  if(legacyClassTerms(problem, workspace).some(t => q.endsWith(' ' + t.toLowerCase()))) return 'legacy-class-expansion';
  const taxonomy=(WORKSPACE_TAXONOMIES[workspace]||{});
  if(Object.values(taxonomy).flat().some(t=>q.endsWith(' '+t))) return 'workspace-taxonomy';
  return 'vocabulary-expansion';
}

function buildDiscoveryQueries(problem,workspace='municipal'){
  const original=normalizeText(problem),normalized=original.toLowerCase(),queries=new Set([original]);
  // Put observed blocked-case recall anchors ahead of broad synonym expansion. The source
  // query budget is finite, so a correct recall lane must actually reach the upstream source
  // instead of being crowded out by generic vocabulary variants. These remain retrieval
  // anchors only; external source evidence and the normal extraction/relevance gates decide
  // whether a candidate exists.
  for (const term of discoveryRecallTerms(problem, workspace)) {
    // CKAN/GOV.UK full-text endpoints can require all query tokens to co-occur. A
    // recall anchor therefore needs its own source query; the normal candidate
    // relevance gate still prevents an anchor from becoming an intervention by
    // itself. Keep the problem+term form as a secondary contextual query.
    queries.add(term);
    queries.add(original + ' ' + term);
  }
  // Expand the user's problem vocabulary before family/taxonomy expansion. These are
  // bounded alternate phrasings, not evidence: they only improve retrieval recall.
  for (const variant of expandDiscoveryVocabulary(original, workspace, 8)) queries.add(variant);
  const stripped=normalized.replace(/\b(reduce|increase|improve|prevent|address|mitigate|lower|decrease|support|expand|eliminate|evaluate|study)\b/g,' ').replace(/\s+/g,' ').trim();
  if(stripped&&stripped!==normalized) queries.add(stripped);
  const expected=new Set(expectedInterventionFamilies(original,workspace));
  const families=[...new Set([...expected,...inferInterventionFamily(normalized)])];
  const taxonomy=taxonomyTerms(original,workspace);

  // The class ontology is a coverage guard, so it gets a deliberate slice of the
  // finite retrieval budget rather than being appended after family/taxonomy terms
  // and silently truncated. These are search anchors only; candidates still have to
  // come from an external source and pass the normal intervention filters.
  const classQueries=missingInterventionClassSearchQueries(problem,workspace,[])
    .slice(0,6);
  for(const term of classQueries) queries.add(term);

  // Keep family discovery bounded but guaranteed a meaningful share of the budget.
  // This preserves problem-specific intervention families while preventing one large
  // family vocabulary from crowding out the recovered class ontology.
  let familyQueriesAdded=0;
  const familyQueryBudget=6;
  for(const family of families){
    const problemTokens = normalized.split(/[^a-z0-9]+/).filter(token => token.length > 2 && !['reduce','increase','improve','prevent','address','mitigate','lower','decrease','support','expand','eliminate','evaluate','study'].includes(token));
    const familyTerms = [...(INTERVENTION_FAMILY_SEARCH_TERMS[family] || [])].sort((a,b) => {
      const score = term => problemTokens.reduce((sum, token) => sum + (String(term).toLowerCase().includes(token) ? 1 : 0), 0);
      return score(b) - score(a);
    });
    for(const term of familyTerms){
      if(familyQueriesAdded>=familyQueryBudget) break;
      const query=original+' '+term;
      if(!queries.has(query)){ queries.add(query); familyQueriesAdded++; }
    }
    if(familyQueriesAdded>=familyQueryBudget) break;
  }

  // Reserve a taxonomy query for each relevant workspace domain, then use any
  // remaining budget for additional workspace-specific terms.
  const domains=inferWorkspaceDomains(original,workspace);
  const reservedTaxonomy=new Set();
  const workspaceTaxonomy=WORKSPACE_TAXONOMIES[workspace]||WORKSPACE_TAXONOMIES.municipal;
  for(const domain of domains){
    const first=workspaceTaxonomy[domain]?.[0];
    if(first){ queries.add(original+' '+first); reservedTaxonomy.add(first); }
  }
  for(const term of taxonomy) if(!reservedTaxonomy.has(term)) queries.add(term);
  return [...queries].filter(Boolean).slice(0,DISCOVERY_MAX_QUERIES_PER_SOURCE);
}
function extractConcreteInterventionFromDescription(problem, workspace, description = '') {
  const text = normalizeText(description).toLowerCase();
  if (!text) return [];
  const extracted = [];
  // Evidence records often describe the intervention by mechanism rather than using
  // the exact intervention label. These bounded co-occurrence rules recover the
  // executable intervention without treating the paper/report itself as the option.
  if (/\bvacant\s+(?:and\s+)?blighted?\s+(?:urban\s+)?land\b|\bvacant\s+lots?\b/i.test(text) && /\b(greening|green(?:ed|ing)?|clean(?:ing|ed)?|plant(?:ing|ed)?|restor(?:e|ation|ed)|remediat(?:e|ion|ed)|maintain(?:ed|ance)?)\b/i.test(text)) extracted.push('vacant lot greening');
  if (/\bblighted\s+vacant\s+land\b/i.test(text) && /\b(restor(?:e|ation|ed)|remediat(?:e|ion|ed)|treat(?:ment|ed)?)\b/i.test(text)) extracted.push('vacant land restoration');
  if (/\bhospital(?:-based|\s+based)?\b/i.test(text) && /\bviolence\b/i.test(text) && /\b(peer[- ]support|peer\s+support|navigator)\b/i.test(text)) extracted.push('hospital-based violence intervention with peer support navigators');
  else if (/\bhospital(?:-based|\s+based)?\b/i.test(text) && /\bviolence\b/i.test(text) && /\bviolence\s+intervention\b/i.test(text)) extracted.push('hospital-based violence intervention');
  const terms = [...new Set([...taxonomyTerms(problem, workspace), ...expectedInterventionFamilies(problem, workspace).flatMap(family => INTERVENTION_FAMILY_SEARCH_TERMS[family] || [])])].sort((a,b) => b.length - a.length);
  const actionCue = /\b(provides?|provide|providing|funds?|funding|funded|offers?|offer|operates?|operate|delivers?|deliver|implements?|implement|deploys?|deploy|supports?|support|subsidizes?|subsidize|administers?|administer|runs?|run|launches?|launch|establishes?|establish|expands?|expand|maintains?|maintain|service|program|programme|scheme|initiative|intervention|pilot)\b/i;
  extracted.push(...terms.filter(term => { const idx = text.indexOf(String(term).toLowerCase()); return idx >= 0 && actionCue.test(text.slice(Math.max(0, idx - 140), Math.min(text.length, idx + String(term).length + 140))); }));
  return [...new Set(extracted)].slice(0, 4);
}
function classifyCkanRecord(row) { const title = normalizeText(row?.title || row?.name); if (NON_INTERVENTION_ARTIFACT_PATTERNS.some(pattern => pattern.test(title))) return { accepted: false, reason: 'non-intervention-artifact-pattern', positiveSignals: [], negativeSignals: [], families: [] }; const notes = normalizeText([row?.notes, row?.description].filter(Boolean).join(' ')); const tags = Array.isArray(row?.tags) ? row.tags.map(tag => normalizeText(tag?.display_name || tag?.name)).filter(Boolean).slice(0, 12) : []; const text = `${title} ${notes} ${tags.join(' ')}`.toLowerCase(); const negative = NON_INTERVENTION_TERMS.filter(term => title.toLowerCase().includes(term)); const positive = INTERVENTION_TERMS.filter(term => title.toLowerCase().includes(term)); const strongPositive = STRONG_INTERVENTION_TERMS.filter(term => title.toLowerCase().includes(term)); if (!title) return { accepted: false, reason: 'missing-title', positiveSignals: [], negativeSignals: [], families: [] }; if (negative.length > 0 && strongPositive.length === 0) return { accepted: false, reason: 'non-intervention-resource', positiveSignals: [], negativeSignals: negative, families: [] }; if (negative.length > 0 && /\b(report|dataset|census|budget|statistics|indicator|dashboard|survey|profile|information|records?)\b/i.test(title)) return { accepted: false, reason: 'non-intervention-resource', positiveSignals: positive, negativeSignals: negative, families: [] }; if (/\b(data|statistics|report|dashboard|information|records?)\b/i.test(title) && !/\b(program|programme|service|initiative|intervention|project|pilot)\b/i.test(title)) return { accepted: false, reason: 'non-intervention-resource', positiveSignals: positive, negativeSignals: negative, families: [] }; const actionablePositive = strongPositive.filter(term => !GENERIC_ACTION_TERMS.has(term)); if (positive.length === 0 || actionablePositive.length === 0 || !isActionableInterventionTitle(title)) return { accepted: false, reason: 'insufficient-intervention-signal', positiveSignals: [], negativeSignals: negative, families: [] }; return { accepted: true, reason: 'intervention-signal', positiveSignals: positive, negativeSignals: negative, families: inferInterventionFamily(text) }; }
function extractGovUkInterventionLeads(payload, source, problem, workspace = 'municipal') {
  const results = Array.isArray(payload?.results) ? payload.results : [];
  return results.flatMap((row, index) => {
    const title = normalizeText(row?.title), description = normalizeText(row?.description);
    if (workspace !== 'research' && /\bresearch (grant|grants|funding|project|study)\b/i.test(title)) return [];
    if (!title) return [];
    const titleActionable = isActionableInterventionTitle(title, description, { allowDescriptionSignals: true });
    const recordLike = /\b(data|dataset|report|statistics|statistic|indicator|dashboard|observations?|measurements?|counts?|trends?|profile|census|infographic|archive|map|mapping|inventory|directory|register|records?|catalogue|catalog|portal|database|series|timeseries|time series|list|index|metadata|results?|questionnaire|survey|feedback|findings?|evaluation|assessment results?)\b/i.test(title); const names = titleActionable ? [title] : (recordLike ? [] : extractConcreteInterventionFromDescription(problem, workspace, description));
    return names.map((name, extractedIndex) => {
      const candidate = { name, discoveryText: description };
      const canonicalName = normalizeInterventionName(name);
      if (!canonicalName) return null;
      return { id: `source:${source.sourceId}:${row?.link || index + 1}:${extractedIndex}`, name, canonicalName, interventionFamily: inferInterventionFamily(name + ' ' + description), problemTags: [String(problem).toLowerCase()], domains: [source.domain], requiredEvidence: ['causal','implementation','cost','equity'], discoveryText: `${title} ${description}`.trim(), evidenceStatus: 'potential', discovery: { source: source.sourceId, sourceType: 'government-program-search', jurisdiction: source.jurisdiction, leadOnly: true, effectsImported: false, discoveryOnly: true, externalId: row?.link || null, classification: { basis: titleActionable ? 'official-government-search-result' : 'description-extracted-intervention', format: row?.format || null }, provenance: [{ sourceId: source.sourceId, sourceType: 'government-program-search', jurisdiction: source.jurisdiction, evidenceStatus: 'potential', externalId: row?.link || null }] } };
    }).filter(Boolean);
  });
}
function extractCkanInterventionLeads(payload, source, problem, workspace = 'municipal') {
  const results = Array.isArray(payload?.result?.results) ? payload.result.results : [];
  return results.flatMap((row, index) => {
    const title = normalizeText(row?.title || row?.name);
    if (workspace !== 'research' && /\bresearch (grant|grants|funding|project|study)\b/i.test(title)) return [];
    const notes = normalizeText([row?.notes, row?.description].filter(Boolean).join(' '));
    const tags = Array.isArray(row?.tags) ? row.tags.map(tag => normalizeText(tag?.display_name || tag?.name)).filter(Boolean).slice(0, 12) : [];
    const classification = classifyCkanRecord(row);
    const titleActionable = classification.accepted && isActionableInterventionTitle(title);
    const recordLike = /\b(data|dataset|report|statistics|statistic|indicator|dashboard|observations?|measurements?|counts?|trends?|profile|census|infographic|archive|map|mapping|inventory|directory|register|records?|catalogue|catalog|portal|database|series|timeseries|time series|list|index|metadata|results?|questionnaire|survey|feedback|findings?|evaluation|assessment results?)\b/i.test(title); const descriptionExtracted = extractConcreteInterventionFromDescription(problem, workspace, notes + ' ' + tags.join(' '));
    const names = titleActionable ? [{ name: title, family: classification.families, basis: classification.reason }] : (!recordLike && descriptionExtracted.length ? descriptionExtracted.map(name => ({ name, family: inferInterventionFamily(name + ' ' + notes), basis: 'description-extracted-intervention' })) : []);
    return names.map((item, extractedIndex) => {
      const candidate = { name: item.name, discoveryText: `${title} ${notes} ${tags.join(' ')}` };
      const canonicalName = normalizeInterventionName(item.name);
      if (!canonicalName) return null;
      const id = row.id || row.name || `${source.sourceId}-${index + 1}`;
      return { id: `source:${source.sourceId}:${id}:${extractedIndex}`, name: item.name, canonicalName, interventionFamily: item.family, problemTags: [String(problem).toLowerCase(), ...tags].filter(Boolean).slice(0, 13), domains: [source.domain], requiredEvidence: ['causal','implementation','cost','equity'], discoveryText: candidate.discoveryText, evidenceStatus: 'potential', discovery: { source: source.sourceId, sourceType: 'intervention-library', jurisdiction: source.jurisdiction, leadOnly: true, effectsImported: false, discoveryOnly: true, datasetId: row.id || row.name || null, classification: { basis: item.basis, positiveSignals: classification.positiveSignals, negativeSignals: classification.negativeSignals, families: item.family }, provenance: [{ sourceId: source.sourceId, sourceType: 'intervention-library', jurisdiction: source.jurisdiction, evidenceStatus: 'potential' }] } };
    }).filter(Boolean);
  });
}
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
function literatureProblemConceptRelevant(problem, searchable, workspace = 'municipal') {
  const text = normalizeText(searchable).toLowerCase();
  const verbs = new Set(['reduce','increase','improve','prevent','study','evaluate','lower','decrease','curb','cut','mitigate','close','narrow','remove','shorten','clear','strengthen']);
  const stop = new Set(['and','the','for','of','to','in','on','from','with','a','an','intervention','program','programme','service','initiative','ways','effective','effectiveness']);
  const variants = expandDiscoveryVocabulary(problem, workspace, 12);
  const anchors = new Set();
  for (const variant of variants) {
    const normalized = normalizeText(variant).toLowerCase();
    const words = normalized.split(/\s+/).filter(Boolean);
    const anchor = words.filter(word => !verbs.has(word) && !stop.has(word)).join(' ').trim();
    if (anchor.length > 4) anchors.add(anchor);
  }
  const problemDomains = inferWorkspaceDomains(problem, workspace);
  const domainAnchors = problemDomains.flatMap(domain => {
    const taxonomy = WORKSPACE_TAXONOMIES[workspace] || {};
    return (taxonomy[domain] || []).map(term => normalizeText(term).toLowerCase());
  });
  for (const anchor of [...anchors, ...domainAnchors]) {
    if (anchor.length > 4 && text.includes(anchor)) return true;
  }
  // Also accept a substantive problem concept when the source uses a different
  // operational phrasing. Require a meaningful token from the problem itself;
  // generic words (including economic/candidate vocabulary) cannot satisfy this gate.
  const conceptStop = new Set([
    ...verbs, ...stop,
    'address','issue','issues','problem','problems','employee','employees',
    'cycle','time','gap','gaps','outcome','outcomes','risk','risks',
    'organization','organizations','organizational','company','companies'
  ]);
  const problemTokens = normalizeText(problem).toLowerCase()
    .split(/[^a-z0-9-]+/)
    .map(token => token.trim())
    .filter(token => token.length > 4 && !conceptStop.has(token));
  if (problemTokens.some(token => text.includes(token))) return true;
  return false;
}
function extractOpenAlexInterventionLeads(payload, source, problem, workspace = 'municipal', query = '') {
  const rows = Array.isArray(payload?.results) ? payload.results : [];
  const taxonomy = taxonomyTerms(problem, workspace).map(term => String(term).toLowerCase()).filter(term => term.length > 4);
  const expectedFamilies = expectedInterventionFamilies(problem, workspace);
  const familyTerms = expectedFamilies.flatMap(family => INTERVENTION_FAMILY_SEARCH_TERMS[family] || []).map(term => String(term).toLowerCase());
  // Literature is evidence about interventions, not an intervention registry. Do not let
  // generic words such as "program", "service", or "intervention" manufacture candidates.
  const recallTerms = discoveryRecallTerms(problem, workspace).map(term => String(term).toLowerCase()).filter(term => term.length > 4);
  const terms = [...new Set([...taxonomy, ...familyTerms, ...recallTerms])];
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
    const textDomains = [...new Set([...discoveryDomains(searchable), ...inferWorkspaceDomains(searchable, workspace)])];
    const domainRelevant = !problemDomains.length || problemDomains.some(domain => textDomains.includes(domain));
    const queryLower = String(query || '').toLowerCase();
    const queryTerms = terms.filter(term => queryLower.includes(term)).slice(0, 4);
    // A bounded query-backed lead is allowed only when the literature result itself
    // is relevant and the matched term is controlled by VIDIK's retrieval vocabulary.
    // The term must come from VIDIK's existing workspace/family vocabulary and be
    // present in the actual source query; arbitrary query text can never become a
    // candidate name.
    const problemLower = normalizeText(problem).toLowerCase();
    const querySuffix = queryLower
      .replace(problemLower, '')
      .replace(/["']/g, '')
      .trim();
    const queryBackedTerms = [...new Set([
      ...queryTerms,
      ...terms.filter(term => queryLower.includes(term))
    ])]
      .filter(term => term.length > 4 && !/^(reduce|increase|improve|prevent|study|evaluate|intervention|program|service|access|gaps?)$/i.test(term))
      .sort((a, b) => b.length - a.length)
      .slice(0, 3);
    // A query-backed term is already constrained twice: it must belong to VIDIK's
    // controlled intervention vocabulary and appear in the actual source query.
    // Do not require the paper's generic domain classifier to recognize the same
    // concept; that classifier is intentionally conservative and can miss papers
    // whose intervention language is operational rather than domain-labeled.
    // The normal interventionMatchesProblem gate remains authoritative below.
    const fallbackTerms = !titleMatched.length && queryBackedTerms.length
      ? [...new Set([...matched, ...queryBackedTerms])].slice(0, 3)
      : [];
    for (const term of [...new Set([...titleMatched, ...(titleMatched.length ? [] : fallbackTerms)])].slice(0, 3)) {
      const name = term.replace(/\b(programme|initiative|project|pilot)\b/g,'program').replace(/\b(centre|center)\b/g,'centre');
      const candidate = { name, discoveryText: searchable };
      const titleMatch = title.toLowerCase().includes(term);
      const queryMatch = String(query || '').toLowerCase().includes(term);
      const queryBackedTerm = queryMatch && queryBackedTerms.includes(term);
      const queryBackedRelevant = Boolean(
        queryBackedTerm &&
        domainRelevant &&
        literatureProblemConceptRelevant(problem, searchable, workspace)
      );
      // Query-backed literature candidates require independent problem-concept evidence
      // from the source itself. This gate is deliberately evaluated even when the
      // candidate term is already in VIDIK's taxonomy: otherwise interventionMatchesProblem()
      // can make the candidate appear relevant merely because the candidate name is itself
      // a known intervention for the problem. Title/abstract relevance must come first;
      // candidate vocabulary cannot be its own evidence.
      if (queryBackedTerm) {
        if (!queryBackedRelevant) continue;
      } else if (!interventionMatchesProblem(problem, candidate, workspace)) {
        continue;
      }
      const canonicalName = normalizeInterventionName(name);
      if (!canonicalName) continue;
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
function stripLiteratureHtml(value) {
  return normalizeText(String(value || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' '));
}
function extractCrossrefInterventionLeads(payload, source, problem, workspace = 'municipal', query = '') {
  const rows = Array.isArray(payload?.message?.items) ? payload.message.items : [];
  const taxonomy = taxonomyTerms(problem, workspace).map(term => String(term).toLowerCase()).filter(term => term.length > 4);
  const familyTerms = expectedInterventionFamilies(problem, workspace).flatMap(family => INTERVENTION_FAMILY_SEARCH_TERMS[family] || []).map(term => String(term).toLowerCase());
  const recallTerms = discoveryRecallTerms(problem, workspace).map(term => String(term).toLowerCase()).filter(term => term.length > 4);
  const terms = [...new Set([...taxonomy, ...familyTerms, ...recallTerms])];
  const problemDomains = inferWorkspaceDomains(problem, workspace);
  const leads = [];
  for (const row of rows.slice(0, 20)) {
    const title = normalizeText(Array.isArray(row?.title) ? row.title[0] : row?.title || '');
    if (!title) continue;
    const abstract = stripLiteratureHtml(row?.abstract);
    const searchable = normalizeText(title + ' ' + abstract);
    const lower = searchable.toLowerCase();
    const matched = terms.filter(term => lower.includes(term)).sort((a, b) => b.length - a.length).slice(0, 3);
    const titleMatched = matched.filter(term => title.toLowerCase().includes(term));
    const explicitResearchCue = /\b(randomi[sz]ed|trial|quasi-experimental|difference-in-differences|policy evaluation|program evaluation|service evaluation|implementation evaluation|evaluated|implemented|implementation|assigned|intervention group|control group|pilot|program|programme|service|initiative|treatment)\b/i.test(searchable);
    const textDomains = [...new Set([...discoveryDomains(searchable), ...inferWorkspaceDomains(searchable, workspace)])];
    const domainRelevant = !problemDomains.length || problemDomains.some(domain => textDomains.includes(domain));
    const queryLower = String(query || '').toLowerCase();
    const queryBackedTerms = terms
      .filter(term => queryLower.includes(term))
      .sort((a, b) => b.length - a.length)
      .slice(0, 3);
    const selectedTerms = titleMatched.length
      ? titleMatched
      : (queryBackedTerms.length ? [...new Set([...matched, ...queryBackedTerms])].slice(0, 3) : []);
    for (const term of selectedTerms) {
      const name = term.replace(/\b(programme|initiative|project|pilot)\b/g,'program').replace(/\b(centre|center)\b/g,'centre');
      const candidate = { name, discoveryText: searchable };
      if (!interventionMatchesProblem(problem, candidate, workspace)) continue;
      const canonicalName = normalizeInterventionName(name);
      if (!canonicalName) continue;
      leads.push({
        id: 'source:' + source.sourceId + ':' + (row?.DOI || row?.URL || canonicalName) + ':' + canonicalName,
        name, canonicalName, interventionFamily: inferInterventionFamily(name),
        problemTags: [String(problem).toLowerCase()], domains: [source.domain],
        requiredEvidence: ['causal','implementation','cost','equity'], discoveryText: searchable, evidenceStatus: 'potential',
        discovery: { source: source.sourceId, sourceType: 'intervention-literature', jurisdiction: source.jurisdiction, leadOnly: true, effectsImported: false, discoveryOnly: true, externalId: row?.DOI || row?.URL || null,
          extraction: title.toLowerCase().includes(term) ? 'taxonomy-term-from-literature-title' : 'taxonomy-term-from-literature-abstract',
          provenance: [{ sourceId: source.sourceId, sourceType: 'intervention-literature', jurisdiction: source.jurisdiction, evidenceStatus: 'potential', externalId: row?.DOI || row?.URL || null, discoveryQuery: query || null, relevanceStatus: queryLower.includes(term) ? 'query-match' : 'title-match' }] }
      });
    }
  }
  return leads;
}
function buildLiteratureFallbackQueries(problem, workspace = 'municipal') {
  const normalizedProblem = normalizeText(problem);
  const expectedFamilies = expectedInterventionFamilies(problem, workspace);
  const familyTerms = expectedFamilies.flatMap(family => (INTERVENTION_FAMILY_SEARCH_TERMS[family] || []).slice(0, 4));
  const recallTerms = discoveryRecallTerms(problem, workspace);
  const taxonomy = taxonomyTerms(problem, workspace).slice(0, 8);
  return [...new Set([
    normalizedProblem,
    ...recallTerms.map(term => `${normalizedProblem} ${term}`),
    `${normalizedProblem} intervention`,
    ...familyTerms.map(term => `${normalizedProblem} ${term}`),
    ...taxonomy.map(term => `${normalizedProblem} ${term}`)
  ].filter(Boolean))].slice(0, 12);
}
function canonicalSource(source) { return SOURCE_REGISTRY.find(candidate => candidate.sourceId === source?.sourceId) || null; }
function sourceMatchesJurisdiction(source, jurisdiction) { const canonical = canonicalSource(source); if (!canonical) return false; if (source.jurisdiction !== canonical.jurisdiction) return false; return !jurisdiction || canonical.jurisdiction === jurisdiction || canonical.jurisdiction === 'international'; }
function selectInterventionSources({ problem, jurisdiction = null } = {}) { const normalizedProblem = String(problem || '').toLowerCase(); const terms = normalizedProblem.split(/[^a-z0-9-]+/).filter(Boolean); const eligible = SOURCE_REGISTRY.filter(source => (CKAN_SOURCE_IDS.has(source.sourceId) || GOVUK_SOURCE_IDS.has(source.sourceId)) && sourceMatchesJurisdiction(source, jurisdiction)); const matched = eligible.filter(source => source.discoveryTags.some(tag => terms.includes(String(tag).toLowerCase()) || normalizedProblem.includes(String(tag).toLowerCase()))); return matched.length ? matched : eligible; }
function buildApplicabilityAudit({ problem, jurisdiction = null, suppliedSources = null } = {}) { const normalizedProblem = String(problem || '').toLowerCase(); const terms = normalizedProblem.split(/[^a-z0-9-]+/).filter(Boolean); const eligible = SOURCE_REGISTRY.filter(source => (CKAN_SOURCE_IDS.has(source.sourceId) || GOVUK_SOURCE_IDS.has(source.sourceId)) && sourceMatchesJurisdiction(source, jurisdiction)); const matched = eligible.filter(source => source.discoveryTags.some(tag => terms.includes(String(tag).toLowerCase()) || normalizedProblem.includes(String(tag).toLowerCase()))); const rejectedSuppliedSources = Array.isArray(suppliedSources) && jurisdiction ? suppliedSources.filter(source => !sourceMatchesJurisdiction(source, jurisdiction)).map(source => ({ sourceId: source.sourceId, jurisdiction: source.jurisdiction, canonicalJurisdiction: canonicalSource(source)?.jurisdiction || null, reason: canonicalSource(source) ? 'jurisdiction-mismatch' : 'unregistered-source' })) : []; return { problem, jurisdiction, eligibleSources: eligible.map(source => source.sourceId), matchedSources: matched.map(source => source.sourceId), rejectedSuppliedSources, fallbackUsed: matched.length === 0 && eligible.length > 0, decision: matched.length ? 'tag-matched' : (eligible.length ? 'broad-fallback' : 'no-eligible-source'), consideredCount: eligible.length }; }
function deduplicateInterventionLeads(leads = []) { const groups = new Map(); for (const lead of leads) { const key = lead.canonicalName || normalizeInterventionName(lead.name); if (!key) continue; const existing = groups.get(key); if (!existing) { groups.set(key, { ...lead, id: `universe:${sha256(key).slice(0, 16)}`, sourceIds: [lead.discovery?.source].filter(Boolean), sourceCount: 1, sourceProvenance: lead.discovery?.provenance || [], interventionFamily: lead.interventionFamily || ['other'] }); continue; } existing.sourceIds = [...new Set([...existing.sourceIds, lead.discovery?.source].filter(Boolean))]; existing.sourceCount = existing.sourceIds.length; existing.sourceProvenance = [...existing.sourceProvenance, ...(lead.discovery?.provenance || [])]; existing.interventionFamily = [...new Set([...existing.interventionFamily, ...(lead.interventionFamily || [])])]; existing.discovery = { ...existing.discovery, corroboratedBySources: existing.sourceIds.length, leadOnly: true, effectsImported: false, discoveryOnly: true }; } return [...groups.values()]; }
function buildInterventionUniverseAssessment({ problem, jurisdiction = null, sourceSearches = [], candidates = [], requestedSourceCount = 0 } = {}) { const usable = sourceSearches.filter(search => search.status !== 'search-failed'); const failed = sourceSearches.filter(search => search.status === 'search-failed'); const deduped = deduplicateInterventionLeads(candidates); const families = [...new Set(deduped.flatMap(candidate => candidate.interventionFamily || ['other']))]; const coverage = requestedSourceCount > 0 ? usable.length / requestedSourceCount : 0; const evidenceReadyLeads = deduped.filter(candidate => candidate.requiredEvidence?.length).length; return { problem, jurisdiction, sourcesAttempted: sourceSearches.length, usableSources: usable.length, failedSources: failed.length, sourceCoverageRatio: coverage, rawCandidateCount: candidates.length, uniqueCandidateCount: deduped.length, interventionFamilies: families, evidenceRequirementsAttached: evidenceReadyLeads === deduped.length, discoveryComplete: sourceSearches.length > 0 && failed.length === 0 && deduped.length > 0, recommendationEligible: false, stoppingReason: sourceSearches.length === 0 ? 'no-source-searches' : failed.length === sourceSearches.length ? 'all-sources-failed' : deduped.length === 0 ? 'no-intervention-candidates' : failed.length ? 'partial-source-failure' : 'candidate-universe-discovered' }; }
const DISCOVERY_DOMAIN_GROUPS = [['public-safety',['crime','violence','assault','robbery','homicide','policing','enforcement','patrol','public safety']],['housing',['housing','homeless','shelter','rent','rehousing','tenancy','eviction']],['food',['food','nutrition','grocery','meal','hunger','food insecurity','food access']],['energy',['energy','utility','electricity','weatherization','heating','cooling','fuel','power','energy burden']],['mobility',['transit','bus','rail','mobility','commute','signal','traffic','delay','congestion','travel time','pedestrian','crossing','sidewalk','bike','bicycle','road safety']],['health',['health','hospital','clinic','patient','treatment','care','emergency department','urgent care','overcrowding','patient flow','opioid','overdose','mortality']],['climate',['wildfire','smoke','air quality','filtration','clean air','fire season','heat','heatwave','extreme heat','cooling','temperature','flood','flooding','stormwater','drainage','resilience']],['employment',['employment','worker','job','workforce','training','displacement']],['economic',['poverty','low income','income','benefit','subsidy','grant','voucher','affordability','economic hardship']],['education',['youth','child','children','student','school','education']],['accessibility',['senior','seniors','aging','elderly','disability','accessible','accessibility','caregiver']],['environment',['environment','pollution','waste','recycling','emissions','air pollution']],['infrastructure',['infrastructure','road resurfacing','water billing','drainage','stormwater','utility billing']]];
const CROSS_DOMAIN_COMPATIBILITY = {'public-safety':new Set(['housing','health','mobility','food','climate']),housing:new Set(['public-safety','health','economic','infrastructure']),food:new Set(['housing','economic','health','infrastructure']),energy:new Set(['housing','health','climate','economic','infrastructure']),mobility:new Set(['public-safety','infrastructure']),health:new Set(['public-safety','housing','food','energy','climate','infrastructure']),climate:new Set(['health','mobility','infrastructure']),employment:new Set(['economic','housing']),economic:new Set(['housing','food','employment','health','energy']),education:new Set(['housing','employment','health']),accessibility:new Set(['housing','health','mobility']),environment:new Set(['climate','health','infrastructure']),infrastructure:new Set(['mobility','climate','environment'])};
function discoveryDomains(text) { const normalized = normalizeText(text).toLowerCase(); return DISCOVERY_DOMAIN_GROUPS.filter(([,terms]) => terms.some(term => normalized.includes(term))).map(([name]) => name); }
function directConceptOverlap(problem, candidate) { const stop = new Set(['reduce','increase','improve','prevent','address','mitigate','lower','decrease','support','expand','eliminate','household','households','community','municipal','program','programme','project','service','services','initiative','intervention','pilot','public','local','city','cities','problem','issues','issue','and','the','for','of','to','in','on','from','with','governance','response','delivery','data','customer','customers','digital','access']); const tokens = value => normalizeText(value).toLowerCase().replace(/[^a-z0-9\s-]/g,' ').split(/\s+/).filter(token => token && token.length > 2 && !stop.has(token)).map(token => token.replace(/ies$/,'y').replace(/s$/,'')); const p = new Set(tokens(problem)); return tokens(candidate).some(token => p.has(token)); }
function problemSpecificRelevance(problem, candidate, workspace = 'municipal') {
  const p = normalizeText(problem).toLowerCase();
  const name = normalizeText(candidate?.name || '').toLowerCase();
  const text = normalizeText((candidate?.name || '') + ' ' + (candidate?.discoveryText || '')).toLowerCase();

  const rules = [
    {
      match: /violent crime|serious violence|community violence/,
      terms: ['focused deterrence','community violence intervention','violence interruption','hot spot policing','hot spots policing','problem-oriented policing','directed patrol','hospital violence intervention','community violence prevention','violence intervention','supportive housing','housing first','housing stabilization','youth employment','paid summer employment','cognitive behavioral','behavioral intervention','substance use treatment','diversion','firearm violence risk reduction','street outreach','credible messenger','firearm violence prevention','vacant property remediation','vacant lot greening','vacant land restoration','blight remediation','place-based crime prevention','youth violence prevention','justice-system diversion','police deployment','street lighting','environmental safety','intimate partner violence prevention','domestic violence prevention','reentry support']
    },
    {
      match: /chronic homelessness|homelessness|rough sleeping|housing insecurity/,
      terms: ['housing first','rapid rehousing','supportive housing','rental assistance','eviction prevention','shelter diversion','tenant legal assistance','housing navigation','homelessness support','permanent supportive housing','community land trust','affordable housing development']
    },
    {
      match: /emergency[- ]department|hospital overcrowding|patient[- ]flow|ed crowding/,
      terms: ['community health worker','care navigation','community paramedicine','mobile crisis response','mobile health outreach','primary care clinic','primary care access','mobile clinic','urgent care','triage','patient flow','hospital discharge','same-day access','observation unit']
    },
    {
      match: /extreme heat|heat-related illness|heat illness/,
      terms: ['cooling centre','cooling center','cooling infrastructure','home cooling','shade infrastructure','tree canopy','cool roof','heat retrofit','heat-health','heat health','heatwave response','extreme heat response','thermal retrofit']
    },
    {
      match: /critical infrastructure maintenance backlog|infrastructure maintenance backlog|maintenance backlog/,
      terms: ['preventive maintenance','asset management','condition-based maintenance','asset renewal','infrastructure renewal','infrastructure replacement','critical infrastructure repair','maintenance prioritization','lifecycle asset management','road resurfacing','bridge rehabilitation','water main renewal','sewer renewal','facility renewal','capital renewal']
    }
  ];

  const rule = rules.find(item => item.match.test(p));
  if (!rule) return null;
  // Use the candidate itself as the relevance object. Do not let the user's query,
  // source query echo, or generic domain membership manufacture relevance.
  const hit = rule.terms.some(term => name.includes(term) || text.includes(term));
  if (!hit) return false;

  // Eviction prevention is an actionable housing intervention, but it targets
  // homelessness inflow rather than chronic homelessness itself. Keep it out of
  // the direct intervention universe for this consequential decision unless the
  // source record explicitly ties the intervention to people experiencing chronic
  // homelessness; otherwise it belongs in an upstream/adjacent option class.
  if (/chronic homelessness|homelessness|rough sleeping|housing insecurity/.test(p) &&
      /^(eviction prevention|eviction diversion)$/.test(name) &&
      !/chronic homelessness|people experiencing homelessness|people who are homeless|homeless population/.test(text)) {
    return false;
  }

  // For broad multi-domain interventions, require the candidate title itself to
  // expose an actionable mechanism. This blocks generic grants, casework, reports,
  // and service records whose descriptions merely mention the target problem.
  const genericOnly = /^(grant|funding|support|service|program|programme|capacity expansion|redundancy|response|assistance|training)\\b/i.test(name);
  if (genericOnly) return false;
  return true;
}

function interventionMatchesProblem(problem,candidate,workspace='municipal'){
  const problemText=normalizeText(problem),candidateText=normalizeText((candidate?.name||'')+' '+(candidate?.discoveryText||''));
  if(!isActionableInterventionTitle(candidate?.name || '', candidate?.discoveryText || '', { allowDescriptionSignals: true })) return false;
  const problemSpecific = problemSpecificRelevance(problem, candidate, workspace);
  if (problemSpecific === false) return false;
  if (problemSpecific === true) return true;
  const problemLower=problemText.toLowerCase(),candidateLower=candidateText.toLowerCase();
  const problemDomains=inferWorkspaceDomains(problemText,workspace),candidateDomains=[...new Set([...discoveryDomains(candidateText),...inferWorkspaceDomains(candidateText,workspace)])];
  const taxonomy=taxonomyTerms(problemText,workspace).map(term=>term.toLowerCase()).filter(Boolean);
  const enterpriseProfile = workspace === 'enterprise' ? enterpriseProblemProfile(problemText) : null;
  if (enterpriseProfile) {
    const profileHit = enterpriseProfile.classes.some(term => candidateLower.includes(term.toLowerCase()));
    if (profileHit) return true;
    const profileProblemTokens = evidenceConceptTokensForIntervention(problemLower);
    const profileCandidateTokens = evidenceConceptTokensForIntervention(candidateLower);
    const profileTokenHit = profileProblemTokens.some(token => profileCandidateTokens.includes(token));
    if (!profileTokenHit) return false;
  }
  const GENERIC_RELEVANCE_TERMS = new Set(['governance','response','delivery','data','customer','customers','digital','service','services','access']);
  const taxonomyHit=taxonomy.some(term=>term.length > 4 && !GENERIC_RELEVANCE_TERMS.has(term) && candidateLower.includes(term));
  const problemTokens=evidenceConceptTokensForIntervention(problemLower);
  const candidateTokens=evidenceConceptTokensForIntervention(candidateLower);
  const tokenHit=problemTokens.some(token=>candidateTokens.includes(token));
  if(taxonomyHit) return true;
  if (/\\b(violent crime|serious violence|community violence|crime)\\b/i.test(problemLower) && /\\b(public space|environmental safety|street lighting|vacant property|blight remediation|built environment)\\b/i.test(candidateLower)) return true;
  const semanticGroups = [
    ['flood','flooding','stormwater','drainage','inundation','flood mitigation','stormwater retention','drainage improvement'],
    ['violent crime','violence','assault','crime','violence interruption','community violence intervention','focused deterrence','hot spot policing','supportive housing','housing first','housing stabilization','rental assistance','public space','environmental safety','street lighting','vacant property','blight remediation','built environment'],
    ['pedestrian','walk','walking','crossing','pedestrian crossing','protected bike lane','traffic calming','safe routes','intersection safety','protected intersection','crosswalk','safe crossing','pedestrian safety'],
    ['wildfire','smoke','air quality','smoke filtration','clean air shelter','wildfire preparedness','evacuation support'],
    ['digital access gaps','digital divide','digital exclusion','digital access barriers','broadband access','internet access','broadband subsidy','broadband voucher','internet access support','digital lifeline fund','device lending','device grant','public wi-fi','public wifi','digital literacy'],
    ['heat','extreme heat','cooling','cooling centre','cooling infrastructure','shade infrastructure','tree canopy','home cooling','cool roof','cool-roof','roof retrofit','reflective roof','building retrofit','heat retrofit'],
    ['worker displacement','displaced worker','redeployment','reskilling','automation','worker transition','job placement','career pathway','wage subsidy'],
    ['overdose','opioid','opioids','overdose deaths','opioid mortality','naloxone','overdose prevention','community paramedicine','addiction treatment','substance use treatment','medication treatment','treatment access'],
    ['emergency department','emergency room','hospital overcrowding','ED crowding','crowding','care navigation','community paramedicine','mobile clinic','mobile health outreach','community health outreach','primary care clinic'],
    ['food insecurity','hunger','food access','food access gaps','food voucher','community food hub','mobile market','community kitchen','school meal'],
    ['homelessness','rough sleeping','housing insecurity','housing instability','housing first','rapid rehousing','rehousing','supportive housing','rental assistance','rental affordability','housing affordability','affordable housing','below-market housing','housing supply','affordable housing development','shelter','shelter diversion','homelessness support'],
    ['traffic congestion','congestion','traffic delays','travel delays','transit delay','transit delays','bus delay','transit reliability','transit frequency','bus priority','signal timing','traffic signal priority','road pricing'],
    ['childcare','child care','early childhood','childcare affordability','child care access','early childhood education','childcare subsidy'],
    ['energy burden','energy affordability','utility burden','energy costs','home energy assistance','utility bill assistance','weatherization assistance','energy efficiency retrofit'],
    ['construction permitting','permit delays','permitting delays','planning approval delays','permit modernization','one stop permitting','digital permitting','permit streamlining'],
    ['noise pollution','noise','traffic noise','noise exposure','noise mitigation','noise barrier','quiet pavement'],
    ['air pollution','air quality','particulate','emissions','air pollution control','clean air shelter','source air protection'],
    ['water quality','drinking water','contaminated water','water pollution','water treatment','source water protection'],
    ['waste','landfill','solid waste','waste reduction','recycling','organics','collection service redesign'],
    ['mental health','psychological distress','behavioral health','mental health support','peer support','community health worker','care navigation','mobile crisis response'],
    ['infrastructure','facility','project','preventive maintenance','asset management','capacity expansion','redundancy','retrofit']
  ];
  for (const group of semanticGroups) {
    const problemHit = group.some(term => problemLower.includes(term));
    const candidateHit = group.some(term => candidateLower.includes(term));
    if (problemHit && candidateHit) return true;
  }
  return tokenHit;
}
function missingFamilySearchQueries(problem,workspace,candidates=[]){
  const coverage=discoveryCoverage(problem,workspace,candidates),queries=[];
  for(const family of coverage.missingFamilies){
    for(const term of (INTERVENTION_FAMILY_SEARCH_TERMS[family]||[]).slice(0,3)) queries.push(`${normalizeText(problem)} ${term}`);
  }
  return [...new Set(queries)].slice(0,12);
}
function buildTaxonomyExplorationLeads(problem, workspace, candidates = []) {
  const families = expectedInterventionFamilies(problem, workspace);
  const existingFamilies = new Set(candidates.flatMap(candidate => candidate.interventionFamily || []));
  const missingFamilies = families.filter(family => !existingFamilies.has(family));
  if (!missingFamilies.length) return [];
  return missingFamilies.flatMap(family => (INTERVENTION_FAMILY_SEARCH_TERMS[family] || []).slice(0, 3).map((term, index) => {
    const name = normalizeText(term).replace(/\b\w/g, character => character.toUpperCase());
    const canonicalName = normalizeInterventionName(name);
    if (!canonicalName) return null;
    return { id: `taxonomy-exploration:${sha256(problem + '|' + family + '|' + canonicalName).slice(0, 16)}`, name, canonicalName, interventionFamily: [family], problemTags: [String(problem).toLowerCase()], domains: ['intervention-universe'], requiredEvidence: ['causal','implementation','cost','equity'], discoveryText: `Governed taxonomy expansion for ${problem}: ${term}`, evidenceStatus: 'potential', discovery: { source: 'vidik-intervention-taxonomy', sourceType: 'taxonomy-expansion', jurisdiction: null, leadOnly: true, effectsImported: false, discoveryOnly: true, taxonomyFamily: family, expansionIndex: index, provenance: [{ sourceId: 'vidik-intervention-taxonomy', sourceType: 'taxonomy-expansion', evidenceStatus: 'potential', expansionReason: 'missing-intervention-family' }] } };
  }).filter(Boolean));
}
async function discoverSourceDrivenInterventions({problem,jurisdiction=null,workspace='municipal',sources=null,fetchImpl,now=new Date(),rows=25}={}){
  const supplied=Array.isArray(sources)?sources:null,selected=(supplied?supplied.filter(source=>sourceMatchesJurisdiction(source,jurisdiction)).map(source=>({...canonicalSource(source),...source})):selectInterventionSources({problem,jurisdiction})).map(source=>canonicalSource(source)?({...canonicalSource(source),...source}):source).filter(Boolean).filter((source,index,all)=>all.findIndex(candidate=>candidate.sourceId===source.sourceId)===index);
  const applicability=buildApplicabilityAudit({problem,jurisdiction,suppliedSources:supplied}),sourceSearches=[],rawCandidates=[],queries=buildDiscoveryQueries(problem,workspace);
  for(const source of selected){
    const attempts=[],sourceCandidates=[];
    for(const query of queries.slice(0, Math.max(1, DISCOVERY_MAX_QUERIES_PER_SOURCE - 6))){
      try{
        const sourceUrl = GOVUK_SOURCE_IDS.has(source.sourceId) ? buildGovUkSearchUrl(source, query, { rows }) : buildCkanSearchUrl(source, query, { rows }); const snapshot=await retrieve({...source,url:sourceUrl},{fetchImpl,now}),payload=parsePayload(snapshot.bytes,snapshot.retrieval.contentType);
        if(payload.format!=='json')throw new Error('source-driven-response-not-json');
        if(payload.value?.error)throw new Error('source-driven-upstream-error');
        const extractedLeads=GOVUK_SOURCE_IDS.has(source.sourceId) ? extractGovUkInterventionLeads(payload.value,source,problem,workspace) : extractCkanInterventionLeads(payload.value,source,problem,workspace); const leads=extractedLeads.filter(candidate=>interventionMatchesProblem(problem,candidate,workspace)); rawCandidates.push(...leads); sourceCandidates.push(...leads);
        const interim=deduplicateInterventionLeads(sourceCandidates),coverage=discoveryCoverage(problem,workspace,interim);
        attempts.push({query,queryLayer:classifyDiscoveryQuery(query,problem,workspace),status:leads.length?'candidates-found':'searched-empty',candidatesReturned:leads.length,recordsConsidered:Array.isArray(payload.value?.result?.results)?payload.value.result.results.length:0,provenance:snapshot.retrieval,failureReason:null,cumulativeUniqueCandidates:interim.length,expectedFamilies:coverage.expectedFamilies,observedFamilies:coverage.observedFamilies,missingFamilies:coverage.missingFamilies});
        if(interim.length>=DISCOVERY_MIN_UNIQUE_CANDIDATES&&(coverage.expectedFamilies.length===0||coverage.coverageRatio>=DISCOVERY_TARGET_FAMILY_COVERAGE))break;
      }catch(error){attempts.push({query,status:'search-failed',candidatesReturned:0,recordsConsidered:0,provenance:null,failureReason:error?.message||'source-driven-search-failed',cumulativeUniqueCandidates:deduplicateInterventionLeads(rawCandidates).length});}
    }
    const failedAttempts=attempts.filter(a=>a.status==='search-failed').length,usableAttempts=attempts.filter(a=>a.status!=='search-failed').length,finalCandidates=deduplicateInterventionLeads(sourceCandidates),coverage=discoveryCoverage(problem,workspace,finalCandidates);
    sourceSearches.push({sourceId:source.sourceId,sourceType:'intervention-library',jurisdiction:source.jurisdiction,originalProblem:problem,queriesAttempted:attempts.length,queryBudget:DISCOVERY_MAX_QUERIES_PER_SOURCE,failedQueryCount:failedAttempts,usableQueryCount:usableAttempts,status:finalCandidates.length?(coverage.missingFamilies.length?'candidate-universe-expanded-incomplete':'candidates-found'):(attempts.length&&failedAttempts===attempts.length?'search-failed':'searched-empty'),candidatesReturned:attempts.reduce((sum,a)=>sum+a.candidatesReturned,0),attempts,expectedFamilies:coverage.expectedFamilies,observedFamilies:coverage.observedFamilies,missingFamilies:coverage.missingFamilies,failureReason:finalCandidates.length?null:(failedAttempts===attempts.length?attempts[attempts.length-1]?.failureReason||null:null)});
  }
  let candidates=deduplicateInterventionLeads(rawCandidates),coverage=discoveryCoverage(problem,workspace,candidates);
  // If the first bounded search finds candidates but misses intervention families, run a
  // second, explicitly family-targeted pass. This is the missing-option safeguard: family
  // expansion must not depend solely on the original query vocabulary. Keep it bounded and
  // source-backed; never synthesize candidates from taxonomy terms.
  if (coverage.missingFamilies.length && selected.length) {
    const targetedQueries = missingFamilySearchQueries(problem, workspace, candidates);
    const existingQueries = new Set(sourceSearches.flatMap(search => (search.attempts || []).map(attempt => attempt.query)));
    for (const source of selected) {
      const sourceSearch = sourceSearches.find(search => search.sourceId === source.sourceId);
      if (!sourceSearch) continue;
      const remainingQueryBudget = Math.max(0, DISCOVERY_MAX_QUERIES_PER_SOURCE - sourceSearch.queriesAttempted); const sourceTargetQueries = targetedQueries.filter(query => !existingQueries.has(query)).slice(0, Math.min(remainingQueryBudget, 5));
      for (const query of sourceTargetQueries) {
        existingQueries.add(query);
        try {
          const sourceUrl = GOVUK_SOURCE_IDS.has(source.sourceId)
            ? buildGovUkSearchUrl(source, query, { rows })
            : buildCkanSearchUrl(source, query, { rows });
          const snapshot = await retrieve({...source, url: sourceUrl}, {fetchImpl, now});
          const payload = parsePayload(snapshot.bytes, snapshot.retrieval.contentType);
          if (payload.format !== 'json') throw new Error('source-driven-response-not-json');
          if (payload.value?.error) throw new Error('source-driven-upstream-error');
          const extractedLeads = GOVUK_SOURCE_IDS.has(source.sourceId)
            ? extractGovUkInterventionLeads(payload.value, source, problem, workspace)
            : extractCkanInterventionLeads(payload.value, source, problem, workspace);
          const leads = extractedLeads.filter(candidate => interventionMatchesProblem(problem, candidate, workspace));
          rawCandidates.push(...leads);
          candidates = deduplicateInterventionLeads(rawCandidates);
          coverage = discoveryCoverage(problem, workspace, candidates);
          sourceSearch.attempts.push({
            query,
            queryLayer: 'missing-family-expansion',
            status: leads.length ? 'candidates-found' : 'searched-empty',
            candidatesReturned: leads.length,
            recordsConsidered: Array.isArray(payload.value?.result?.results) ? payload.value.result.results.length : 0,
            provenance: snapshot.retrieval,
            failureReason: null,
            cumulativeUniqueCandidates: candidates.length,
            expectedFamilies: coverage.expectedFamilies,
            observedFamilies: coverage.observedFamilies,
            missingFamilies: coverage.missingFamilies
          });
          sourceSearch.queriesAttempted += 1;
          sourceSearch.usableQueryCount += 1;
          sourceSearch.candidatesReturned += leads.length;
          sourceSearch.missingFamilies = coverage.missingFamilies;
          sourceSearch.observedFamilies = coverage.observedFamilies;
          sourceSearch.expectedFamilies = coverage.expectedFamilies;
          if (coverage.missingFamilies.length === 0 && candidates.length >= DISCOVERY_MIN_UNIQUE_CANDIDATES) break;
        } catch (error) {
          sourceSearch.attempts.push({
            query,
            queryLayer: 'missing-family-expansion',
            status: 'search-failed',
            candidatesReturned: 0,
            recordsConsidered: 0,
            provenance: null,
            failureReason: error?.message || 'source-driven-search-failed',
            cumulativeUniqueCandidates: candidates.length
          });
          sourceSearch.queriesAttempted += 1;
          sourceSearch.failedQueryCount += 1;
        }
      }
      if (coverage.missingFamilies.length === 0) break;
    }
  }
  const allowLiteratureFallback = !Array.isArray(sources) || sources.some(source => ['openalex-works','crossref-works'].includes(source?.sourceId));
  if (allowLiteratureFallback && (candidates.length < DISCOVERY_MIN_UNIQUE_CANDIDATES || sourceSearches.some(search => search.status === 'search-failed') || (coverage.expectedFamilies.length && coverage.coverageRatio < 0.5))) {
    const literatureSources = ['openalex-works','crossref-works'].map(sourceId => SOURCE_REGISTRY.find(source => source.sourceId === sourceId)).filter(Boolean).filter(source => sourceMatchesJurisdiction(source, jurisdiction));
    const literatureSource = literatureSources[0];
    if (literatureSource) {
      const literatureQueries = buildLiteratureFallbackQueries(problem, workspace);
      const attempts = [];
      for (const source of literatureSources) {
        for (const query of literatureQueries) {
        try {
          const url = source.sourceId === 'openalex-works'
            ? buildOpenAlexInterventionSearchUrl(source, query, { rows })
            : (() => { const u = new URL(source.url); u.searchParams.set('query.bibliographic', query); u.searchParams.set('rows', String(rows)); return u.toString(); })();
          const snapshot = await retrieve({...source, url},{fetchImpl,now});
          const payload = parsePayload(snapshot.bytes, snapshot.retrieval.contentType);
          if (payload.format !== 'json') throw new Error('intervention-literature-response-not-json');
          const leads = source.sourceId === 'openalex-works'
            ? extractOpenAlexInterventionLeads(payload.value, source, problem, workspace, query)
            : extractCrossrefInterventionLeads(payload.value, source, problem, workspace, query);
          rawCandidates.push(...leads);
          const interim = deduplicateInterventionLeads(rawCandidates);
          const interimCoverage = discoveryCoverage(problem, workspace, interim);
          attempts.push({query,queryLayer:classifyDiscoveryQuery(query,problem,workspace),status:leads.length?'candidates-found':'searched-empty',candidatesReturned:leads.length,recordsConsidered:Array.isArray(payload.value?.results)?payload.value.results.length:0,provenance:snapshot.retrieval,failureReason:null,cumulativeUniqueCandidates:interim.length,expectedFamilies:interimCoverage.expectedFamilies,observedFamilies:interimCoverage.observedFamilies,missingFamilies:interimCoverage.missingFamilies});
          if (interim.length >= DISCOVERY_MIN_UNIQUE_CANDIDATES && (!interimCoverage.expectedFamilies.length || interimCoverage.coverageRatio >= DISCOVERY_TARGET_FAMILY_COVERAGE)) break;
        } catch (error) {
          attempts.push({query,status:'search-failed',candidatesReturned:0,recordsConsidered:0,provenance:null,failureReason:error?.message||'intervention-literature-search-failed',cumulativeUniqueCandidates:deduplicateInterventionLeads(rawCandidates).length});
        }
        }
        if (deduplicateInterventionLeads(rawCandidates).length >= DISCOVERY_MIN_UNIQUE_CANDIDATES) break;
      }
      const literatureCandidates = deduplicateInterventionLeads(rawCandidates).filter(candidate => ['openalex-works','crossref-works'].includes(candidate.discovery?.source));
      const literatureCoverage = discoveryCoverage(problem, workspace, literatureCandidates);
      sourceSearches.push({sourceId:literatureSource.sourceId,sourceType:'intervention-literature',jurisdiction:literatureSource.jurisdiction,originalProblem:problem,queriesAttempted:attempts.length,failedQueryCount:attempts.filter(a=>a.status==='search-failed').length,usableQueryCount:attempts.filter(a=>a.status!=='search-failed').length,status:literatureCandidates.length?(literatureCoverage.missingFamilies.length?'candidate-universe-expanded-incomplete':'candidates-found'):(attempts.length&&attempts.every(a=>a.status==='search-failed')?'search-failed':'searched-empty'),candidatesReturned:attempts.reduce((sum,a)=>sum+a.candidatesReturned,0),attempts,expectedFamilies:literatureCoverage.expectedFamilies,observedFamilies:literatureCoverage.observedFamilies,missingFamilies:literatureCoverage.missingFamilies,failureReason:literatureCandidates.length?null:attempts.find(a=>a.status==='search-failed')?.failureReason||null});
      candidates=deduplicateInterventionLeads(rawCandidates);
      coverage=discoveryCoverage(problem,workspace,candidates);
    }
  }
  // If families are present but major intervention classes are still missing, spend
  // remaining source budget on stratified class-specific searches. This is the
  // explicit missing-option detector: it searches for absent real-world classes
  // rather than treating family coverage as proof that the universe is complete.
  const classTargetedQueries = missingInterventionClassSearchQueries(problem, workspace, candidates);
  if (classTargetedQueries.length && selected.length) {
    const existingQueries = new Set(sourceSearches.flatMap(search => (search.attempts || []).map(attempt => attempt.query)));
    for (const source of selected) {
      const sourceSearch = sourceSearches.find(search => search.sourceId === source.sourceId);
      if (!sourceSearch) continue;
      const remainingQueryBudget = Math.max(0, DISCOVERY_MAX_QUERIES_PER_SOURCE - sourceSearch.queriesAttempted);
      const sourceClassQueries = classTargetedQueries.filter(query => !existingQueries.has(query)).slice(0, Math.min(remainingQueryBudget, 3));
      for (const query of sourceClassQueries) {
        existingQueries.add(query);
        try {
          const sourceUrl = GOVUK_SOURCE_IDS.has(source.sourceId)
            ? buildGovUkSearchUrl(source, query, { rows })
            : buildCkanSearchUrl(source, query, { rows });
          const snapshot = await retrieve({...source, url: sourceUrl}, {fetchImpl, now});
          const payload = parsePayload(snapshot.bytes, snapshot.retrieval.contentType);
          if (payload.format !== 'json') throw new Error('source-driven-response-not-json');
          if (payload.value?.error) throw new Error('source-driven-upstream-error');
          const extractedLeads = GOVUK_SOURCE_IDS.has(source.sourceId)
            ? extractGovUkInterventionLeads(payload.value, source, problem, workspace)
            : extractCkanInterventionLeads(payload.value, source, problem, workspace);
          const leads = extractedLeads.filter(candidate => interventionMatchesProblem(problem, candidate, workspace));
          rawCandidates.push(...leads);
          candidates = deduplicateInterventionLeads(rawCandidates);
          coverage = discoveryCoverage(problem, workspace, candidates);
          sourceSearch.attempts.push({
            query, queryLayer:'missing-class-expansion',
            status:leads.length?'candidates-found':'searched-empty',
            candidatesReturned:leads.length,
            recordsConsidered:Array.isArray(payload.value?.result?.results)?payload.value.result.results.length:0,
            provenance:snapshot.retrieval, failureReason:null,
            cumulativeUniqueCandidates:candidates.length,
            expectedFamilies:coverage.expectedFamilies,
            observedFamilies:coverage.observedFamilies,
            missingFamilies:coverage.missingFamilies,
            missingClasses:interventionClassCoverage(problem,workspace,candidates).missingClasses
          });
          sourceSearch.queriesAttempted += 1;
          sourceSearch.usableQueryCount += 1;
          sourceSearch.candidatesReturned += leads.length;
        } catch(error) {
          sourceSearch.attempts.push({query,queryLayer:'missing-class-expansion',status:'search-failed',candidatesReturned:0,recordsConsidered:0,provenance:null,failureReason:error?.message||'source-driven-search-failed',cumulativeUniqueCandidates:candidates.length});
          sourceSearch.queriesAttempted += 1;
          sourceSearch.failedQueryCount += 1;
        }
      }
      sourceSearch.missingFamilies = coverage.missingFamilies;
      sourceSearch.observedFamilies = coverage.observedFamilies;
      sourceSearch.expectedFamilies = coverage.expectedFamilies;
    }
  }
  if (false && candidates.length === 0 && sourceSearches.some(search => search.status !== 'search-failed')) {
    const exploratory = buildTaxonomyExplorationLeads(problem, workspace, candidates);
    if (exploratory.length) {
      rawCandidates.push(...exploratory);
      candidates = deduplicateInterventionLeads(rawCandidates);
      coverage = discoveryCoverage(problem, workspace, candidates);
      sourceSearches.push({ sourceId: 'vidik-intervention-taxonomy', sourceType: 'taxonomy-expansion', jurisdiction: null, originalProblem: problem, queriesAttempted: 0, failedQueryCount: 0, usableQueryCount: 1, status: 'taxonomy-expansion-used', candidatesReturned: exploratory.length, attempts: [], expectedFamilies: coverage.expectedFamilies, observedFamilies: coverage.observedFamilies, missingFamilies: coverage.missingFamilies, failureReason: null });
    }
  }
  const classCoverage=interventionClassCoverage(problem,workspace,candidates);
  const diagnosticCounts={
    noCandidates:candidates.length===0,
    candidateUniverseWeak:candidates.length>0&&(coverage.expectedFamilies.length>0&&coverage.coverageRatio<DISCOVERY_TARGET_FAMILY_COVERAGE),
    classCoverageWeak:candidates.length>0&&classCoverage.expectedClasses.length>0&&classCoverage.coverageRatio<0.5,
    missingFamilies:coverage.missingFamilies,
    missingClasses:classCoverage.missingClasses,
    sourceFailures:sourceSearches.filter(s=>s.status==='search-failed').map(s=>s.sourceId),
    queryExpansionUsed:sourceSearches.some(s=>s.attempts?.some(a=>a.queryLayer&&a.queryLayer!=='original')),
    missingOptionSearchUsed:sourceSearches.some(s=>s.attempts?.some(a=>a.queryLayer==='missing-family-expansion'||a.queryLayer==='missing-class-expansion')),
    missingOptionSearches:sourceSearches.reduce((n,s)=>n+(s.attempts||[]).filter(a=>a.queryLayer==='missing-family-expansion'||a.queryLayer==='missing-class-expansion').length,0)
  };
  const universe=buildInterventionUniverseAssessment({problem,jurisdiction,sourceSearches,candidates:rawCandidates,requestedSourceCount:selected.length + sourceSearches.filter(search=>search.sourceId==='openalex-works').length});
  universe.expectedInterventionFamilies=coverage.expectedFamilies;universe.observedInterventionFamilies=coverage.observedFamilies;universe.missingInterventionFamilies=coverage.missingFamilies;universe.coverageRatio=coverage.coverageRatio;universe.expectedInterventionClasses=classCoverage.expectedClasses;universe.observedInterventionClasses=classCoverage.representedClasses;universe.missingInterventionClasses=classCoverage.missingClasses;universe.classCoverageRatio=classCoverage.coverageRatio;universe.discoveryExpandedWhenWeak=sourceSearches.some(s=>s.queriesAttempted>1);
  universe.diagnosticCounts=diagnosticCounts;
  universe.stoppingReason=sourceSearches.length===0?'no-source-searches':sourceSearches.every(s=>s.status==='search-failed')?'all-sources-failed':candidates.length===0?'no-intervention-candidates':coverage.missingFamilies.length?'candidate-universe-incomplete':'candidate-universe-discovered';
  return {schemaVersion:'vidik.source-driven-intervention-discovery.v9',problem,workspace,sourcesSelected:selected.map(s=>s.sourceId),discoveryQueries:queries,sourceApplicability:applicability,sourceSearches,rawCandidateCount:rawCandidates.length,candidates,interventionUniverse:universe,discoveryHash:sha256({problem,workspace,sourceApplicability:applicability,discoveryQueries:queries,sourceSearches,candidates:candidates.map(candidate=>({id:candidate.id,name:candidate.name,canonicalName:candidate.canonicalName,interventionFamily:candidate.interventionFamily,discovery:candidate.discovery}))}),recommendationEligible:false};
}
module.exports = { LEGACY_INTERVENTION_CLASSES, NON_INTERVENTION_ARTIFACT_PATTERNS, legacyClassTerms, interventionClassCoverage, missingInterventionClassSearchQueries, DISCOVERY_MAX_QUERIES_PER_SOURCE, DISCOVERY_MIN_UNIQUE_CANDIDATES, DISCOVERY_TARGET_FAMILY_COVERAGE, CKAN_SOURCE_IDS, DISCOVERY_SYNONYM_GROUPS, DISCOVERY_RECALL_PACKS, discoveryRecallTerms, expandDiscoveryVocabulary, GOVUK_SOURCE_IDS, WORKSPACE_TAXONOMIES, inferWorkspaceDomains, taxonomyTerms, isActionableInterventionTitle, expectedInterventionFamilies, discoveryCoverage, interventionMatchesProblem, INTERVENTION_FAMILIES, buildCkanSearchUrl, buildGovUkSearchUrl, buildDiscoveryQueries, buildLiteratureFallbackQueries, normalizeInterventionName, inferInterventionFamily, classifyCkanRecord, extractCkanInterventionLeads, extractGovUkInterventionLeads, canonicalSource, sourceMatchesJurisdiction, selectInterventionSources, buildApplicabilityAudit, deduplicateInterventionLeads, buildInterventionUniverseAssessment, extractOpenAlexInterventionLeads, extractCrossrefInterventionLeads, discoverSourceDrivenInterventions };