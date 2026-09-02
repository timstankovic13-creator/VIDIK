'use strict';

const HISTORICAL_HASH='git:fee012fab5c2a4437f0a63c754e1ce70a9f3b696';
const cases=[
 {caseId:'004',candidateId:'OPS_FRONTLINE_STAFFING',status:'BLOCKED',marginalUnit:'deployable officer-hours or FTE-hours',blocker:'candidate-specific marginal effect and counterfactual'},
 {caseId:'005',candidateId:'OC_TRANSIT_SPECIAL_CONSTABLES',status:'BLOCKED',marginalUnit:'deployable special-constable hours/FTE-hours',blocker:'candidate-specific outcome and causal chain'},
 {caseId:'006',candidateId:'ANCHOR',status:'PROSPECTIVE_ONLY',marginalUnit:'deployable ANCHOR response/team-hours or calls served',blocker:'not an operating intervention at the historical boundary'},
 {caseId:'007',candidateId:'DOWNTOWN_SAFETY_OUTREACH',status:'BLOCKED',marginalUnit:'outreach worker-hours/team-hours',blocker:'candidate-specific causal exposure and attribution'},
 {caseId:'008',candidateId:'YOUTH_SOCIAL_DEVELOPMENT',status:'BLOCKED',marginalUnit:'incremental program slots/youth served or staff-hours',blocker:'historical candidate definition and causal chain'},
 {caseId:'009',candidateId:'TRAFFIC_SAFETY_ACTION',status:'BLOCKED',marginalUnit:'component-specific resource unit',blocker:'whole-plan attribution and component decomposition'},
 {caseId:'010',candidateId:'RED_LIGHT_CAMERA',status:'BLOCKED',marginalUnit:'deployable camera/site-year or enforcement exposure',blocker:'candidate-specific reconstruction, attribution and serious-harm chain'},
 {caseId:'011',candidateId:'FIRE_RESPONSE_CAPACITY',status:'BLOCKED',marginalUnit:'deployable fire crew-hours/apparatus-hours',blocker:'clean marginal intervention and outcome chain'},
 {caseId:'012',candidateId:'COMMUNITY_PARAMEDIC_SUPPORTS',status:'BLOCKED',marginalUnit:'community-paramedic visit/team-hours or eligible-patient service dose',blocker:'historical candidate definition and marginal exposure'},
 {caseId:'013',candidateId:'OPS_BODY_WORN_CAMERAS',status:'BLOCKED',marginalUnit:'camera-equipped deployable officer-hours/FTE-hours',blocker:'historical admissibility and candidate-specific causal design'},
 {caseId:'014',candidateId:'EMERGENCY_SHELTER_CAPACITY',status:'BLOCKED',marginalUnit:'incremental shelter bed-night capacity or funded bed/service package',blocker:'candidate-specific outcome/system-outcome chain'}
].map(c=>Object.freeze({...c,historicalDecisionHash:HISTORICAL_HASH,recommendation:'NO RECOMMENDATION'}));

function getCase(caseId){return cases.find(c=>c.caseId===String(caseId))||null;}
function validateCaseRegistry(){
 const failures=[];
 for(const c of cases){
  if(c.historicalDecisionHash!==HISTORICAL_HASH) failures.push(`${c.caseId}:historical-hash`);
  if(!['BLOCKED','PROSPECTIVE_ONLY'].includes(c.status)) failures.push(`${c.caseId}:status`);
  if(c.recommendation!=='NO RECOMMENDATION') failures.push(`${c.caseId}:recommendation`);
  if(!c.marginalUnit||!c.blocker) failures.push(`${c.caseId}:contract-metadata`);
 }
 return {eligible:false,caseCount:cases.length,failures};
}
module.exports={HISTORICAL_HASH,cases,getCase,validateCaseRegistry};
