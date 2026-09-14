'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const D=require('../src/full-scope/decision-engine');
const O=require('../src/full-scope/optimizer');
const R=require('../src/full-scope/orchestrator');
const A=require('../src/full-scope/artifact-engine');
const L=require('../src/full-scope/learning-engine');
const X=require('../src/full-scope/discovery-engine');
const ev=(sourceId,id=sourceId,design='quasi-experimental',extra={})=>({id,sourceId,design,verified:true,...extra});
const good=(id='a',effect=10,resource=100)=>({id,name:id,discoveryOnly:false,leadOnly:false,effectsImported:false,evidence:[ev(`${id}-s1`),ev(`${id}-s2`)],parameters:[{effect,resource,effectUnit:'incidents avoided',resourceUnit:'dollars',verified:true,sourceIds:[`${id}-p1`,`${id}-p2`]}]});
const status={explicit:true,id:'sq',description:'Continue current approach'};
const blocked=(r,why)=>{assert.equal(r.allowed,false);assert.ok(r.blockedReasons?.includes(why)||r.reasons?.includes(why),why)};

test('missing candidate IDs are deterministic',()=>{const a=D.normalizeCandidate({name:'no id'}),b=D.normalizeCandidate({name:'no id'});assert.equal(a.id,b.id)});
test('evidence independence means distinct verified source IDs',()=>{const c=good();c.evidence=[ev('same','1'),ev('same','2')];assert.equal(D.evidenceState(c).hasIndependentCausalEvidence,false);c.evidence.push(ev('other'));assert.equal(D.evidenceState(c).hasIndependentCausalEvidence,true)});
test('imported effects never become admissible evidence',()=>{const c=good();c.evidence=[ev('one','1','rct',{importedEffect:true}),ev('two','2','rct',{importedEffect:true})];const s=D.evidenceState(c);assert.equal(s.hasIndependentCausalEvidence,false);assert.equal(s.importedEffectCount,2)});
test('observational evidence cannot masquerade as causal',()=>{const x=D.classifyEvidence({id:'x',sourceId:'s',design:'cross-sectional descriptive survey',verified:true});assert.equal(x.causal,false);assert.equal(x.admissible,false)});
test('parameter provenance requires two sources',()=>{const c=good();c.parameters[0].sourceIds=['one'];assert.equal(D.parameterState(c).independentlySourced,false);blocked(D.recommendationGate(c,{problem:'reduce harm',statusQuo:status}),'independently-verified-parameter-missing')});
test('all A-E gates fail closed independently',()=>{const c=good();blocked(D.recommendationGate(c,{problem:'',statusQuo:status}),'problem-not-defined');blocked(D.recommendationGate(c,{problem:'x',statusQuo:{}}),'status-quo-missing');c.evidence=[];blocked(D.recommendationGate(c,{problem:'x',statusQuo:status}),'independent-causal-evidence-missing');c.evidence=[ev('1'),ev('2')];c.parameters[0].verified=false;blocked(D.recommendationGate(c,{problem:'x',statusQuo:status}),'independently-verified-parameter-missing');c.parameters[0].verified=true;c.parameters[0].resourceUnit=null;blocked(D.recommendationGate(c,{problem:'x',statusQuo:status}),'resource-effect-units-missing')});
test('discovery/lead defaults cannot become recommendation authority',()=>{const c=good();c.discoveryOnly=undefined;c.leadOnly=undefined;blocked(D.recommendationGate(c,{problem:'x',statusQuo:status}),'discovery-lead-not-recommendation')});
test('explicitly promoted candidate can pass the gate',()=>assert.equal(D.recommendationGate(good(),{problem:'x',statusQuo:status}).allowed,true));
test('status quo preserves zero values',()=>{const s=D.buildStatusQuo({effect:0,resource:0,effectUnit:'events',resourceUnit:'dollars',observed:true});assert.equal(s.effect,0);assert.equal(s.resource,0);assert.equal(s.observed,true)});

