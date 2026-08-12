import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthorizationError, createApp, createAuthorityRegistryLoader, localTestProfileFromEnvironment, ServiceUnavailableError } from '../src/server.mjs';

async function start(options) {
  const server = createApp(options);
  await new Promise(resolve => server.listen(0, resolve));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function request(origin, path, { token, headers = {} } = {}) {
  return fetch(`${origin}${path}`, { headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers } });
}

test('the Authority Registry endpoint is authenticated and returns only safe published fields', async () => {
  const calls = [];
  const registry = {
    entries: [{ id: 'authority-id', name: 'PactFlow Simulation Authority', jurisdictionLabel: 'Testnet simulation', rulesetVersion: 'v1', isSimulated: true }]
  };
  const { server, origin } = await start({
    verifySupabaseSession: async token => {
      if (token !== 'authority-jwt') throw new Error('invalid token');
      return { id: 'authority-profile-id', email: 'authority@example.test' };
    },
    loadAuthorities: async input => {
      calls.push(input);
      return registry;
    }
  });
  try {
    assert.equal((await request(origin, '/api/authorities')).status, 401);
    const response = await request(origin, '/api/authorities', { token: 'authority-jwt' });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { authorities: registry });
    assert.deepEqual(calls, [{ userId: 'authority-profile-id', accessToken: 'authority-jwt' }]);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('the durable Authority Registry loader reads published authorities through the caller session and strips unsafe fields', async () => {
  const calls = [];
  const loader = createAuthorityRegistryLoader(
    { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_example' },
    () => ({
      from: table => {
        assert.equal(table, 'resolution_authorities');
        return {
          select: fields => {
            calls.push({ operation: 'select', fields });
            return {
              eq: (column, value) => {
                calls.push({ operation: 'eq', column, value });
                return {
                  order: async (orderColumn, options) => {
                    calls.push({ operation: 'order', orderColumn, options });
                    return { data: [{ id: 'authority-id', display_name: 'Published Authority', jurisdiction_label: 'Singapore', ruleset_version: 'v2', is_simulated: false, slug: 'private-slug', created_at: 'private-timestamp' }], error: null };
                  }
                };
              }
            };
          }
        };
      }
    })
  );
  assert.deepEqual(await loader({ userId: 'profile-id', accessToken: 'authority-jwt' }), {
    entries: [{ id: 'authority-id', name: 'Published Authority', jurisdictionLabel: 'Singapore', rulesetVersion: 'v2', isSimulated: false }]
  });
  assert.deepEqual(calls, [
    { operation: 'select', fields: 'id, display_name, jurisdiction_label, ruleset_version, is_simulated' },
    { operation: 'eq', column: 'status', value: 'published' },
    { operation: 'order', orderColumn: 'display_name', options: { ascending: true } }
  ]);
});

test('Authority Registry service and authorization failures preserve truthful API status codes', async () => {
  const verifySupabaseSession = async () => ({ id: 'authority-profile-id', email: 'authority@example.test' });
  const unavailable = await start({ verifySupabaseSession, loadAuthorities: async () => { throw new ServiceUnavailableError('Registry backend is unavailable.'); } });
  const forbidden = await start({ verifySupabaseSession, loadAuthorities: async () => { throw new AuthorizationError('Registry access is restricted.'); } });
  try {
    const unavailableResponse = await request(unavailable.origin, '/api/authorities', { token: 'any-token' });
    assert.equal(unavailableResponse.status, 503);
    assert.deepEqual(await unavailableResponse.json(), { error: 'Registry backend is unavailable.' });
    const forbiddenResponse = await request(forbidden.origin, '/api/authorities', { token: 'any-token' });
    assert.equal(forbiddenResponse.status, 403);
    assert.deepEqual(await forbiddenResponse.json(), { error: 'Registry access is restricted.' });
  } finally {
    await new Promise(resolve => unavailable.server.close(resolve));
    await new Promise(resolve => forbidden.server.close(resolve));
  }
});

test('the documented loopback fixture can read the Authority Registry only with the configured test email', async () => {
  const localTestProfile = localTestProfileFromEnvironment({ PACTFLOW_LOCAL_TEST_EMAIL: 'pactflow-wallet-test@local.invalid' });
  const { server, origin } = await start({ localTestProfile });
  try {
    assert.equal((await request(origin, '/api/authorities')).status, 401);
    assert.equal((await request(origin, '/api/authorities', { headers: { 'x-pactflow-local-test-email': 'wrong@local.invalid' } })).status, 401);
    const response = await request(origin, '/api/authorities', { headers: { 'x-pactflow-local-test-email': localTestProfile.email } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      authorities: {
        entries: [{ id: '00000000-0000-4000-8000-000000000201', name: 'PactFlow Simulation Authority', jurisdictionLabel: 'Testnet simulation', rulesetVersion: 'v1', isSimulated: true }]
      }
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
