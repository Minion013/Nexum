// @ts-nocheck
export const EMAIL_CODE_RESEND_COOLDOWN_SECONDS = 5;
const cooldownMs = EMAIL_CODE_RESEND_COOLDOWN_SECONDS * 1_000;

export function createEmailCodeSender({ auth, now = () => Date.now() }) {
  const lastSentAt = new Map();
  return {
    async request(email) {
      const previousRequest = lastSentAt.get(email);
      const retryAfterMs = previousRequest === undefined ? 0 : cooldownMs - (now() - previousRequest);
      if (retryAfterMs > 0) return { ok: false, reason: 'cooldown', retryAfterSeconds: Math.ceil(retryAfterMs / 1_000) };
      const { error } = await auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) return { ok: false, reason: 'provider', message: 'We could not send a sign-in code right now. Please wait a minute and try again.' };
      lastSentAt.set(email, now());
      return { ok: true, retryAfterSeconds: EMAIL_CODE_RESEND_COOLDOWN_SECONDS };
    },
    async verify(email, code) {
      if (!/^\d{6}$/.test(code)) return { ok: false, reason: 'invalid-code', message: 'Enter the six-digit sign-in code from your email.' };
      const { data, error } = await auth.verifyOtp({ email, token: code, type: 'email' });
      if (error || !data?.session) return { ok: false, reason: 'provider', message: 'This sign-in code is invalid or expired. Request a new code and try again.' };
      return { ok: true };
    }
  };
}
