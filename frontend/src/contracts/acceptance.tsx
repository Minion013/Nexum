'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, apiRequest, type AuthHeaders } from '../auth/client';
import { useSignedInAuth } from '../signed-in/app-shell';
import { formatReviewTerm, sectionLabel, type ContractReview } from './detail-presentation';
import { WalletAcceptance } from './wallet-acceptance';

type ReviewPayload = { review: ContractReview };
type AcceptanceState = 'loading' | 'missing' | 'unauthenticated' | 'forbidden' | 'failure' | 'ready';

function LoadingState() {
  return <section className="app-panel" aria-busy="true"><p className="eyebrow">Wallet-backed acceptance</p><h1>Loading Version review...</h1><p className="empty" role="status" aria-live="polite">Checking the exact protected Version before opening the wallet boundary.</p></section>;
}

function StatePanel({ state, message, onRetry }: { state: Exclude<AcceptanceState, 'loading' | 'ready'>; message: string; onRetry?: () => void }) {
  const copy = {
    missing: ['Version not found.', 'This Contract Version is no longer available to your Profile.'],
    unauthenticated: ['Sign in to accept this Version.', 'A current signed-in Profile is required before NEXUM can open wallet acceptance.'],
    forbidden: ['Version access is restricted.', 'Only an authorised Contract Party can accept this exact Version.'],
    failure: ['Version review is unavailable.', message]
  }[state];
  return <section className="app-panel" aria-labelledby="acceptance-state-title"><p className="eyebrow">Wallet-backed acceptance</p><h1 id="acceptance-state-title">{copy[0]}</h1><p className="page-intro" role="alert">{copy[1]}</p>{state === 'failure' && <p className="notice">{message}</p>}{onRetry && <p><button className="primary" type="button" onClick={onRetry}>Try again</button></p>}<p><Link className="button" href="/contracts">Back to Contracts</Link></p></section>;
}

function AcceptanceCopy({ review }: { review: ContractReview }) {
  const incomplete = review.requiredSections.filter(section => !section.complete).map(section => sectionLabel(section.type));
  if (!review.version.acceptanceReadyAt) return <p className="notice" role="status">This Version is still being prepared. Acceptance will become available only after the protected workflow marks the exact Version ready.</p>;
  if (!review.canAccept) return <p className="notice" role="status">This Version cannot be accepted yet. Complete sections: {incomplete.join(', ') || 'the two Contract Party records'}.</p>;
  return <p className="notice" role="status">Sign the exact Version with your wallet. This signature records Contract Acceptance and does not move funds.</p>;
}

function VersionTerms({ review }: { review: ContractReview }) {
  return <section className="app-panel" aria-labelledby="acceptance-terms-title"><div className="section-heading"><div><p className="eyebrow">Authorised Version</p><h2 id="acceptance-terms-title">Version {review.version.number} terms</h2></div><span className="status">Exact Version</span></div><p className="page-intro">These terms come from the protected Contract Version returned for your Contract Party. Earlier Versions are not accepted through this page.</p><dl className="term-list">{review.version.sections.map(section => <div key={section.type}><dt>{sectionLabel(section.type)}</dt><dd>{formatReviewTerm(section.terms)}</dd></div>)}</dl></section>;
}

function WalletBoundary({ auth, contractId, review, onAccepted }: { auth: AuthHeaders; contractId: string; review: ContractReview; onAccepted: (review: ContractReview) => void }) {
  return <section className="app-panel acceptance-panel" aria-labelledby="acceptance-title"><div className="section-heading"><div><p className="eyebrow">Wallet-backed acceptance</p><h2 id="acceptance-title">Accept exact Version {review.version.number}</h2></div><span className={`status ${review.canAccept ? 'active' : ''}`}>{review.canAccept ? 'Ready when signed' : 'Not ready'}</span></div><AcceptanceCopy review={review}/>{review.canAccept && review.version.hash && <WalletAcceptance auth={auth} contractId={contractId} review={review} onAccepted={onAccepted}/>}<p className="empty">Version hash: {review.version.hash || 'Not assigned until the protected Version is complete.'}</p></section>;
}

export function ContractAcceptancePage({ contractId }: { contractId: string }) {
  const { status, auth } = useSignedInAuth();
  const [review, setReview] = useState<ContractReview | null>(null);
  const [state, setState] = useState<AcceptanceState>('loading');
  const [message, setMessage] = useState('');

  async function load(currentAuth: AuthHeaders) {
    setState('loading');
    setMessage('');
    try {
      const response = await apiRequest<ReviewPayload>(`/api/contracts/${encodeURIComponent(contractId)}/review`, {}, currentAuth);
      setReview(response.review);
      setState('ready');
    } catch (requestError) {
      const apiError = requestError as ApiError;
      setState(apiError.status === 401 ? 'unauthenticated' : apiError.status === 403 ? 'forbidden' : apiError.status === 404 || apiError.status === 422 ? 'missing' : 'failure');
      setMessage(apiError.message || 'The protected Version review is unavailable.');
    }
  }

  useEffect(() => {
    if (status === 'ready' && auth) void load(auth);
    if (status === 'error') setState('unauthenticated');
  }, [auth, contractId, status]);

  if (status === 'loading' || state === 'loading') return <LoadingState />;
  if (state !== 'ready' || !review) return <StatePanel state={state === 'ready' ? 'failure' : state} message={message || 'The protected Version review is unavailable.'} onRetry={auth ? () => void load(auth) : undefined} />;
  return <section className="contract-acceptance" aria-labelledby="acceptance-page-title"><header className="contract-header"><Link className="crumb" href={`/contracts/${encodeURIComponent(contractId)}`}>Contract <span aria-hidden="true">/</span> Detail</Link><div className="contract-heading-row"><div><p className="eyebrow">Wallet-backed acceptance</p><h1 id="acceptance-page-title">Accept the exact Contract Version</h1><p className="page-intro">Verify the protected Version terms before signing. The signature records acceptance and does not move funds.</p></div><Link className="button" href={`/contracts/${encodeURIComponent(contractId)}`}>Back to detail</Link></div></header><VersionTerms review={review}/><WalletBoundary auth={auth ?? {}} contractId={contractId} review={review} onAccepted={setReview}/></section>;
}
