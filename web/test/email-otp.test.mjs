import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmailOtpSender, OTP_RESEND_COOLDOWN_SECONDS } from '../public/email-otp.js';

test('an email OTP can be resent after the Supabase cooldown', async () => {
  let time = 0;
  const sent = [];
  const sender = createEmailOtpSender({
    auth: { signInWithOtp: async input => { sent.push(input); return { error: null }; } },
    now: () => time
  });

  assert.equal(OTP_RESEND_COOLDOWN_SECONDS, 5);
  assert.deepEqual(await sender.request('buyer@example.com'), { ok: true, retryAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS });
  assert.deepEqual(await sender.request('buyer@example.com'), { ok: false, reason: 'cooldown', retryAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS });
  assert.equal(sent.length, 1);

  time += OTP_RESEND_COOLDOWN_SECONDS * 1_000;
  assert.deepEqual(await sender.request('buyer@example.com'), { ok: true, retryAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS });
  assert.equal(sent.length, 2);
  assert.deepEqual(sent[0], { email: 'buyer@example.com', options: { shouldCreateUser: true } });
});

test('a Supabase send error is safe to show to a participant', async () => {
  const sender = createEmailOtpSender({
    auth: { signInWithOtp: async () => ({ error: new Error('Email rate limit exceeded') }) }
  });

  assert.deepEqual(await sender.request('buyer@example.com'), {
    ok: false,
    reason: 'provider',
    message: 'We could not send a code right now. Please wait a minute and try again.'
  });
});
