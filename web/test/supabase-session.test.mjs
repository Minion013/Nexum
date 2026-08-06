import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp, createProfileLoader } from '../src/server.mjs';

async function start(options) {
  const server = createApp(options);
  await new Promise(resolve => server.listen(0, resolve));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function request(origin, path, { token, method = 'GET', body } = {}) {
  return fetch(`${origin}${path}`, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
}

test('a verified Supabase session exposes the durable profile and protects application routes', async () => {
  const calls = [];
  const profileCalls = [];
  const { server, origin } = await start({
    verifySupabaseSession: async token => {
      calls.push(token);
      if (token !== 'current-supabase-jwt') throw new Error('invalid token');
      return { id: '11111111-1111-4111-8111-111111111111', email: 'buyer@example.com' };
    },
    loadProfile: async ({ userId, accessToken }) => {
      profileCalls.push({ userId, accessToken });
      return { id: userId, displayName: 'Buyer', email: 'buyer@example.com' };
    }
  });
  try {
    const session = await request(origin, '/api/session', { token: 'current-supabase-jwt' });
    assert.equal(session.status, 200);
    assert.deepEqual(await session.json(), {
      user: {
        id: '11111111-1111-4111-8111-111111111111',
        email: 'buyer@example.com',
        profile: {
          id: '11111111-1111-4111-8111-111111111111',
          displayName: 'Buyer',
          email: 'buyer@example.com'
        }
      },
      mode: 'supabase-auth'
    });
    assert.deepEqual(calls, ['current-supabase-jwt']);
    assert.deepEqual(profileCalls, [{ userId: '11111111-1111-4111-8111-111111111111', accessToken: 'current-supabase-jwt' }]);
    assert.equal((await request(origin, '/api/agreement', { token: 'expired-supabase-jwt' })).status, 401);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('an authenticated user can view only their provisioned workspaces', async () => {
  const workspaceCalls = [];
  const { server, origin } = await start({
    verifySupabaseSession: async token => {
      if (token !== 'workspace-jwt') throw new Error('invalid token');
      return { id: '33333333-3333-4333-8333-333333333333', email: 'case.officer@example.com' };
    },
    loadWorkspaces: async input => {
      workspaceCalls.push(input);
      return [{ id: '44444444-4444-4444-8444-444444444444', name: 'Case Officer', kind: 'personal', membershipRole: 'owner' }];
    }
  });
  try {
    const response = await request(origin, '/api/workspaces', { token: 'workspace-jwt' });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      workspaces: [{ id: '44444444-4444-4444-8444-444444444444', name: 'Case Officer', kind: 'personal', membershipRole: 'owner' }]
    });
    assert.deepEqual(workspaceCalls, [{
      userId: '33333333-3333-4333-8333-333333333333',
      accessToken: 'workspace-jwt'
    }]);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('the browser receives only Supabase public configuration', async () => {
  const { server, origin } = await start({
    publicSupabaseConfig: { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_example' }
  });
  try {
    const config = await request(origin, '/api/auth/config');
    assert.equal(config.status, 200);
    assert.deepEqual(await config.json(), {
      url: 'https://project.supabase.co',
      publishableKey: 'sb_publishable_example',
      mode: 'supabase-auth'
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('a verified user without a profile is provisioned into incomplete setup before profile access is checked', async () => {
  const calls = [];
  const loadProfile = createProfileLoader(
    { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_example' },
    () => ({
      rpc: async name => {
        calls.push({ operation: 'rpc', name });
        return { error: null };
      },
      from: table => ({
        select: fields => ({
          eq: (column, value) => ({
            single: async () => {
              calls.push({ operation: 'select', table, fields, column, value });
              return { data: { id: value, email: 'new@example.com', display_name: 'New participant', onboarding_completed_at: null }, error: null };
            }
          })
        })
      })
    })
  );

  assert.deepEqual(
    await loadProfile({ userId: '22222222-2222-4222-8222-222222222222', accessToken: 'new-participant-jwt' }),
    { id: '22222222-2222-4222-8222-222222222222', email: 'new@example.com', displayName: 'New participant', onboardingCompletedAt: null }
  );
  assert.deepEqual(calls, [
    { operation: 'rpc', name: 'ensure_profile' },
    { operation: 'select', table: 'profiles', fields: 'id, email, display_name, onboarding_completed_at', column: 'id', value: '22222222-2222-4222-8222-222222222222' }
  ]);
});

test('a verified participant completes first-time setup only after choosing local demo access', async () => {
  const completed = [];
  const { server, origin } = await start({
    verifySupabaseSession: async token => {
      if (token !== 'new-participant-jwt') throw new Error('invalid token');
      return { id: '22222222-2222-4222-8222-222222222222', email: 'new@example.com' };
    },
    loadProfile: async ({ userId }) => ({ id: userId, displayName: 'New participant', email: 'new@example.com', onboardingCompletedAt: null }),
    completeProfileOnboarding: async input => {
      completed.push(input);
      return { id: input.userId, displayName: 'New participant', email: 'new@example.com', onboardingCompletedAt: '2026-08-06T00:00:00.000Z' };
    }
  });
  try {
    assert.equal((await request(origin, '/api/onboarding/complete', { method: 'POST' })).status, 401);
    assert.equal((await request(origin, '/api/onboarding/complete', { method: 'POST', token: 'new-participant-jwt' })).status, 409);
    assert.equal((await request(origin, '/api/session', { method: 'POST', token: 'new-participant-jwt', body: { role: 'buyer' } })).status, 201);
    const completedResponse = await request(origin, '/api/onboarding/complete', { method: 'POST', token: 'new-participant-jwt' });
    assert.equal(completedResponse.status, 200);
    assert.equal((await completedResponse.json()).profile.onboardingCompletedAt, '2026-08-06T00:00:00.000Z');
    assert.deepEqual(completed, [{ userId: '22222222-2222-4222-8222-222222222222', accessToken: 'new-participant-jwt' }]);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
