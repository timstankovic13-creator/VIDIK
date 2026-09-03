'use strict';
const assert = require('node:assert/strict');
const { assessTransportability } = require('../js/vidik-transportability');
const good = assessTransportability({sourceCity:'Ottawa',targetCity:'Toronto',mappingsValid:true,parametersReestablished:true,provenanceValid:true});
assert.equal(good.pass,true); assert.equal(good.effectTransported,false);
for (const bad of [
  {mappingsValid:false,parametersReestablished:true,provenanceValid:true},
  {mappingsValid:true,parametersReestablished:false,provenanceValid:true},
  {mappingsValid:true,parametersReestablished:true,provenanceValid:false},
  {sourceCity:'Ottawa',targetCity:'Ottawa',mappingsValid:true,parametersReestablished:true,provenanceValid:true},
  {sourceCity:'',targetCity:'Toronto',mappingsValid:true,parametersReestablished:true,provenanceValid:true}
]) assert.equal(assessTransportability({sourceCity:'Ottawa',targetCity:'Toronto',mappingsValid:true,parametersReestablished:true,provenanceValid:true,...bad}).pass,false);
console.log('PASS — executable transportability gate refuses invalid transfer and never transports effects automatically');
