'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { apiRequest, createBrowserSupabase, getAuthConfig, localFixtureEmail, type AuthConfig, type Profile, type SessionPayload } from '../../src/auth/client';

type Step = 'email' | 'code' | 'account' | 'onboarding';

const RESEND_COOLDOWN_SECONDS = 5;

export default function LoginPage() {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [code, setCode] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const localFixture = useRef<string | null>(null);

  const showError = useCallback((error: unknown) => {
    setMessage(error instanceof Error ? error.message : 'The request failed. Please try again.');
  }, []);

  const loadAuthenticatedSession = useCallback(async (accessToken: string | null, localTestEmail: string | null = null) => {
    const session = await apiRequest<SessionPayload>('/api/session', {}, { accessToken: accessToken ?? undefined, localTestEmail: localTestEmail ?? undefined });
    setProfile(session.user.profile);
    setSessionToken(accessToken);
    setStep(session.user.profile.onboardingCompletedAt ? 'account' : 'onboarding');
    return session;
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const nextConfig = await getAuthConfig();
        const client = nextConfig.url && nextConfig.publishableKey ? createBrowserSupabase(nextConfig) : null;
        if (!active) return;
        setConfig(nextConfig);
        setSupabase(client);
        if (client) {
          const { data: { session } } = await client.auth.getSession();
          if (session?.access_token) await loadAuthenticatedSession(session.access_token);
        }
      } catch (error) {
        if (active) showError(error);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [loadAuthenticatedSession, showError]);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setInterval(() => setCooldown(value => Math.max(0, value - 1)), 1_000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function sendEmailCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    const candidate = email.trim().toLowerCase();
    if (!candidate) { setMessage('Enter your email address.'); return; }
    if (cooldown) { setMessage(`Please wait ${cooldown} seconds before requesting another code.`); return; }
    setBusy(true);
    try {
      if (!config) throw new Error('Sign-in is not configured for this environment.');
      const fixtureEmail = localFixtureEmail(config, candidate, window.location.hostname);
      if (fixtureEmail) {
        localFixture.current = fixtureEmail;
        window.sessionStorage.setItem('pactflow-local-test-email', fixtureEmail);
        const session = await loadAuthenticatedSession(null, fixtureEmail);
        if (session.mode === 'local-test-auth') window.location.assign('/wallet');
        return;
      }
      if (!supabase) throw new Error('Sign-in is not configured for this environment.');
      const { error } = await supabase.auth.signInWithOtp({ email: candidate, options: { shouldCreateUser: true } });
      if (error) throw new Error('We could not send a sign-in code right now. Please wait a minute and try again.');
      setSentEmail(candidate);
      setCode('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStep('code');
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmailCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (!/^\d{6}$/.test(code.trim())) { setMessage('Enter the six-digit sign-in code from your email.'); return; }
    setBusy(true);
    try {
      if (!supabase) throw new Error('Sign-in is not configured for this environment.');
      const { data, error } = await supabase.auth.verifyOtp({ email: sentEmail, token: code.trim(), type: 'email' });
      if (error || !data.session?.access_token) throw new Error('This sign-in code is invalid or expired. Request a new code and try again.');
      await loadAuthenticatedSession(data.session.access_token);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  async function continueToHome() {
    setMessage('');
    setBusy(true);
    try {
      if (!profile) throw new Error('Your sign-in session is unavailable. Please sign in again.');
      if (!profile.onboardingCompletedAt) {
        await apiRequest('/api/onboarding/complete', { method: 'POST' }, { accessToken: sessionToken ?? undefined, localTestEmail: localFixture.current ?? undefined });
      }
      window.location.assign('/home');
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  function continueAsAccount() {
    if (profile?.onboardingCompletedAt) void continueToHome();
    else {
      setMessage('');
      setStep('onboarding');
    }
  }

  async function useDifferentAccount() {
    setMessage('');
    setBusy(true);
    try {
      await supabase?.auth.signOut();
      window.sessionStorage.removeItem('pactflow-local-test-email');
      localFixture.current = null;
      setProfile(null);
      setSessionToken(null);
      setEmail('');
      setStep('email');
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-header"><a className="brand" href="/">Pact<span>Flow</span></a><a className="back-link" href="/">← Back to home</a></header>
      <main className="auth-main">
        <section className="auth-card" aria-labelledby="login-title">
          {step === 'email' && <>
            <p className="eyebrow">PactFlow account</p>
            <h1 id="login-title">Sign in or create your account.</h1>
            <p className="auth-intro">Use the same six-digit email code whether you are new here or returning.</p>
            <form onSubmit={sendEmailCode} noValidate>
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={event => setEmail(event.target.value)} />
              <button className="button button-dark auth-submit" type="submit" disabled={busy || loading}>Send sign-in code</button>
            </form>
            <p className="auth-assurance">No password to remember. We never reveal whether an email already has an account.</p>
          </>}

          {step === 'code' && <section className="email-sent" aria-labelledby="email-sent-title">
            <div className="email-icon" aria-hidden="true">@</div>
            <p className="eyebrow">One more step</p>
            <h1 id="email-sent-title">Check your inbox.</h1>
            <p className="auth-intro">We sent a six-digit sign-in code to <strong>{sentEmail}</strong>.</p>
            <form onSubmit={verifyEmailCode} noValidate><label htmlFor="code">Six-digit sign-in code</label><input id="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="123456" required value={code} onChange={event => setCode(event.target.value)} /><button className="button button-dark auth-submit" type="submit" disabled={busy}>Verify sign-in code</button></form>
            <div className="email-actions"><button className="button button-dark" type="button" disabled={busy || loading || cooldown > 0} onClick={() => void sendEmailCode({ preventDefault: () => undefined } as FormEvent<HTMLFormElement>)}>{cooldown ? `Resend sign-in code (${cooldown}s)` : 'Resend sign-in code'}</button><button className="text-button" type="button" disabled={busy} onClick={() => { setStep('email'); setMessage(''); setCooldown(0); }}>Use a different email</button></div>
            <p className="auth-assurance">The code works for both new and returning PactFlow accounts.</p>
          </section>}

          {step === 'account' && <section className="access-choice" aria-labelledby="account-choice-title">
            <p className="eyebrow">Signed in</p>
            <h1 id="account-choice-title">Continue as {profile?.displayName || 'your PactFlow account'}?</h1>
            <p className="auth-intro">This account is signed in on this device. Continue only if it is yours.</p>
            <button className="button button-dark auth-submit" type="button" disabled={busy} onClick={continueAsAccount}>Continue</button>
            <button className="text-button" type="button" disabled={busy} onClick={() => void useDifferentAccount()}>Use a different account</button>
          </section>}

          {step === 'onboarding' && <section className="access-choice" aria-labelledby="onboarding-title">
            <p className="eyebrow">Welcome to PactFlow</p>
            <h1 id="onboarding-title">Your PactFlow Profile is ready.</h1>
            <p className="auth-intro">Start a private Contract or join one by invitation. What you can do is defined by each Contract—not by an account role.</p>
            <button className="button button-dark auth-submit" type="button" disabled={busy} onClick={() => void continueToHome()}>Continue to Home</button>
            <p className="auth-assurance">You can create or join Contracts as your work grows.</p>
          </section>}

          <p className="form-message" aria-live="polite" hidden={!message}>{message}</p>
        </section>
        <p className="auth-note">A simple, secure way to begin your project together.</p>
      </main>
    </div>
  );
}
