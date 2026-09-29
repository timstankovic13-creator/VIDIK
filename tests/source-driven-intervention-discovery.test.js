  const result = await discoverSourceDrivenInterventions({
    problem: 'reduce violent crime',
    jurisdiction: 'CA',
    sources: [SOURCE],
    fetchImpl: async () => {
      calls += 1;
      return { ok: false, status: 503, headers: { get: () => null }, arrayBuffer: async () => Buffer.alloc(0) };
    }
  });
  const search = result.sourceSearches.find(item => item.sourceId === SOURCE.sourceId);
  assert.ok(search);
  assert.equal(search.routeExpansion, false);
  assert.equal(search.failedQueryCount, 3);
  assert.equal(search.queriesAttempted, 3);
  assert.ok(search.failureRatio >= 0.5);
  assert.equal(search.skippedQueries, 15);
  assert.equal(search.attempts.filter(attempt => attempt.queryPhase === 'expansion').length, 0);
  assert.equal(calls, 9);
});

test('repeated retryable source failures are bounded without hiding the failure', async () => {