'use strict';
const scenarios = require('../data/VIDIK_PUBLIC_SAFETY_5M_SCENARIOS.json');
const { allocateFiveMillion } = require('./vidik-public-safety-5m-lab');

const expectations = {
  'LAB-01': r => r.allocations.A === 3000000,
  'LAB-02': r => r.allocations.A === 3000000 && r.allocations.B === 2000000,
  'LAB-03': r => r.allocations.A === 0 && r.allocations.B === 4000000 && r.riskCeiling === 0.5,
  'LAB-04': r => r.allocations.A === 1000000 && r.allocations.B === 4000000,
  'LAB-05': r => r.allocations.A === 2500000 && r.allocations.B === 2500000,
  'LAB-06': r => r.allocations.A === 5000000,
  'LAB-07': r => Object.values(r.allocations).every(v => v === 0) && r.unallocated === 5000000 && r.riskCeiling === 0.5,
  'LAB-08': r => r.allocations.A >= 1000000,
  'LAB-09': r => r.allocations.B === 5000000,
  'LAB-10': r => r.allocations.A === 5000000
};
const riskCeilings = { 'LAB-03':0.5, 'LAB-07':0.5 };

function runBenchmark() {
  const results = scenarios.map(s => {
    const result = allocateFiveMillion(s, riskCeilings[s.id] ?? 1);
    return { id:s.id, pass:Boolean(expectations[s.id]?.(result)), allocations:result.allocations, riskCeiling:result.riskCeiling, productionRecommendation:result.productionRecommendation ?? null, effectEstimate:result.effectEstimate ?? null, roi:result.roi ?? null };
  });
  return { total:results.length, passed:results.filter(x=>x.pass).length, failed:results.filter(x=>!x.pass).length, results, productionPromotionCount:results.filter(x=>x.productionRecommendation !== null || x.effectEstimate !== null || x.roi !== null).length };
}

if (require.main === module) console.log(JSON.stringify(runBenchmark(),null,2));
module.exports = { runBenchmark };
