'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest, type ApiError } from '../auth/client';
import { useSignedInAuth } from '../signed-in/app-shell';

type Draft = { id: string; status: string; sections?: { parties?: { counterparty_email?: string | null }; scope?: { title?: string | null } } };

export function ProjectDetailsHandoffPage({ contractId }: { contractId: string }) {
  const { status, auth } = useSignedInAuth();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'ready' || !auth) return;
    void apiRequest<{ contract: Draft }>(`/api/contracts/${encodeURIComponent(contractId)}`, {}, auth)
      .then(response => setDraft(response.contract))
      .catch(requestError => setError((requestError as ApiError).message || 'This Contract Draft is unavailable.'));
  }, [auth, contractId, status]);

  if (status === 'loading' || (!draft && !error)) return <section className="app-panel" aria-busy="true"><p className="eyebrow">Contract Draft</p><h1>Loading the persisted draft...</h1><p className="empty" role="status">Checking your authorised Contract Draft.</p></section>;
  if (error) return <section className="app-panel" aria-labelledby="project-details-error"><p className="eyebrow">Contract Draft</p><h1 id="project-details-error">This Contract Draft is unavailable.</h1><p className="page-intro" role="alert">{error}</p><Link className="button" href="/contracts">Back to Contracts</Link></section>;

  const counterparty = draft?.sections?.parties?.counterparty_email || 'No counterparty selected yet';
  return <section className="contract-authoring-flow app-panel" aria-labelledby="project-details-handoff-title"><ol className="contract-stepper" aria-label="Contract Draft steps"><li className="done">1. Choose Person</li><li aria-current="step">2. Project details</li><li>3. Review terms</li><li>4. Send</li></ol><p className="eyebrow">Contract Draft saved</p><h1 id="project-details-handoff-title">Continue with Project details.</h1><p className="page-intro">Your private draft is now persisted and remains visible only to its Contract Party. The editable Project details form continues from this saved draft.</p><dl className="project-details"><dt>Draft</dt><dd>{draft?.sections?.scope?.title || 'Untitled Contract Draft'}</dd><dt>Counterparty</dt><dd>{counterparty}</dd><dt>Status</dt><dd>{draft?.status || 'private_draft'}</dd></dl><p className="notice">Full Project details and editable terms are the next conversion step. No invitation or Contract access has been created.</p><div className="action-row"><Link className="button" href="/contracts">Save and exit</Link></div></section>;
}
