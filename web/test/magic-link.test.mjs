import test from 'node:test';
import assert from 'node:assert/strict';
import { createMagicLinkSender, MAGIC_LINK_RESEND_COOLDOWN_SECONDS } from '../public/magic-link.js';

test('a magic link can be resent after the configured cooldown', async () => {
  let time = 0;
  const sent = [];
  const sender = createMagicLinkSender({
    auth: { signInWithOtp: async input => { sent.push(input); return { error: null }; } },
    redirectTo: 'http://localhost:3000/login.html',
    now: () => time
  });

  assert.equal(MAGIC_LINK_RESEND_COOLDOWN_SECONDS, 5);
  assert.deepEqual(await sender.request('buyer@example.com'), { ok: true, retryAfterSeconds: MAGIC_LINK_RESEND_COOLDOWN_SECONDS });
  assert.deepEqual(sent[0], { email: 'buyer@example.com', options: { shouldCreateUser: true, emailRedirectTo: 'http://localhost:3000/login.html' } });
  time += MAGIC_LINK_RESEND_COOLDOWN_SECONDS * 1_000;
  assert.deepEqual(await sender.request('buyer@example.com'), { ok: true, retryAfterSeconds: MAGIC_LINK_RESEND_COOLDOWN_SECONDS });
});

test('a provider failure is safe to show in the magic-link UI', async () => {
  const sender = createMagicLinkSender({ auth: { signInWithOtp: async () => ({ error: new Error('Email rate limit exceeded') }) } });
  assert.deepEqual(await sender.request('buyer@example.com'), {
    ok: false,
    reason: 'provider',
    message: 'We could not send a sign-in link right now. Please wait a minute and try again.'
  });
});
