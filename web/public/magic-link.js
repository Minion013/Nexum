export const MAGIC_LINK_RESEND_COOLDOWN_SECONDS = 5;
const cooldownMs = MAGIC_LINK_RESEND_COOLDOWN_SECONDS * 1_000;

export function createMagicLinkSender({ auth, redirectTo, now = () => Date.now() }) {
  const lastSentAt = new Map();
  return {
    async request(email) {
      const previousRequest = lastSentAt.get(email);
      const retryAfterMs = previousRequest === undefined ? 0 : cooldownMs - (now() - previousRequest);
      if (retryAfterMs > 0) return { ok: false, reason: 'cooldown', retryAfterSeconds: Math.ceil(retryAfterMs / 1_000) };
      const { error } = await auth.signInWithOtp({ email, options: { shouldCreateUser: true, ...(redirectTo ? { emailRedirectTo: redirectTo } : {}) } });
      if (error) return { ok: false, reason: 'provider', message: 'We could not send a sign-in link right now. Please wait a minute and try again.' };
      lastSentAt.set(email, now());
      return { ok: true, retryAfterSeconds: cooldownMs / 1_000 };
    }
  };
}
