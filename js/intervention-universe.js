'use strict';

/*
 * VIDIK Municipal Intervention Universe
 *
 * Registry = discovery surface, NOT evidence. Every item remains unverified
 * until a jurisdiction/evidence adapter establishes relevance, authority,
 * cost, capacity, effect and implementation constraints.
 *
 * Core rules:
 *   1. Status quo is always an option.
 *   2. Unknown is not excluded.
 *   3. A missing evidence adapter creates an unresolved candidate, not zero effect.
 *   4. No false completeness: optimization is blocked when material universe
 *      coverage is unresolved.
 *   5. Municipal authority is explicit; outside-authority actions cannot be
 *      silently presented as purchasable municipal interventions.
 */
const VIDIK_INTERVENTION_UNIVERSE={version:'2.0.0',principles:['DISCOVERY_BEFORE_OPTIMIZATION','UNKNOWN_IS_NOT_EXCLUDED','NO_FALSE_COMPLETENESS','STATUS_QUO_MANDATORY'],authority:['MUNICIPAL','SHARED','OUTSIDE_MUNICIPAL_AUTHORITY'],funding:['OPERATING','CAPITAL','RESERVE','GRANT','MIXED'],domains:[]};
const addDomain=(id,name,problems,items)=>VIDIK_INTERVENTION_UNIVERSE.domains.push({id,name,problems,classes:items.map(x=>x.name),items});
const I=(id,name,authority='MUNICIPAL',funding=['OPERATING','CAPITAL'],tags=[])=>({id,name,authority,funding,tags,evidenceStatus:'UNVERIFIED'});
addDomain('public-safety','Public safety & violence',['violent crime','crime','violence','assault','robbery','shooting'],[
I('ps-status-quo','Status quo / retain existing public-safety allocation'),I('ps-patrol','Police patrol deployment and staffing'),I('ps-hotspots','Hot-spots policing'),I('ps-pop','Problem-oriented policing'),I('ps-focused-deterrence','Focused deterrence'),I('ps-cvi','Community violence intervention'),I('ps-youth-violence','Youth violence prevention'),I('ps-school-partnerships','School-community safety partnerships'),I('ps-hospital-violence','Hospital-based violence intervention','SHARED',['OPERATING','GRANT']),I('ps-victim-services','Victim services and survivor supports','SHARED',['OPERATING','GRANT']),I('ps-witness','Witness support','SHARED',['OPERATING','GRANT']),I('ps-major-crime','Major-crime investigative capacity'),I('ps-gang','Group/gang violence prevention'),I('ps-crime-analysis','Crime analysis / intelligence capacity'),I('ps-community-policing','Community policing'),I('ps-neighbourhood-teams','Neighbourhood-based safety teams'),I('ps-cpted','Crime-prevention through environmental design'),I('ps-lighting','Street lighting / public-space improvements'),I('ps-transit-safety','Transit safety'),I('ps-problem-properties','Problem-property / nuisance abatement'),I('ps-safe-spaces','Safe public-space programming'),I('ps-recreation','Community recreation / youth programming'),I('ps-employment-youth','Employment and skills pathways for high-risk youth','SHARED',['OPERATING','GRANT']),I('ps-diversion','Justice-system diversion','SHARED',['OPERATING','GRANT']),I('ps-reentry','Re-entry supports','SHARED',['OPERATING','GRANT']),I('ps-domestic-violence','Domestic-violence prevention and response','SHARED',['OPERATING','GRANT']),I('ps-mental-health','Mental-health crisis response','SHARED',['OPERATING','GRANT']),I('ps-addiction','Substance-use treatment and harm reduction','SHARED',['OPERATING','GRANT']),I('ps-supportive-housing','Supportive housing / homelessness response','SHARED',['OPERATING','CAPITAL','GRANT']),I('ps-outreach','Street outreach / street medicine','SHARED',['OPERATING','GRANT']),I('ps-trauma','Trauma-informed community services','SHARED',['OPERATING','GRANT']),I('ps-ems','EMS response capacity affecting survival and downstream harm','SHARED',['OPERATING','CAPITAL']),I('ps-public-health','Public-health violence prevention','SHARED',['OPERATING','GRANT']),I('ps-data','Cross-agency data / coordination')
]);
addDomain('housing','Housing & homelessness',['housing','homelessness','shelter','housing stability'],[
I('ho-status-quo','Status quo / retain existing housing allocation'),I('ho-supportive','New supportive housing','SHARED',['OPERATING','CAPITAL','GRANT']),I('ho-housing-first','Housing First / permanent supportive housing','SHARED',['OPERATING','CAPITAL','GRANT']),I('ho-rapid-rehousing','Rapid rehousing','SHARED',['OPERATING','GRANT']),I('ho-prevention','Eviction prevention / homelessness diversion','SHARED',['OPERATING','GRANT']),I('ho-rent','Rent assistance','SHARED',['OPERATING','GRANT']),I('ho-shelter','Shelter capacity and redesign','SHARED',['OPERATING','CAPITAL','GRANT']),I('ho-outreach','Homelessness outreach','SHARED',['OPERATING','GRANT']),I('ho-services','Supportive services','SHARED',['OPERATING','GRANT']),I('ho-supply','New affordable housing supply','SHARED',['CAPITAL','GRANT']),I('ho-preservation','Affordable housing preservation','SHARED',['CAPITAL','GRANT']),I('ho-repair','Housing repair / rehabilitation','SHARED',['CAPITAL','GRANT']),I('ho-land','Municipal land strategy'),I('ho-planning','Zoning / planning reforms')
]);
addDomain('health','Public health & healthcare',['opioid','overdose','drug death','health','preventable illness'],[
I('he-status-quo','Status quo / retain existing health allocation'),I('he-primary-care','Primary-care access','SHARED',['OPERATING','CAPITAL','GRANT']),I('he-mental-health','Mental-health treatment','SHARED',['OPERATING','GRANT']),I('he-crisis','Crisis stabilization','SHARED',['OPERATING','CAPITAL','GRANT']),I('he-addiction','Addiction treatment','SHARED',['OPERATING','GRANT']),I('he-harm-reduction','Harm reduction','SHARED',['OPERATING','GRANT']),I('he-mobile','Mobile/community care','SHARED',['OPERATING','CAPITAL','GRANT']),I('he-community-workers','Community health workers','SHARED',['OPERATING','GRANT']),I('he-outreach','Public-health outreach','SHARED',['OPERATING','GRANT']),I('he-prevention','Preventive health programs','SHARED',['OPERATING','GRANT']),I('he-maternal','Maternal/child health','SHARED',['OPERATING','GRANT']),I('he-ems','EMS / paramedic capacity','SHARED',['OPERATING','CAPITAL']),I('he-diversion','Hospital diversion / alternative response','SHARED',['OPERATING','CAPITAL','GRANT'])
]);
addDomain('emergency-services','Emergency & crisis response',['paramedic','ems','emergency response','fire','911','crisis response'],[
I('em-status-quo','Status quo / retain emergency-services allocation'),I('em-staffing','Emergency staffing expansion','SHARED',['OPERATING','CAPITAL']),I('em-stations','Station/location changes','SHARED',['CAPITAL']),I('em-deployment','Emergency deployment optimization','SHARED',['OPERATING']),I('em-alternative','Alternative response','SHARED',['OPERATING','CAPITAL','GRANT']),I('em-copro','Co-response','SHARED',['OPERATING','GRANT']),I('em-community-paramedicine','Community paramedicine','SHARED',['OPERATING','GRANT']),I('em-prevention','Emergency prevention programs','SHARED',['OPERATING','GRANT']),I('em-mutual-aid','Mutual aid / partnerships','SHARED',['OPERATING','GRANT'])
]);
addDomain('transport','Roads, traffic & mobility',['road','speed','traffic','collision','crash','pedestrian','cycling','transit'],[
I('tr-status-quo','Status quo / retain transportation allocation'),I('tr-road-engineering','Road engineering'),I('tr-calming','Traffic calming'),I('tr-speed-management','Speed management'),I('tr-ase','Automated speed enforcement'),I('tr-intersections','Intersection redesign'),I('tr-active','Active transportation infrastructure'),I('tr-transit','Transit service expansion'),I('tr-transit-safety','Transit safety'),I('tr-parking','Parking / curb management'),I('tr-education','Education / enforcement'),I('tr-accessibility','Accessible transit'),I('tr-maintenance','Road/bridge maintenance')
]);
addDomain('climate-water','Climate, flooding & water',['flood','flooding','stormwater','water','heat','climate'],[
I('cw-status-quo','Status quo / retain climate-water allocation'),I('cw-green','Green infrastructure'),I('cw-stormwater','Drainage/stormwater upgrades'),I('cw-flood','Flood protection'),I('cw-land-use','Land-use controls'),I('cw-building','Building standards'),I('cw-warning','Early warning systems'),I('cw-emergency','Emergency preparedness','SHARED',['OPERATING','CAPITAL','RESERVE']),I('cw-conservation','Water conservation'),I('cw-renewal','Water/asset renewal')
]);
addDomain('environment','Environment & waste',['waste','recycling','pollution','air quality','environment'],[
I('en-status-quo','Status quo / retain environmental allocation'),I('en-collection','Collection/service redesign'),I('en-recycling','Recycling/organics'),I('en-pricing','Pricing/incentives'),I('en-regulation','Regulation'),I('en-monitoring','Monitoring/enforcement'),I('en-infrastructure','Environmental infrastructure investment'),I('en-education','Public education')
]);
addDomain('infrastructure','Infrastructure & municipal assets',['infrastructure','roads condition','bridges','asset','maintenance'],[
I('in-status-quo','Status quo / retain infrastructure allocation'),I('in-maintenance','Preventive maintenance'),I('in-renewal','Asset renewal'),I('in-replacement','Asset replacement'),I('in-new-capital','New capital'),I('in-condition','Condition-based prioritization'),I('in-demand','Demand management'),I('in-shared','Shared infrastructure','SHARED',['CAPITAL']),I('in-procurement','Procurement changes')
]);
addDomain('economic','Economic development & workforce',['employment','jobs','economic development','business','workforce'],[
I('ec-status-quo','Status quo / retain economic-development allocation'),I('ec-skills','Skills/training','SHARED',['OPERATING','GRANT']),I('ec-business','Business support','SHARED',['OPERATING','GRANT']),I('ec-procurement','Procurement/local purchasing'),I('ec-incentives','Tax/fee incentives'),I('ec-infrastructure','Economic infrastructure'),I('ec-place','Placemaking'),I('ec-partnerships','Workforce partnerships','SHARED',['OPERATING','GRANT']),I('ec-grants','Targeted grants','SHARED',['GRANT'])
]);
addDomain('poverty','Poverty, food security & basic needs',['poverty','food security','basic needs','cost of living'],[
I('po-status-quo','Status quo / retain basic-needs allocation'),I('po-income','Income-support partnerships','SHARED',['OPERATING','GRANT']),I('po-food','Food programs','SHARED',['OPERATING','GRANT']),I('po-navigation','Service navigation'),I('po-subsidy','Targeted subsidies','SHARED',['OPERATING','GRANT']),I('po-affordable-services','Affordable municipal services'),I('po-partnerships','Community partnerships','SHARED',['OPERATING','GRANT']),I('po-prevention','Prevention')
]);
addDomain('children-youth','Children, youth & families',['youth','children','families','childcare'],[
I('cy-status-quo','Status quo / retain children-youth allocation'),I('cy-early','Early intervention','SHARED',['OPERATING','GRANT']),I('cy-youth','Youth services','SHARED',['OPERATING','GRANT']),I('cy-childcare','Childcare partnerships','SHARED',['OPERATING','CAPITAL','GRANT']),I('cy-school','School/community partnerships','SHARED',['OPERATING','GRANT']),I('cy-recreation','Recreation'),I('cy-family','Family supports','SHARED',['OPERATING','GRANT']),I('cy-prevention','Targeted prevention','SHARED',['OPERATING','GRANT'])
]);
addDomain('seniors-accessibility','Seniors & accessibility',['seniors','aging','accessibility','disability'],[
I('sa-status-quo','Status quo / retain seniors-accessibility allocation'),I('sa-infrastructure','Accessible infrastructure'),I('sa-home','Home/community supports','SHARED',['OPERATING','GRANT']),I('sa-transport','Accessible transport'),I('sa-service','Service redesign'),I('sa-housing','Accessible housing','SHARED',['CAPITAL','GRANT']),I('sa-digital','Digital access'),I('sa-partnerships','Partnerships','SHARED',['OPERATING','GRANT'])
]);
addDomain('parks-community','Parks, recreation & community life',['parks','recreation','community','public space'],[
I('pc-status-quo','Status quo / retain parks-community allocation'),I('pc-facilities','Facility investment'),I('pc-programming','Programming'),I('pc-public-space','Public-space redesign'),I('pc-maintenance','Maintenance'),I('pc-partnerships','Community partnerships','SHARED',['OPERATING','GRANT']),I('pc-access','Access programs','SHARED',['OPERATING','GRANT'])
]);
addDomain('planning','Planning, land use & growth',['planning','zoning','growth','development','density'],[
I('pl-status-quo','Status quo / retain planning allocation'),I('pl-zoning','Zoning reform'),I('pl-standards','Development standards'),I('pl-sequencing','Infrastructure sequencing'),I('pl-incentives','Development incentives'),I('pl-fees','Development fees'),I('pl-land','Public land strategy'),I('pl-process','Planning process redesign')
]);
addDomain('municipal-operations','Municipal operations & service delivery',['service','operations','productivity','backlog','wait time'],[
I('mo-status-quo','Status quo / retain operations allocation'),I('mo-process','Process redesign'),I('mo-digital','Digital service'),I('mo-staffing','Workforce capacity'),I('mo-procurement','Procurement redesign'),I('mo-shared','Shared services','SHARED',['OPERATING','CAPITAL']),I('mo-automation','Automation'),I('mo-demand','Demand management'),I('mo-service-level','Service-level redesign')
]);
addDomain('revenue','Revenue, taxation & pricing',['revenue','tax','fees','pricing','budget'],[
I('re-status-quo','Status quo / existing revenue structure'),I('re-tax','Tax changes'),I('re-fees','Fee changes'),I('re-pricing','Pricing'),I('re-subsidies','Targeted subsidies'),I('re-user-charges','User charges'),I('re-diversification','Revenue diversification'),I('re-reallocation','Expenditure reallocation')
]);
addDomain('governance','Governance, participation & trust',['trust','participation','engagement','governance'],[
I('go-status-quo','Status quo / retain governance allocation'),I('go-participatory','Participatory processes'),I('go-transparency','Service transparency'),I('go-information','Information access'),I('go-institutional','Institutional redesign'),I('go-partnerships','Partnerships','SHARED',['OPERATING','GRANT']),I('go-accountability','Accountability mechanisms')
]);

