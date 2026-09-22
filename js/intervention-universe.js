'use strict';

/*
 * VIDIK Municipal Intervention Universe
 *
 * This registry defines what a municipality may reasonably consider. It is NOT
 * an evidence claim and never makes an intervention admissible by itself.
 * Evidence, transportability, local constraints and outcome comparability are
 * still enforced by the decision engine.
 */
const VIDIK_INTERVENTION_UNIVERSE={version:'1.0.0',domains:[
 {id:'public-safety',name:'Public safety & violence',problems:['violent crime','crime','violence','assault','robbery'],classes:['status-quo','hot-spots policing','problem-oriented policing','focused deterrence','community violence intervention','place/environmental prevention','youth violence prevention','hospital-based violence intervention','victim services','justice-system diversion','police deployment/resource allocation','lighting/CCTV/place management']},
 {id:'housing',name:'Housing & homelessness',problems:['housing','homelessness','shelter','housing stability'],classes:['status-quo','supportive housing','housing first','rapid rehousing','prevention/diversion','rent assistance','support services','new affordable housing supply','zoning/planning reform','shelter/service redesign']},
 {id:'health',name:'Public health & healthcare',problems:['opioid','overdose','drug death','health','preventable illness'],classes:['status-quo','prevention','harm reduction','treatment access','outreach','primary care expansion','mobile/community care','screening','public-health regulation','health-system coordination']},
 {id:'emergency-services',name:'Emergency & crisis response',problems:['paramedic','ems','emergency response','fire','911','crisis response'],classes:['status-quo','staffing expansion','station/location changes','deployment optimization','alternative response','co-response','community paramedicine','prevention','mutual aid/partnerships']},
 {id:'transport',name:'Roads, traffic & mobility',problems:['road','speed','traffic','collision','crash','pedestrian','cycling','transit'],classes:['status-quo','road engineering','traffic calming','speed management','automated enforcement','intersection redesign','active transportation','transit service','parking/pricing','education/enforcement']},
 {id:'climate-water',name:'Climate, flooding & water',problems:['flood','flooding','stormwater','water','heat','climate'],classes:['status-quo','green infrastructure','drainage/stormwater upgrades','flood protection','land-use controls','building standards','early warning','emergency preparedness','water conservation','asset renewal']},
 {id:'environment',name:'Environment & waste',problems:['waste','recycling','pollution','air quality','environment'],classes:['status-quo','collection/service redesign','recycling/organics','pricing/incentives','regulation','monitoring/enforcement','infrastructure investment','public education']},
 {id:'infrastructure',name:'Infrastructure & municipal assets',problems:['infrastructure','roads condition','bridges','asset','maintenance'],classes:['status-quo','maintenance','renewal','replacement','new capital','condition-based prioritization','demand management','shared infrastructure','procurement changes']},
 {id:'economic',name:'Economic development & workforce',problems:['employment','jobs','economic development','business','workforce'],classes:['status-quo','skills/training','business support','procurement/local purchasing','tax/fee incentives','infrastructure','placemaking','partnerships','targeted grants']},
 {id:'poverty',name:'Poverty, food security & basic needs',problems:['poverty','food security','basic needs','cost of living'],classes:['status-quo','income supports','food programs','service navigation','targeted subsidies','affordable services','partnerships','prevention']},
 {id:'children-youth',name:'Children, youth & families',problems:['youth','children','families','childcare'],classes:['status-quo','early intervention','youth services','childcare','school/community partnerships','recreation','family supports','targeted prevention']},
 {id:'seniors-accessibility',name:'Seniors & accessibility',problems:['seniors','aging','accessibility','disability'],classes:['status-quo','accessible infrastructure','home/community supports','transport','service redesign','housing','digital access','partnerships']},
 {id:'parks-community',name:'Parks, recreation & community life',problems:['parks','recreation','community','public space'],classes:['status-quo','facility investment','programming','public-space redesign','maintenance','community partnerships','access programs']},
 {id:'planning',name:'Planning, land use & growth',problems:['planning','zoning','growth','development','density'],classes:['status-quo','zoning reform','development standards','infrastructure sequencing','incentives','fees','public land strategy','planning process redesign']},
 {id:'municipal-operations',name:'Municipal operations & service delivery',problems:['service','operations','productivity','backlog','wait time'],classes:['status-quo','process redesign','digital service','staffing','procurement','shared services','automation','demand management','service-level redesign']},
 {id:'revenue',name:'Revenue, taxation & pricing',problems:['revenue','tax','fees','pricing','budget'],classes:['status-quo','tax changes','fee changes','pricing','targeted subsidies','user charges','revenue diversification','expenditure reallocation']},
 {id:'governance',name:'Governance, participation & trust',problems:['trust','participation','engagement','governance'],classes:['status-quo','participatory processes','service transparency','information access','institutional redesign','partnerships','accountability mechanisms']}
]};

function vidikUniverseForProblem(problem){
 const p=String(problem||'').toLowerCase();
 return VIDIK_INTERVENTION_UNIVERSE.domains.filter(d=>d.problems.some(k=>p.includes(k))).map(d=>({domain:d.id,name:d.name,classes:d.classes}));
}
function vidikUniverseHasProblem(problem){return vidikUniverseForProblem(problem).length>0}