for(const [label,value] of [['NaN',NaN],['Infinity',Infinity],['-Infinity',-Infinity],['string NaN','NaN'],['empty','']])test(`non-finite effect blocks: ${label}`,()=>{const c=good('bad');c.parameters[0].effect=value;const r=O.admissible(c);assert.ok(r.reasons.includes('positive-effect-required'))});
test('zero and negative resources block',()=>{for(const v of [0,-1,'0','-10']){const r=O.admissible(good('r',10,v));assert.ok(r.reasons.includes('positive-resource-required'))}});
test('raw/parameter numeric conflicts are not silently normalized',()=>{const c=good('conflict');c.effect=99;const r=O.admissible(c);assert.ok(r.reasons.includes('effect-parameter-conflict'))});
test('raw/parameter unit conflicts are rejected',()=>{const c=good('units');c.effectUnit='lives saved';c.resourceUnit='hours';const r=O.admissible(c);assert.ok(r.reasons.includes('effect-unit-parameter-conflict'));assert.ok(r.reasons.includes('resource-unit-parameter-conflict'))});
test('incomparable effect units close optimization',()=>{const a=good('a'),b=good('b');b.parameters[0].effectUnit='hospitalizations avoided';const r=O.optimize('health',[a,b]);assert.equal(r.comparable,false);assert.equal(r.selected,null)});
test('incomparable resource units close optimization',()=>{const a=good('a'),b=good('b');b.parameters[0].resourceUnit='staff-hours';const r=O.optimize('health',[a,b]);assert.equal(r.comparable,false);assert.equal(r.selected,null)});
test('malformed candidates do not crash a valid universe',()=>{const r=O.optimize('crime',[null,{},good('valid')]);assert.equal(r.selected.candidateId,'valid')});
test('budget infeasibility is explicit',()=>{const r=O.optimize('x',[good('a',10,100),good('b',8,80)],{budget:10});assert.equal(r.selected,null);assert.equal(r.blocked.length,0)});
test('opportunity cost is not attributed to a dominated alternative',()=>{const r=O.optimize('x',[good('a',10,100),good('b',9,200)]);assert.ok(r.opportunityCost);assert.notEqual(r.opportunityCost.againstCandidateId,'b')});

test('sensitivity unnamed scenarios are stable',()=>{const r=D.sensitivity(good('s'),[{effect:5,resource:100,baselineRatio:.1,recommendationEligible:true}]);assert.equal(r.defined,true);assert.equal(r.scenarios[0].id,'scenario-1')});
test('sensitivity closes invalid parameters',()=>{const c=good('s');c.parameters[0].resource=NaN;assert.equal(D.sensitivity(c,[]).defined,false)});
test('VOI never propagates Infinity/negative values',()=>{const r=D.estimateVOI({uncertainty:-5,decisionGap:Infinity,researchCost:-2});assert.ok(Number.isFinite(r.valueOfInformation));assert.ok(Number.isFinite(r.netValue))});

test('arbitrary problem vocabulary expands across major domains',()=>{for(const p of ['violent crime','opioid overdose','flood risk','housing instability','road deaths','unemployment','school attendance','air pollution','small business failure'])assert.ok(X.expandProblem(p).length>0)});
test('discovery output is always lead-only',()=>{const r=X.candidateUniverse('reduce violent crime',[{id:'x',title:'Program',sourceId:'s',description:'violent crime prevention'}]);assert.ok(r.candidates.every(c=>c.leadOnly&&c.discoveryOnly));assert.equal(r.recommendationAllowed,false);assert.equal(r.effectsImported,false)});
test('discovery records provenance gaps instead of inventing candidates',()=>{const r=X.candidateUniverse('crime',[{title:'missing source'},{sourceId:'s'}]);assert.equal(r.provenanceGaps,2);assert.equal(r.matched,0)});
test('discovery deduplicates equivalent names',()=>{const r=X.candidateUniverse('crime',[{id:'1',title:'Same Program',sourceId:'a',description:'crime safety'},{id:'2',title:'Same Program',sourceId:'b',description:'crime safety'}]);assert.equal(new Set(r.candidates.map(c=>c.name.toLowerCase())).size,r.candidates.length);assert.equal(r.matched,1)});

