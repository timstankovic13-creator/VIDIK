'use strict';
const assert=require('assert');
const m=require('../js/municipal-retrospective-shadow-12.js');
const cases=[
 {municipality:'Ottawa',jurisdiction:'CA-ON',source:{provider:'City of Ottawa',url:'https://documents.ottawa.ca/sites/default/files/2024HHReport_EN.pdf',recordId:'ottawa-hh-2024',publishedAt:'2025-01-01'},decision:{decisionId:'ottawa-shadow-2024',decisionDate:'2024-12-31',recommendation:'housing'},evidence:{claims:[{claimId:'o1',sourceRecordId:'ottawa-hh-2024',asOf:'2024-12-31'}]},outcome:{metric:'Housing First housed count',measuredAt:'2025-12-31',observed:398},comparison:{actualDecision:'housing'}},
 {municipality:'Toronto',jurisdiction:'CA-ON',source:{provider:'City of Toronto',url:'https://www.toronto.ca/',recordId:'toronto-shelter-2024',publishedAt:'2025-01-01'},decision:{decisionId:'toronto-shadow-2024',decisionDate:'2024-12-31',recommendation:'supportive-housing'},evidence:{claims:[{claimId:'t1',sourceRecordId:'toronto-shelter-2024',asOf:'2024-12-31'}]},outcome:{metric:'people moved to permanent housing',measuredAt:'2025-12-31',observed:4300},comparison:{actualDecision:'shelter-expansion'}},
 {municipality:'Melbourne',jurisdiction:'AU-VIC',source:{provider:'City of Melbourne',url:'https://www.melbourne.vic.gov.au/',recordId:'melbourne-make-room',publishedAt:'2024-12-31'},decision:{decisionId:'melbourne-shadow-2024',decisionDate:'2024-12-31',recommendation:'supportive-housing'},evidence:{claims:[{claimId:'m1',sourceRecordId:'melbourne-make-room',asOf:'2024-12-31'}]},outcome:{metric:'housing/support outcome',measuredAt:'2025-12-31',observed:1},comparison:{actualDecision:'supportive-housing'}}
];
for(const c of cases){const p=m.prepare(c);assert.equal(p.ok,true,c.municipality);const s=m.shadowDecision(c);assert.equal(s.ok,true,c.municipality);assert.equal(s.shadow.futureEvidenceUsed,false);assert.equal(s.shadow.contemporaneousOnly,true);assert.deepEqual(s.shadow.evidenceRecordIds,[c.source.recordId]);}
const base=cases[0];
assert.equal(m.prepare({...base,evidence:{claims:[{claimId:'future',sourceRecordId:base.source.recordId,asOf:'2025-01-02'}]}}).ok,false);
assert.equal(m.prepare({...base,source:{...base.source,publishedAt:'2025-02-01'}}).ok,false);
assert.equal(m.prepare({...base,evidence:{claims:[{claimId:'wrong-source',sourceRecordId:'other',asOf:'2024-12-31'}]}}).ok,false);
assert.equal(m.prepare({...base,outcome:{...base.outcome,observed:NaN}}).ok,false);
const divergent=m.shadowDecision({...base,comparison:{actualDecision:'status-quo'}});assert.equal(divergent.shadow.divergence,true);
const same=m.shadowDecision({...base,comparison:{actualDecision:base.decision.recommendation}});assert.equal(same.shadow.divergence,false);
const tampered=m.shadowDecision({...base,decision:{...base.decision,recommendation:'different'}});assert.equal(tampered.ok,true);assert.notEqual(tampered.shadow.recommendation,base.decision.recommendation);
console.log('municipal retrospective + shadow decision v12 extensive tests: PASS (3 jurisdictions, temporal leakage, provenance, source dating, outcomes, divergence)');
