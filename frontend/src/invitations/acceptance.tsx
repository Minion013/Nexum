'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiRequest, createBrowserSupabase, getAuthConfig, localFixtureEmail, type AuthConfig } from '../auth/client';

type InvitationState = 'loading' | 'eligible' | 'expired' | 'resolved' | 'accepted' | 'unauthenticated' | 'invalid' | 'failure';
type InvitationAuth = { accessToken?: string; localTestEmail?: string };
type InvitationPayload = { invitation: { state: 'eligible' | 'expired' | 'resolved' } };

async function invitationAuth(config: AuthConfig): Promise<InvitationAuth | null> {
  const storedFixture = window.sessionStorage.getItem('pactflow-local-test-email');
  const fixture = storedFixture ? localFixtureEmail(config, storedFixture, window.location.hostname) : null;
  if (fixture) return { localTestEmail: fixture };
  if (!config.url || !config.publishableKey) return null;
  const { data: { session } } = await createBrowserSupabase(config).auth.getSession();
  return session?.access_token ? { accessToken: session.access_token } : null;
}

export default function InvitationAcceptance({ invitationId }: { invitationId: string }) {
  const [state, setState] = useState<InvitationState>('loading');
  const [message, setMessage] = useState('Checking your invitation…');
  const [auth, setAuth] = useState<InvitationAuth | null>(null);

  const loadInvitation = useCallback(async () => {
    setState('loading');
    setMessage('Checking your invitation…');
    try {
      const currentAuth = await invitationAuth(await getAuthConfig());
      if (!currentAuth) {
        setAuth(null);
        setState('unauthenticated');
        setMessage('Sign in with the exact email address that received this invitation.');
        return;
      }
      setAuth(currentAuth);
      const { invitation } = await apiRequest<InvitationPayload>(`/api/invitations/${encodeURIComponent(invitationId)}`, {}, currentAuth);
      setState(invitation.state);
      setMessage(invitation.state === 'eligible'
        ? 'This private Contract invitation is ready for your confirmation.'
        : invitation.state === 'expired'
          ? 'This invitation has expired and can no longer be accepted.'
          : 'This invitation has already been resolved and cannot be accepted again.');
    } catch (error) {
      setAuth(null);
      if (error instanceof ApiError && error.status === 401) {
        setState('unauthenticated');
        setMessage('Sign in with the exact email address that received this invitation.');
      } else if (error instanceof ApiError && error.status === 422) {
        setState('invalid');
        setMessage('This invitation is invalid or belongs to another Profile.');
      } else {
        setState('failure');
        setMessage(error instanceof Error ? error.message : 'We could not load this invitation.');
      }
    }
  }, [invitationId]);

  useEffect(() => { void loadInvitation(); }, [loadInvitation]);

  async function acceptInvitation() {
    if (!auth) return;
    setState('loading');
    setMessage('Accepting your private Contract invitation…');
    try {
      await apiRequest(`/api/invitations/${encodeURIComponent(invitationId)}/accept`, { method: 'POST' }, auth);
      setState('accepted');
      setMessage('Invitation accepted. You now have access to this private Contract.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        await loadInvitation();
        return;
      }
      setState('failure');
      setMessage(error instanceof Error ? error.message : 'We could not accept this invitation.');
    }
  }

  const canAccept = state === 'eligible';
  return (
    <div className="home-page">
      <a className="skip-link" href="#main-content">Skip to invitation</a>
      <header className="home-header"><Link className="brand" href="/">Pact<span>Flow</span></Link></header>
      <main id="main-content" className="home-main" tabIndex={-1}>
        <section className="home-intro" aria-labelledby="invitation-title">
          <p className="eyebrow">Private Contract</p>
          <h1 id="invitation-title">Accept Contract invitation</h1>
          <p>This invitation is available only to the signed-in Profile whose exact email address was invited.</p>
        </section>
        <section className="home-panel invitation-panel" aria-label="Contract invitation acceptance">
          <p className={state === 'invalid' || state === 'failure' ? 'home-error' : 'home-form-status'} aria-live="polite">{message}</p>
          {canAccept && <button className="home-primary-action" type="button" onClick={() => void acceptInvitation()}>Accept invitation</button>}
          {state === 'unauthenticated' && <Link className="home-row-link" href="/login">Sign in</Link>}
          {state === 'accepted' && <Link className="home-row-link" href="/contracts">Open Contracts</Link>}
          {(state === 'failure' || state === 'invalid') && <button className="home-secondary-action" type="button" onClick={() => void loadInvitation()}>Try again</button>}
        </section>
      </main>
    </div>
  );
}
