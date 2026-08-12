import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmailCodeSender, EMAIL_CODE_RESEND_COOLDOWN_SECONDS } from '../../frontend/public/email-code.bundle.js';

test('an email sign-in code is requested without a redirect URL and can be verified', async () => {
  let time = 0;
  const calls = [];
  const sender = createEmailCodeSender({
    auth: {
      signInWithOtp: async input => { calls.push({ operation: 'send', input }); return { error: null }; },
      verifyOtp: async input => { calls.push({ operation: 'verify', input }); return { data: { session: { access_token: 'session-token' } }, error: null }; }
    },
    now: () => time
  });

  assert.equal(EMAIL_CODE_RESEND_COOLDOWN_SECONDS, 5);
  assert.deepEqual(await sender.request('buyer@example.com'), { ok: true, retryAfterSeconds: EMAIL_CODE_RESEND_COOLDOWN_SECONDS });
  assert.deepEqual(calls[0], { operation: 'send', input: { email: 'buyer@example.com', options: { shouldCreateUser: true } } });
  assert.deepEqual(await sender.verify('buyer@example.com', '123456'), { ok: true });
  assert.deepEqual(calls[1], { operation: 'verify', input: { email: 'buyer@example.com', token: '123456', type: 'email' } });
  time += EMAIL_CODE_RESEND_COOLDOWN_SECONDS * 1_000;
  assert.deepEqual(await sender.request('buyer@example.com'), { ok: true, retryAfterSeconds: EMAIL_CODE_RESEND_COOLDOWN_SECONDS });
});

test('an invalid or expired email code returns a safe retry message', async () => {
  const sender = createEmailCodeSender({
    auth: { verifyOtp: async () => ({ data: { session: null }, error: new Error('otp expired') }) }
  });

  assert.deepEqual(await sender.verify('buyer@example.com', '123456'), {
    ok: false,
    reason: 'provider',
    message: 'This sign-in code is invalid or expired. Request a new code and try again.'
  });
  assert.deepEqual(await sender.verify('buyer@example.com', 'not-a-code'), {
    ok: false,
    reason: 'invalid-code',
    message: 'Enter the six-digit sign-in code from your email.'
  });
});
