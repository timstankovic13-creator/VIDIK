'use strict';
const { retrieve, parsePayload, sha256 } = require('./data-acquisition');
const { SOURCE_REGISTRY } = require('./source-registry');
// PATCH_REQUEST: restore independent source-text relevance for query-backed literature leads.
// The prior implementation used interventionMatchesProblem() against a candidate whose name
// was itself derived from the query term. That made the relevance check circular: unrelated
// literature could manufacture a lead because the synthetic candidate name matched the problem.
// The complete file must be regenerated from the existing branch content with only this logic
// changed; this marker is intentionally temporary and must not remain in production.
