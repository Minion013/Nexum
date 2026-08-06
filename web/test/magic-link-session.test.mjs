import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreMagicLinkSession } from '../public/magic-link-session.js';

test('a callback session reveals the participant role choices', async () => {
  let revealed = false;
  const result = await restoreMagicLinkSession({
    auth: { getSession: async () => ({ data: { session: { access_token: 'session-token' } }, error: null }) },
    isCallback: true,
    onAuthenticated: () => { revealed = true; },
    onCallbackFailure: () => assert.fail('A valid session must not show a failure.')
  });
  assert.deepEqual(result, { authenticated: true });
  assert.equal(revealed, true);
});

test('an invalid callback gives the participant a retry message', async () => {
  let message;
  const result = await restoreMagicLinkSession({
    auth: { getSession: async () => ({ data: { session: null }, error: new Error('otp expired') }) },
    isCallback: true,
    onAuthenticated: () => assert.fail('An invalid link must not authenticate.'),
    onCallbackFailure: value => { message = value; }
  });
  assert.deepEqual(result, { authenticated: false });
  assert.match(message, /invalid or expired/i);
});
