import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.mjs';

const tokenFor = role => `test-supabase-${role}`;

async function start() {
  const server = createApp({
    verifySupabaseSession: async accessToken => {
      if (!accessToken?.startsWith('test-supabase-')) throw new Error('invalid token');
      return { id: accessToken, email: `${accessToken.slice('test-supabase-'.length)}@example.com` };
    },
    loadProfile: async ({ userId }) => ({ id: userId, email: `${userId.slice('test-supabase-'.length)}@example.com`, displayName: 'Test participant' })
  });
  await new Promise(resolve => server.listen(0, resolve));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function api(origin, path, method = 'GET', body, token) {
  return fetch(`${origin}${path}`, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
}

async function chooseRole(origin, role) {
  return api(origin, '/api/session', 'POST', { role }, tokenFor(role));
}

test('only a verified Supabase session can create a local demo role', async () => {
  const { server, origin } = await start();
  try {
    assert.equal((await api(origin, '/api/session', 'POST', { role: 'buyer' }, 'invalid')).status, 401);
    const verified = await chooseRole(origin, 'buyer');
    assert.equal(verified.status, 201);
    assert.equal((await verified.json()).user.id, tokenFor('buyer'));
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('Supabase-authenticated participants drive the shared local simulation', async () => {
  const { server, origin } = await start();
  try {
    assert.equal((await api(origin, '/api/agreement')).status, 401);
    const buyerToken = tokenFor('buyer');
    await chooseRole(origin, 'buyer');
    assert.equal((await api(origin, '/api/agreement', 'GET', undefined, buyerToken)).status, 200);
    assert.equal((await api(origin, '/api/agreement/actions', 'POST', { type: 'approve' }, buyerToken)).status, 200);

    const invitation = await api(origin, '/api/agreement/invitations', 'POST', undefined, buyerToken);
    const { id } = await invitation.json();
    const inviteeToken = tokenFor('invitee');
    await chooseRole(origin, 'invitee');
    assert.equal((await api(origin, `/api/agreement/invitations/${id}/accept`, 'POST', undefined, inviteeToken)).status, 200);
    const approved = await api(origin, '/api/agreement/actions', 'POST', { type: 'approve' }, inviteeToken);
    assert.equal((await approved.json()).agreement.approvals.length, 2);
    const funded = await api(origin, '/api/agreement/actions', 'POST', { type: 'fund' }, buyerToken);
    assert.equal((await funded.json()).agreement.state, 'Funded');
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('uninvited Supabase accounts receive no local agreement data', async () => {
  const { server, origin } = await start();
  try {
    const buyerToken = tokenFor('buyer');
    await chooseRole(origin, 'buyer');
    const guestToken = tokenFor('guest');
    await chooseRole(origin, 'guest');
    assert.equal((await api(origin, '/api/agreement', 'GET', undefined, guestToken)).status, 403);
    assert.equal((await api(origin, '/api/agreement/actions', 'POST', { type: 'approve' }, guestToken)).status, 403);
    assert.equal((await api(origin, '/api/agreement/copilot', 'POST', { brief: 'Attempt an unauthorized agreement edit.' }, guestToken)).status, 403);
    assert.equal((await api(origin, '/api/agreement', 'GET', undefined, buyerToken)).status, 200);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
