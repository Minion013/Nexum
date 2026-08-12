'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest, ApiError, type AuthHeaders } from '../auth/client';
import { useSignedInAuth } from '../signed-in/app-shell';
import { DraftStepper } from './draft-components';
import { normalizeExactEmail } from './authoring-entry-presentation';
import type { ContractDraftResponse } from './draft-model';

type DraftPayload = { contract: ContractDraftResponse };

function LoadingSend() {
  return <section className="app-panel" aria-busy="true"><p className="eyebrow">Step 4 of 4 · Send</p><h1>Loading Contract Send...</h1><p className="empty" role="status">Checking the saved Contract Version and its protected invitation boundary.</p></section>;
}

function SendUnavailable({ error }: { error: ApiError | Error | null }) {
  const forbidden = error instanceof ApiError && error.status === 403;
  return <section className="app-panel" aria-labelledby="send-error-title"><p className="eyebrow">Send</p><h1 id="send-error-title">{forbidden ? 'This Contract Draft is restricted.' : 'Contract Send is unavailable.'}</h1><p className="page-intro" role="alert">{forbidden ? 'Only the initiating Contract Party can publish this private draft.' : error?.message || 'The protected Contract Draft could not be loaded.'}</p><p><Link className="button" href="/contracts">Back to Contracts</Link></p></section>;
}

function PublishBlocked({ reason }: { reason: string }) {
  return <div className="notice draft-error" role="alert"><strong>This draft is still private.</strong><span>{reason}</span><span>Complete and save every required term before sending an exact-email invitation.</span></div>;
}

export function SendPage({ contractId }: { contractId?: string }) {
  const { status, auth } = useSignedInAuth();
  const [contract, setContract] = useState<ContractDraftResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | Error | null>(null);

  const loadDraft = useCallback(async (currentAuth: AuthHeaders) => {
    if (!contractId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<DraftPayload>(`/api/contracts/${encodeURIComponent(contractId)}`, {}, currentAuth);
      setContract(response.contract);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError : new Error('The protected Contract Draft could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    if (status === 'ready' && auth) void loadDraft(auth);
  }, [auth, loadDraft, status]);

  async function publish() {
    if (!auth || !contractId || !contract || publishing) return;
    const savedEmail = normalizeExactEmail(String(contract.sections.parties?.counterparty_email ?? contract.sections.parties?.counterpartyEmail ?? ''));
    if (!contract.shareReady || !savedEmail) {
      setError(new Error('The Contract Draft is incomplete or has no exact counterparty email.'));
      return;
    }
    setPublishing(true);
    setError(null);
    try {
      const response = await apiRequest<{ invitation: { id: string } }>(`/api/contracts/${encodeURIComponent(contractId)}/invitations`, { method: 'POST', body: JSON.stringify({ email: savedEmail }) }, auth);
      setInvitationId(response.invitation.id);
      setContract(current => current ? { ...current, status: 'negotiation' } : current);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError : new Error('The Contract invitation could not be created.'));
    } finally {
      setPublishing(false);
    }
  }

  if (status === 'loading' || loading) return <LoadingSend />;
  if (!contractId) return <section className="app-panel" aria-labelledby="send-start-title"><p className="eyebrow">Contract Send</p><h1 id="send-start-title">Choose a Contract Draft to send.</h1><p className="page-intro">A saved draft ID is required to restore the protected Send step. Start a new Contract or open an existing draft from Contracts.</p><p><Link className="button primary" href="/contracts">Open Contracts</Link></p></section>;
  if (error && !contract) return <SendUnavailable error={error} />;
  if (!contract) return <SendUnavailable error={new Error('The protected Contract Draft could not be loaded.')} />;

  const savedEmail = normalizeExactEmail(String(contract.sections.parties?.counterparty_email ?? contract.sections.parties?.counterpartyEmail ?? ''));
  const title = typeof contract.sections.scope?.title === 'string' && contract.sections.scope.title.trim() ? contract.sections.scope.title : 'Untitled Contract Draft';
  const blockedReason = !savedEmail ? 'Add an exact counterparty email in the authoring flow.' : 'Review terms has not produced a publishable Contract Version yet.';

  return <section className="contract-authoring-flow draft-editor app-panel" aria-labelledby="send-title">
    <DraftStepper current="Send" />
    <div className="draft-heading"><div><p className="eyebrow">Step 4 of 4 · Send</p><h1 id="send-title">Send the exact Contract Version.</h1><p className="page-intro">Publishing creates one protected invitation for the saved exact email. It does not expose a private draft to anyone else.</p></div><span className="draft-status">{invitationId ? 'Invitation sent' : contract.status === 'negotiation' ? 'Shared' : 'Private draft'}</span></div>
    {invitationId && <div className="notice draft-success" role="status"><strong>Invitation created.</strong><span>The exact-email invitation is ready for the invited Profile. Contract access remains limited to the two Contract Parties.</span></div>}
    {error && <div className="notice draft-error" role="alert"><strong>Contract Send could not continue.</strong><span>{error.message}</span></div>}
    <dl className="draft-context"><div><dt>Contract</dt><dd>{title}</dd></div><div><dt>Version</dt><dd>{contract.versionNumber}</dd></div><div><dt>Counterparty email</dt><dd>{savedEmail ?? 'Not set'}</dd></div></dl>
    {!invitationId && !contract.shareReady && <PublishBlocked reason={blockedReason} />}
    {!invitationId && contract.shareReady && savedEmail && <section className="send-card" aria-label="Publish Contract Draft"><h2>Ready to send?</h2><p>Only <strong>{savedEmail}</strong> will be able to resolve this invitation after signing in with the same exact email address.</p><p>Sending changes the Contract from a private draft to a shared negotiation. The saved terms remain the source of truth for this invitation.</p><div className="action-row"><button className="primary" type="button" onClick={() => void publish()} disabled={publishing}>{publishing ? 'Sending invitation...' : 'Send invitation'}</button></div></section>}
    <div className="draft-actions action-row"><Link className="button" href={`/contracts/${encodeURIComponent(contractId)}/review-terms`}>Back to Review terms</Link><Link className="button" href="/contracts">Back to Contracts</Link></div>
  </section>;
}