test('comparable-city transfer cannot carry effect values',()=>{const r=L.comparableCityTransfer({cityId:'toronto',problem:'crime',interventionId:'x',evidenceVerified:true,contextComparable:true,evidenceSetId:'set-1',effect:99});assert.equal(r.eligible,false);assert.ok(r.reasons.includes('numeric-effect-transfer-forbidden'))});
test('transfer provenance/context failures stay learning leads',()=>{const r=L.comparableCityTransfer({cityId:'x',problem:'p',interventionId:'i'});assert.equal(r.eligible,false);assert.equal(r.role,'learning-lead')});
test('outcome review is unit-safe and mutation-free',()=>{const r=L.outcomeReview({effect:10,unit:'incidents'},{effect:5,unit:'incidents'});assert.equal(r.valid,true);assert.equal(r.parameterMutationAllowed,false);assert.equal(r.updateProposalRequired,'human-review')});
test('outcome review rejects unit mismatch',()=>{assert.equal(L.outcomeReview({effect:10,unit:'incidents'},{effect:5,unit:'dollars'}).valid,false)});
test('drift is bounded and mutation-free',()=>{const r=L.detectDrift([{reviewId:'1',expectedEffect:10,observedEffect:1,unit:'incidents'}],.2);assert.equal(r.driftDetected,true);assert.equal(r.parameterMutationAllowed,false);assert.equal(r.automaticParameterUpdate,false)});
test('high/critical failures suppress recommendation',()=>{for(const severity of ['high','critical'])assert.equal(L.registerFailure({severity,category:'evidence'}).recommendationSuppressed,true)});
test('transfer set strips failed effect imports',()=>{const r=L.buildTransferSet('crime',[{cityId:'x',problem:'crime',interventionId:'i',evidenceVerified:true,contextComparable:true,evidenceSetId:'s',causalEffectImported:true}]);assert.equal(r.eligible.length,0);assert.equal(r.causalEffectImportAllowed,false)});

test('orchestrator preserves status quo and blocks leads',()=>{const r=R.runDecisionPipeline('crime',[{...good('lead'),discoveryOnly:true,leadOnly:true}],{statusQuo:status});assert.equal(r.statusQuo.explicit,true);assert.equal(r.recommendation.allowed,false)});
test('orchestrator integration blocks optimizer/gate disagreement',()=>{const c=good('x');c.effectsImported=true;const r=R.runDecisionPipeline('crime',[c],{statusQuo:status});assert.equal(r.recommendation.allowed,false);assert.deepEqual(r.blockedByIntegration,['x'])});
test('prepareAnalysis keeps parameter mutation disabled',()=>assert.equal(R.prepareAnalysis(good('x')).parameterMutationAllowed,false));
test('artifact rejects missing counterfactual',async()=>await assert.rejects(()=>A.createDecisionArtifact({problem:'x',statusQuo:status,recommendation:{allowed:true},reviewSchedule:[]}),/artifact-counterfactual-invalid/));
test('artifact is valid and tamper-evident',async()=>{const a=await A.createDecisionArtifact({problem:'x',statusQuo:status,recommendation:{allowed:true,candidateId:'x'},counterfactual:{statusQuoExplicit:true,recommendationEligible:true,effect:10,resource:100,effectUnit:'events',resourceUnit:'dollars'},reviewSchedule:[{at:'6m',purpose:'review'}]});assert.equal(A.validateDecisionArtifact(a).valid,true);assert.equal(await A.detectTamper(a,a.baselineHash),false);const c=JSON.parse(JSON.stringify(a));c.problem='tampered';assert.equal(await A.detectTamper(c,a.baselineHash),true)});
test('artifact blocks imported effects and duplicate review times',async()=>{const base={problem:'x',statusQuo:status,recommendation:{allowed:true},counterfactual:{statusQuoExplicit:true,recommendationEligible:true,effect:1,resource:1,effectUnit:'x',resourceUnit:'y'},reviewSchedule:[{at:'6m',purpose:'x'}]};await assert.rejects(()=>A.createDecisionArtifact({...base,governance:{effectsImported:true}}),/artifact-imported-effect-forbidden/);await assert.rejects(()=>A.createDecisionArtifact({...base,reviewSchedule:[{at:'6m',purpose:'x'},{at:'6m',purpose:'duplicate'}]}),/artifact-review-schedule-invalid/)});

test('end-to-end machinery refuses discovery-only evidence',()=>{const c=good('x');c.evidence=[ev('one')];assert.equal(R.runDecisionPipeline('reduce crime',[c],{statusQuo:status}).recommendation.allowed,false)});
test('end-to-end machinery refuses unverified parameters',()=>{const c=good('x');c.parameters[0].verified=false;assert.equal(R.runDecisionPipeline('reduce crime',[c],{statusQuo:status}).recommendation.allowed,false)});
test('end-to-end machinery refuses imported effects',()=>{const c=good('x');c.effectsImported=true;assert.equal(R.runDecisionPipeline('reduce crime',[c],{statusQuo:status}).recommendation.allowed,false)});
test('audit hash is deterministic',async()=>assert.equal(await D.auditHash({a:1,b:2}),await D.auditHash({a:1,b:2})));
test('optimizer sensitivity envelope is finite',()=>{const r=O.sensitivityEnvelope(good('x'));assert.ok(Number.isFinite(r.lowEfficiency));assert.ok(Number.isFinite(r.highEfficiency))});
