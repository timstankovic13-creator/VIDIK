'use strict';

const assert = require('assert');
const { runDecisionPipeline } = require('../src/full-scope/orchestrator');

const pipeline = runDecisionPipeline('Reduce violent crime', [
  { id:'lead', name:'Community intervention', discoveryOnly:true, leadOnly:true },
  { id:'verified', name:'Verified local intervention', discoveryOnly:false, leadOnly:false,
    evidence:[
      {id:'e1',sourceId:'study-a',design:'rct',verification:{status:'verified'}},
      {id:'e2',sourceId:'study-b',design:'quasi-experimental',verification:{status:'verified'}}
    ],
    parameters:[{id:'p',effect:5,effectUnit:'incidents',resource:100,resourceUnit:'dollars',verified:true,sourceIds:['study-a','study-b']}]
  }
], {
  statusQuo:{explicit:true,description:'Continue current approach'},
  intelligenceFoundation:{
    candidates:[
      {id:'lead',name:'Community intervention',description:'community direct service',sourceId:'study-a'},
      {id:'verified',name:'Verified local intervention',description:'community direct service',sourceId:'study-b'}
    ],
    sourceRegistry:[
      {id:'study-a',evidenceTypes:['causal','equity'],independenceGroup:'study-a'},
      {id:'study-b',evidenceTypes:['causal','equity'],independenceGroup:'study-b'}
    ]
  }
});

assert.ok(pipeline.intelligenceFoundation, 'production pipeline must expose the foundation when requested');
assert.strictEqual(pipeline.intelligenceFoundation.recommendationAuthority, false);
assert.strictEqual(pipeline.intelligenceFoundation.parameterMutationAllowed, false);
assert.strictEqual(pipeline.intelligenceFoundation.effectsImported, false);
assert.strictEqual(pipeline.readyForArtifact, true);
assert.strictEqual(pipeline.intelligenceFoundation.universe.recommendationAllowed, false);
assert.ok(pipeline.intelligenceFoundation.universe.auditHash.length === 64);

const blockedFoundation = runDecisionPipeline('Reduce violent crime', [], {
  statusQuo:{explicit:true},
  intelligenceFoundation:{candidates:[]}
});
assert.strictEqual(blockedFoundation.recommendation.allowed, false);
assert.strictEqual(blockedFoundation.readyForArtifact, false);
assert.strictEqual(blockedFoundation.intelligenceFoundation.universe.searchRequired, true);

console.log('intelligence foundation orchestrator integration: PASS');
