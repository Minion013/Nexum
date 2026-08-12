import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createApp, localTestProfileFromEnvironment } from '../src/server.mjs';

async function start(options) {
  const server = createApp(options);
  await new Promise(resolve => server.listen(0, resolve));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function request(origin, path, { token, headers = {} } = {}) {
  return fetch(`${origin}${path}`, {
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }
  });
}

test('landing and login are typed App Router pages without public-page rewrites', async () => {
  const landing = await readFile(new URL('../../frontend/app/page.tsx', import.meta.url), 'utf8');
  const login = await readFile(new URL('../../frontend/app/login/page.tsx', import.meta.url), 'utf8');
  const nextConfig = await readFile(new URL('../../frontend/next.config.ts', import.meta.url), 'utf8');

  assert.match(landing, /export default function LandingPage/);
  assert.match(landing, /href="\/login"/);
  assert.doesNotMatch(landing, /<script/);
  assert.match(login, /'use client'/);
  assert.match(login, /signInWithOtp/);
  assert.match(login, /verifyOtp/);
  assert.match(login, /\/api\/session/);
  assert.match(login, /\/api\/onboarding\/complete/);
  assert.doesNotMatch(nextConfig, /source: '\/'/);
  assert.doesNotMatch(nextConfig, /source: '\/login'/);
});

test('the invitation URL is a typed dynamic route with protected state handling', async () => {
  const invitation = await readFile(new URL('../../frontend/app/invitations/[invitationId]/page.tsx', import.meta.url), 'utf8');
  const invitationClient = await readFile(new URL('../../frontend/src/invitations/acceptance.tsx', import.meta.url), 'utf8');
  const nextConfig = await readFile(new URL('../../frontend/next.config.ts', import.meta.url), 'utf8');

  assert.match(invitation, /InvitationAcceptance/);
  assert.match(invitationClient, /\/api\/invitations/);
  assert.match(invitationClient, /eligible/);
  assert.match(invitationClient, /expired/);
  assert.match(invitationClient, /resolved/);
  assert.match(invitationClient, /unauthenticated/);
  assert.doesNotMatch(nextConfig, /source: '\/invitations\/:invitationId'/);
});

test('authentication boundary covers valid, expired, unauthenticated, unavailable, and invalid requests', async () => {
  const calls = [];
  const { server, origin } = await start({
    publicSupabaseConfig: { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_example' },
    verifySupabaseSession: async token => {
      calls.push(token);
      if (token !== 'current-token') throw new Error('expired');
      return { id: 'profile-id', email: 'person@example.test' };
    },
    loadProfile: async ({ userId, accessToken }) => ({ id: userId, email: 'person@example.test', displayName: 'Person', accessToken })
  });
  try {
    const valid = await request(origin, '/api/session', { token: 'current-token' });
    assert.equal(valid.status, 200);
    assert.equal((await valid.json()).user.profile.displayName, 'Person');
    assert.equal((await request(origin, '/api/session', { token: 'expired-token' })).status, 401);
    assert.equal((await request(origin, '/api/session')).status, 401);
    assert.deepEqual(calls, ['current-token', 'expired-token', undefined]);
    assert.equal((await request(origin, '/api/not-a-real-route')).status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  const unavailable = await start({ publicSupabaseConfig: { url: null, publishableKey: null } });
  try {
    const config = await request(unavailable.origin, '/api/auth/config');
    assert.equal(config.status, 200);
    assert.deepEqual(await config.json(), { url: null, publishableKey: null, mode: 'supabase-auth' });
    assert.equal((await request(unavailable.origin, '/api/session')).status, 401);
  } finally {
    await new Promise(resolve => unavailable.server.close(resolve));
  }

  const localTestProfile = localTestProfileFromEnvironment({ PACTFLOW_LOCAL_TEST_EMAIL: 'pactflow-wallet-test@local.invalid' });
  const local = await start({ localTestProfile });
  try {
    const valid = await request(local.origin, '/api/session', { headers: { 'x-pactflow-local-test-email': localTestProfile.email } });
    assert.equal(valid.status, 200);
    assert.equal((await valid.json()).mode, 'local-test-auth');
    assert.equal((await request(local.origin, '/api/session', { headers: { 'x-pactflow-local-test-email': 'wrong@local.invalid' } })).status, 401);
  } finally {
    await new Promise(resolve => local.server.close(resolve));
  }
});
