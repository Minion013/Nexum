import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.mjs';

async function start() {
  const server = createApp();
  await new Promise(resolve => server.listen(0, resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  return { server, origin };
}
async function api(origin, path, method = 'GET', body, cookie) {
  return fetch(`${origin}${path}`, { method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
}

test('local sessions enforce participant-only agreement access and drive shared local state', async () => {
  const { server, origin } = await start();
  try {
    assert.equal((await api(origin, '/api/agreement')).status, 401);
    const invalid = await api(origin, '/api/session', 'POST', { role: 'outsider' });
    assert.equal(invalid.status, 400);

    const buyerLogin = await api(origin, '/api/session', 'POST', { role: 'buyer' });
    const buyerCookie = buyerLogin.headers.get('set-cookie').split(';')[0];
    assert.equal((await api(origin, '/api/agreement', 'GET', undefined, buyerCookie)).status, 200);
    assert.equal((await api(origin, '/api/agreement/actions', 'POST', { type: 'approve' }, buyerCookie)).status, 200);

    const sellerLogin = await api(origin, '/api/session', 'POST', { role: 'seller' });
    const sellerCookie = sellerLogin.headers.get('set-cookie').split(';')[0];
    const approved = await api(origin, '/api/agreement/actions', 'POST', { type: 'approve' }, sellerCookie);
    assert.equal((await approved.json()).agreement.approvals.length, 2);

    const funded = await api(origin, '/api/agreement/actions', 'POST', { type: 'fund' }, buyerCookie);
    assert.equal((await funded.json()).agreement.state, 'Funded');
    assert.equal((await api(origin, '/api/agreement', 'GET', undefined, sellerCookie)).status, 200);
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
