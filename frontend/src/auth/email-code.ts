export const EMAIL_CODE_RESEND_COOLDOWN_SECONDS = 5;
const cooldownMs = EMAIL_CODE_RESEND_COOLDOWN_SECONDS * 1_000;

type EmailAuth = {
  signInWithOtp(input: { email: string; options: { shouldCreateUser: boolean } }): Promise<{ error?: unknown | null }>;
  verifyOtp(input: { email: string; token: string; type: 'email' }): Promise<{ data?: { session?: unknown | null } | null; error?: unknown | null }>;
};

export type EmailCodeResult =
  | { ok: true; retryAfterSeconds: number }
  | { ok: false; reason: 'cooldown'; retryAfterSeconds: number }
  | { ok: false; reason: 'invalid-code' | 'provider'; message: string };

export function createEmailCodeSender({ auth, now = () => Date.now() }: { auth: EmailAuth; now?: () => number }): {
  request(email: string): Promise<EmailCodeResult>;
  verify(email: string, code: string): Promise<Exclude<EmailCodeResult, { ok: true; retryAfterSeconds: number }> | { ok: true }>;
} {
  const lastSentAt = new Map<string, number>();
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
