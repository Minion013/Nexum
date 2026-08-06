import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.mjs';

async function start(options) {
  const server = createApp(options);
  await new Promise(resolve => server.listen(0, resolve));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function request(origin, path, { token, method = 'GET' } = {}) {
  return fetch(`${origin}${path}`, {
    method,
    headers: token ? { authorization: `Bearer ${token}` } : undefined
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
