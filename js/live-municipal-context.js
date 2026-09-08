'use strict';
(function(root){
  root.VIDIK_LIVE_MUNICIPAL_CONTEXT = root.VIDIK_LIVE_MUNICIPAL_CONTEXT || Object.create(null);
  if (typeof root.render !== 'function') return;
  const baseRender = root.render;
  root.render = function(){
    const result = baseRender.apply(this, arguments);
    const city = document.getElementById('city')?.value;
    const live = city ? root.VIDIK_LIVE_MUNICIPAL_CONTEXT[city] : null;
    if (live) {
      const auditEl = document.getElementById('audit');
      const pipelineEl = document.getElementById('pipeline');
      if (auditEl) {
        try {
          const audit = JSON.parse(auditEl.textContent || '{}');
          audit.municipal_live_evidence = {
            status: live.status,
            city: live.city,
            sourceUrl: live.sourceUrl,
            datasetId: live.datasetId,
            retrievedAt: live.retrievedAt,
            normalizedSha256: live.normalizedSha256,
            recordCount: live.recordCount,
            role: 'validated-context; not a causal effect estimate'
          };
          auditEl.textContent = JSON.stringify(audit, null, 2);
        } catch {}
      }
      if (pipelineEl) pipelineEl.textContent = 'Live municipal evidence → validated provenance/context → verified evidence → typed claims → parameter lineage → admissibility gate → optimizer → audit.';
    }
    return result;
  };
})(typeof window !== 'undefined' ? window : globalThis);
