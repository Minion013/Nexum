import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.mjs';

async function start(options) {
  const verifier = async (accessToken) => {
    if (!accessToken?.startsWith('test-privy-')) throw new Error('invalid test token');
    return { userId: accessToken, expiresAt: Date.now() + 60_000, walletAddresses: [testWallet(accessToken)] };
  };
  const server = createApp({ verifyAccessToken: verifier, ...options });
  await new Promise(resolve => server.listen(0, resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  return { server, origin };
}
function testWallet(accessToken) {
  const suffix = ({ 'test-privy-buyer': '0001', 'test-privy-seller': '0002', 'test-privy-resolver': '0003', 'test-privy-guest': '0004', 'test-privy-invitee': '0005' })[accessToken] ?? '0006';
  return `0x${suffix.padStart(40, '0')}`;
}
async function api(origin, path, method = 'GET', body, cookie) {
  const accessToken = `test-privy-${body?.role}`;
  const authenticatedBody = path === '/api/session' && method === 'POST' && body && !body.accessToken ? { ...body, accessToken, identityToken: `test-identity-${body.role}`, walletAddress: testWallet(accessToken) } : body;
  return fetch(`${origin}${path}`, { method, headers: { ...(authenticatedBody ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) }, body: authenticatedBody ? JSON.stringify(authenticatedBody) : undefined });
}

test('only a verified Privy access token can create a participant session', async () => {
  const { server, origin } = await start({
    verifyAccessToken: async (accessToken) => {
      if (accessToken !== 'valid-privy-token') throw new Error('invalid token');
      return { userId: 'did:privy:buyer', expiresAt: Date.now() + 60_000, walletAddresses: ['0x0000000000000000000000000000000000001234'] };
    }
  });
  try {
    assert.equal((await api(origin, '/api/session', 'POST', { role: 'buyer', accessToken: 'invalid-token' })).status, 401);
    const foreignWallet = await api(origin, '/api/session', 'POST', { role: 'buyer', accessToken: 'valid-privy-token', walletAddress: '0x0000000000000000000000000000000000009999' });
    assert.equal(foreignWallet.status, 403);
    assert.equal((await foreignWallet.json()).code, 'wallet_not_linked');
    const verified = await api(origin, '/api/session', 'POST', { role: 'buyer', accessToken: 'valid-privy-token', walletAddress: '0x0000000000000000000000000000000000001234' });
    assert.equal(verified.status, 201);
    assert.deepEqual(await verified.json(), { role: 'buyer', userId: 'did:privy:buyer', walletAddress: '0x0000000000000000000000000000000000001234', mode: 'privy-testnet' });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('local sessions enforce participant-only agreement access and drive shared local state', async () => {
  const { server, origin } = await start();
  try {
    assert.equal((await api(origin, '/api/agreement')).status, 401);
    const invalid = await api(origin, '/api/session', 'POST', { role: 'outsider' });
    assert.equal(invalid.status, 400);

    const buyerLogin = await api(origin, '/api/session', 'POST', { role: 'buyer' });
    const buyerCookie = buyerLogin.headers.get('set-cookie').split(';')[0];
    await buyerLogin.clone().json();
    assert.equal((await api(origin, '/api/session', 'POST', { role: 'buyer' })).status, 201);
    assert.equal((await api(origin, '/api/agreement', 'GET', undefined, buyerCookie)).status, 200);
    assert.equal((await api(origin, '/api/agreement/actions', 'POST', { type: 'approve' }, buyerCookie)).status, 200);

    const invitation = await api(origin, '/api/agreement/invitations', 'POST', undefined, buyerCookie);
    const { id } = await invitation.json();
    const sellerLogin = await api(origin, '/api/session', 'POST', { role: 'invitee' });
    const sellerCookie = sellerLogin.headers.get('set-cookie').split(';')[0];
    assert.equal((await api(origin, `/api/agreement/invitations/${id}/accept`, 'POST', undefined, sellerCookie)).status, 200);
    const approved = await api(origin, '/api/agreement/actions', 'POST', { type: 'approve' }, sellerCookie);
    assert.equal((await approved.json()).agreement.approvals.length, 2);

    const funded = await api(origin, '/api/agreement/actions', 'POST', { type: 'fund' }, buyerCookie);
    assert.equal((await funded.json()).agreement.state, 'Funded');
    assert.equal((await api(origin, '/api/agreement', 'GET', undefined, sellerCookie)).status, 200);
    assert.equal((await api(origin, '/api/session', 'POST', { role: 'buyer' })).status, 201);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('co-pilot suggestions stay editable drafts and unrelated sessions receive no agreement data', async () => {
  const { server, origin } = await start();
  try {
    const buyerLogin = await api(origin, '/api/session', 'POST', { role: 'buyer' });
    const buyerCookie = buyerLogin.headers.get('set-cookie').split(';')[0];
    const suggestion = await api(origin, '/api/agreement/copilot', 'POST', { brief: 'Create a responsive portfolio with a design handoff.' }, buyerCookie);
    assert.equal(suggestion.status, 200);
    const suggestionBody = await suggestion.json();
    assert.match(suggestionBody.notice, /cannot approve terms, release funds, judge quality, or resolve disputes/i);
    assert.equal(suggestionBody.terms.milestones.length, 2);

    const saved = await api(origin, '/api/agreement/draft', 'PUT', { terms: { ...suggestionBody.terms, scope: 'An editable portfolio agreement' } }, buyerCookie);
    assert.equal(saved.status, 200);
    assert.equal((await saved.json()).agreement.version, 2);

    const guestLogin = await api(origin, '/api/session', 'POST', { role: 'guest' });
    const guestCookie = guestLogin.headers.get('set-cookie').split(';')[0];
    assert.equal((await api(origin, '/api/agreement', 'GET', undefined, guestCookie)).status, 403);
    assert.equal((await api(origin, '/api/agreement/actions', 'POST', { type: 'approve' }, guestCookie)).status, 403);
    assert.equal((await api(origin, '/api/agreement/copilot', 'POST', { brief: 'Attempt an unauthorized agreement edit.' }, guestCookie)).status, 403);
    assert.equal((await api(origin, '/api/agreement/draft', 'PUT', { terms: suggestionBody.terms }, guestCookie)).status, 403);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('an invitee must accept the intended one-time invitation before becoming a participant', async () => {
  const { server, origin } = await start();
  try {
    const buyerLogin = await api(origin, '/api/session', 'POST', { role: 'buyer' });
    const buyerCookie = buyerLogin.headers.get('set-cookie').split(';')[0];
    const invitation = await api(origin, '/api/agreement/invitations', 'POST', undefined, buyerCookie);
    assert.equal(invitation.status, 201);
    const invitationBody = await invitation.json();
    assert.equal(invitationBody.invitedRole, 'seller');

    const guestLogin = await api(origin, '/api/session', 'POST', { role: 'guest' });
    const guestCookie = guestLogin.headers.get('set-cookie').split(';')[0];
    assert.equal((await api(origin, '/api/agreement', 'GET', undefined, guestCookie)).status, 403);
    assert.equal((await api(origin, `/api/agreement/invitations/${invitationBody.id}/accept`, 'POST', undefined, guestCookie)).status, 403);
    const inviteeLogin = await api(origin, '/api/session', 'POST', { role: 'invitee' });
    const inviteeCookie = inviteeLogin.headers.get('set-cookie').split(';')[0];
    const accepted = await api(origin, `/api/agreement/invitations/${invitationBody.id}/accept`, 'POST', undefined, inviteeCookie);
    assert.equal(accepted.status, 200);
    assert.equal((await accepted.json()).role, 'seller');
    assert.equal((await api(origin, '/api/agreement', 'GET', undefined, inviteeCookie)).status, 200);

    const secondInviteeLogin = await api(origin, '/api/session', 'POST', { role: 'invitee' });
    const secondInviteeCookie = secondInviteeLogin.headers.get('set-cookie').split(';')[0];
    assert.equal((await api(origin, `/api/agreement/invitations/${invitationBody.id}/accept`, 'POST', undefined, secondInviteeCookie)).status, 422);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('an expired local participant session cannot read or act on an agreement', async () => {
  let time = 1_000;
  const { server, origin } = await start({ now: () => time });
  try {
    const buyerLogin = await api(origin, '/api/session', 'POST', { role: 'buyer' });
    const buyerCookie = buyerLogin.headers.get('set-cookie').split(';')[0];
    time += 8 * 60 * 60 * 1_000 + 1;
    assert.equal((await api(origin, '/api/agreement', 'GET', undefined, buyerCookie)).status, 401);
    assert.equal((await api(origin, '/api/agreement/actions', 'POST', { type: 'approve' }, buyerCookie)).status, 401);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
