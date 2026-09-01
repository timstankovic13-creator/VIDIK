const {test}=require('@playwright/test');
const assert=require('assert');
const m=require('../js/outcome-learning-14.js');

test('blocked Case 001 gets a prospective learning schedule',()=>{
  const p=m.plan({decisionId:'case001-historical',municipality:'Ottawa',status:'BLOCKED',recommendation:null,boundaryDate:'2023-12-06',metrics:[{metricId:'capacity',name:'additional supportive housing capacity',unit:'units'},{metricId:'housing',name:'stable housing',unit:'people'}]});
  assert.equal(p.ok,true);assert.deepEqual(p.plan.checkpoints.map(x=>x.checkpoint),['6-month','1-year','2-year','5-year']);assert.deepEqual(p.plan.checkpoints.map(x=>x.dueDate),['2024-06-06','2024-12-06','2025-12-06','2028-12-06']);assert.equal(p.plan.baseline.required,true);assert.deepEqual(p.plan.causalChain,['resource','capacity','activity','outcome','systemOutcome']);
});

test('checkpoint records require finite observed values and can trigger recalibration',()=>{
  const input={decisionId:'case001-historical',municipality:'Ottawa',status:'BLOCKED',recommendation:null,boundaryDate:'2023-12-06',metrics:[{metricId:'housing',name:'stable housing',unit:'people'}]};
  const r=m.recordCheckpoint(input,'1-year',{recordedAt:'2024-12-10',metrics:[{metricId:'housing',observed:398}],recalibrationRecommended:true});
  assert.equal(r.ok,true);assert.equal(r.record.checkpoint,'1-year');assert.equal(r.record.recalibrationRecommended,true);assert.equal(m.recordCheckpoint(input,'1-year',{metrics:[{metricId:'housing',observed:Infinity}]}).ok,false);assert.equal(m.recordCheckpoint(input,'9-year',{metrics:[{metricId:'housing',observed:1}]}).ok,false);
});

test('invalid blocked state cannot smuggle in a recommendation',()=>{
  const r=m.plan({decisionId:'x',municipality:'Ottawa',status:'BLOCKED',recommendation:'housing',boundaryDate:'2023-12-06',metrics:[{metricId:'m',name:'metric',unit:'people'}]});
  assert.equal(r.ok,false);
});