function allItems(){return VIDIK_INTERVENTION_UNIVERSE.domains.flatMap(d=>d.items.map(x=>({...x,domain:d.id,domainName:d.name,problems:d.problems})))}
function normalize(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function vidikUniverseForProblem(problem){const p=normalize(problem);return VIDIK_INTERVENTION_UNIVERSE.domains.filter(d=>d.problems.some(k=>p.includes(normalize(k)))).map(d=>({domain:d.id,name:d.name,classes:d.classes,items:d.items}));}
function vidikUniverseItemsForProblem(problem){return vidikUniverseForProblem(problem).flatMap(d=>d.items.map(x=>({...x,domain:d.id,domainName:d.name})));}
function vidikUniverseHasProblem(problem){return vidikUniverseForProblem(problem).length>0}
function vidikUniverseCoverage(problem,verifiedIds=[]){const candidates=vidikUniverseItemsForProblem(problem);const v=new Set(verifiedIds);const unresolved=candidates.filter(x=>!v.has(x.id));return {candidateCount:candidates.length,verifiedCount:candidates.length-unresolved.length,coverageRatio:candidates.length?(candidates.length-unresolved.length)/candidates.length:0,complete:unresolved.length===0&&candidates.length>0,unresolved:unresolved.map(x=>({id:x.id,name:x.name,authority:x.authority})),rule:'Unknown is not excluded; incomplete material coverage blocks an optimized/comprehensive claim.'};}
const validation=(function(){const xs=allItems(),ids=new Set(),errors=[];xs.forEach(x=>{if(ids.has(x.id))errors.push('duplicate:'+x.id);ids.add(x.id);if(!VIDIK_INTERVENTION_UNIVERSE.authority.includes(x.authority))errors.push('authority:'+x.id);if(!x.funding.length)errors.push('funding:'+x.id);});return {ok:errors.length===0,count:xs.length,errors};})();
window.VIDIK_INTERVENTION_UNIVERSE=VIDIK_INTERVENTION_UNIVERSE;
window.vidikUniverseForProblem=vidikUniverseForProblem;
window.vidikUniverseItemsForProblem=vidikUniverseItemsForProblem;
window.vidikUniverseHasProblem=vidikUniverseHasProblem;
window.vidikUniverseCoverage=vidikUniverseCoverage;
window.VIDIK_INTERVENTION_UNIVERSE_VALIDATION=validation;
