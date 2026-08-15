import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFrontendModule } from './load-frontend-module.mjs';

const { apiRequest, clearApiRequestCache } = await loadFrontendModule('src/auth/client.ts', { external: ['@supabase/supabase-js'] });

test('deduplicates cached GETs and invalidates them after a mutation', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ calls }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  clearApiRequestCache();
  try {
    const auth = { localTestEmail: 'fixture@example.test' };
    const [first, second] = await Promise.all([
      apiRequest('/api/contracts', {}, auth),
      apiRequest('/api/contracts', {}, auth)
    ]);
    assert.equal(calls, 1);
    assert.deepEqual(first, second);

    await apiRequest('/api/contracts', {}, auth);
    assert.equal(calls, 1);
    await apiRequest('/api/contracts', { method: 'POST', body: '{}' }, auth);
    assert.equal(calls, 2);
    await apiRequest('/api/contracts', {}, auth);
    assert.equal(calls, 3);
  } finally {
    clearApiRequestCache();
    globalThis.fetch = originalFetch;
  }
});
