'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, apiRequest, type AuthHeaders } from '../auth/client';
import { useSignedInAuth } from '../signed-in/app-shell';
import { milestoneReviewPresentation, type MilestoneReview } from './milestone-review-presentation';

type ReviewPayload = { review: MilestoneReview };
type PageState = 'loading' | 'ready' | 'unauthenticated' | 'forbidden' | 'unavailable';

function LoadingState() {
  return <section className="app-panel" aria-busy="true"><p className="eyebrow">Milestone Review</p><h1>Loading Milestone Review...</h1><p className="empty" role="status" aria-live="polite">Checking the protected evidence and activity boundary.</p></section>;
}

function StatePanel({ state, message, onRetry }: { state: Exclude<PageState, 'loading' | 'ready'>; message: string; onRetry?: () => void }) {
  const copy = {
    unauthenticated: ['Sign in to view this Milestone Review.', 'A current signed-in Profile is required before NEXUM can load private milestone data.'],
    forbidden: ['Milestone Review access is restricted.', 'Only an authorised Contract Party or assigned dispute Case Officer can view this protected data.'],
    unavailable: ['Milestone Review is unavailable.', message]
  }[state];
  return <section className="app-panel" aria-labelledby="milestone-review-state-title"><p className="eyebrow">Milestone Review</p><h1 id="milestone-review-state-title">{copy[0]}</h1><p className="page-intro" role="alert">{copy[1]}</p>{state === 'unavailable' && <p className="notice">{message}</p>}{onRetry && <p><button className="button" type="button" onClick={onRetry}>Try again</button></p>}{state === 'unauthenticated' && <p><Link className="button primary" href="/login">Sign in</Link></p>}<p><Link className="button" href="/contracts">Back to Contracts</Link></p></section>;
}

function EvidenceSummary({ evidence }: { evidence: ReturnType<typeof milestoneReviewPresentation>['evidence'][number] }) {
  return <article className="milestone-evidence-card"><div className="section-heading"><div><p className="eyebrow">Protected resource</p><h3>{evidence.resourceLabel}</h3></div><span className="status">Submitted</span></div><dl className="milestone-metadata"><dt>Resource metadata</dt><dd>{evidence.metadata}</dd><dt>Submitted by</dt><dd>{evidence.submittedBy}</dd><dt>Submitted at</dt><dd>{evidence.submittedAt}</dd><dt>Reference</dt><dd>{evidence.protectedReference}</dd><dt>Integrity</dt><dd>{evidence.integrityReference}</dd></dl></article>;
}

function EvidenceSubmissionForm({ contractId, milestoneKey, auth, onSubmitted }: { contractId: string; milestoneKey: string; auth: AuthHeaders; onSubmitted: (review: MilestoneReview) => void }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState('document');
  const [mediaType, setMediaType] = useState('application/pdf');
  const [sizeBytes, setSizeBytes] = useState('');
  const [protectedLocator, setProtectedLocator] = useState('');
  const [integrityReference, setIntegrityReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await apiRequest<ReviewPayload>(`/api/contracts/${encodeURIComponent(contractId)}/milestones/${encodeURIComponent(milestoneKey)}/evidence`, {
        method: 'POST',
        body: JSON.stringify({ resource: { name, kind, mediaType, sizeBytes: Number(sizeBytes), protectedLocator }, integrityReference: integrityReference || null })
      }, auth);
      onSubmitted(response.review);
      setName('');
      setSizeBytes('');
      setProtectedLocator('');
      setIntegrityReference('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Evidence could not be submitted.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="milestone-submit-card" aria-labelledby="submit-evidence-title"><p className="eyebrow">Service Provider action</p><h3 id="submit-evidence-title">Submit final evidence</h3><p className="form-help">Submit protected resource metadata and an opaque reference. Do not enter passwords, credentials, or raw private URLs.</p><form onSubmit={submit}><div className="milestone-form-grid"><label>Resource name<input value={name} onChange={event => setName(event.target.value)} required maxLength={160} /></label><label>Resource kind<select value={kind} onChange={event => setKind(event.target.value)}><option value="document">Document</option><option value="repository">Repository</option><option value="design">Design</option><option value="other">Other</option></select></label><label>Media type<input value={mediaType} onChange={event => setMediaType(event.target.value)} required maxLength={160} /></label><label>Size in bytes<input type="number" min="1" step="1" value={sizeBytes} onChange={event => setSizeBytes(event.target.value)} required /></label><label className="milestone-form-wide">Protected resource reference<input value={protectedLocator} onChange={event => setProtectedLocator(event.target.value)} placeholder="contracts/.../evidence.pdf" required maxLength={500} /><small>Use the protected object reference only; this field does not open or publish a file.</small></label><label className="milestone-form-wide">Integrity reference <span className="optional-label">optional</span><input value={integrityReference} onChange={event => setIntegrityReference(event.target.value)} placeholder="sha256:..." pattern="sha(256|512):[a-f0-9]+" /><small>Use a supported sha256 or sha512 reference when available.</small></label></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="button primary" type="submit" disabled={busy}>{busy ? 'Submitting evidence...' : 'Submit final evidence'}</button></form></section>;
}

function ReviewContent({ contractId, review, auth, onSubmitted }: { contractId: string; review: MilestoneReview; auth: AuthHeaders; onSubmitted: (review: MilestoneReview) => void }) {
  const presentation = useMemo(() => milestoneReviewPresentation(review), [review]);
  const [tab, setTab] = useState<'evidence' | 'activity'>('evidence');
  return <section className="milestone-review" aria-labelledby="milestone-review-title"><header className="contract-header"><Link className="crumb" href={`/contracts/${encodeURIComponent(contractId)}`}>Contract <span aria-hidden="true">/</span> Milestone Review</Link><div className="contract-heading-row"><div><div className="title-line"><h1 id="milestone-review-title">{presentation.title}</h1><span className={`contract-stage ${presentation.status.tone}`}>{presentation.status.label}</span></div><p className="contract-meta">Milestone {review.milestone.number} · Version {review.version.number} · {review.responsibility}</p></div><Link className="button" href={`/contracts/${encodeURIComponent(contractId)}`}>Back to Contract</Link></div></header><div className="milestone-review-grid"><main className="contract-main"><section className="app-panel milestone-context" aria-labelledby="milestone-context-title"><div className="section-heading"><div><p className="eyebrow">Milestone context</p><h2 id="milestone-context-title">{presentation.deliveryOutcome}</h2></div><span className="status">Due {presentation.deliveryDeadline}</span></div><p>{presentation.evidenceRequirement}</p><dl className="project-details"><dt>Responsibility</dt><dd>{review.responsibility}</dd><dt>Review window</dt><dd>{presentation.reviewWindow.detail}</dd></dl></section><div className="detail-tabs" role="tablist" aria-label="Milestone Review views">{presentation.tabs.map(item => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id as 'evidence' | 'activity')}>{item.label}{item.id === 'evidence' ? ` (${presentation.evidence.length})` : ` (${presentation.activity.length})`}</button>)}</div>{tab === 'evidence' ? <section className="app-panel" aria-labelledby="evidence-view-title"><div className="section-heading"><div><p className="eyebrow">Evidence</p><h2 id="evidence-view-title">Private delivery evidence</h2></div><span className="status">Contract-scoped</span></div>{presentation.evidence.length ? <div className="milestone-evidence-list">{presentation.evidence.map(item => <EvidenceSummary key={item.id} evidence={item} />)}</div> : <p className="empty">No final evidence has been submitted for this milestone.</p>}{presentation.canSubmitEvidence && <EvidenceSubmissionForm contractId={contractId} milestoneKey={review.milestone.key} auth={auth} onSubmitted={onSubmitted} />}</section> : <section className="app-panel" aria-labelledby="activity-view-title"><div className="section-heading"><div><p className="eyebrow">Activity</p><h2 id="activity-view-title">Append-only activity</h2></div><span className="status">Chronological</span></div>{presentation.activity.length ? <ol className="milestone-activity-list">{presentation.activity.map(item => <li key={item.id}><span className="activity-marker" aria-hidden="true" /><div><strong>{item.label}</strong><p>{item.detail}</p><small>{item.occurredAt}</small></div></li>)}</ol> : <p className="empty">No milestone activity has been recorded.</p>}</section>}<section className="app-panel" aria-labelledby="criteria-view-title"><div className="section-heading"><div><p className="eyebrow">Review context</p><h2 id="criteria-view-title">Acceptance Criteria</h2></div><span className="status">Decision controls follow</span></div><ul className="criteria-list">{presentation.criteria.map(criterion => <li key={criterion.id}><span className="criterion-marker" aria-hidden="true">{criterion.required ? 'Required' : 'Optional'}</span><span>{criterion.description}</span></li>)}</ul><p className="notice">Criteria are shown for review context. Acceptance, revision, and dispute decisions are delivered in the next workflow step.</p></section></main><aside className="contract-rail"><section className="rail-panel" aria-labelledby="review-window-title"><p className="eyebrow">Review timing</p><h2 id="review-window-title">{presentation.reviewWindow.label}</h2><p className="rail-kicker">{presentation.reviewWindow.detail}</p><p className="notice">The review window is derived from evidence submission time and Contract terms.</p></section><section className="rail-panel payment-panel" aria-labelledby="payment-boundary-title"><p className="eyebrow">Payment boundary</p><h2 id="payment-boundary-title">No payment action here</h2><p className="notice">{presentation.paymentBoundary}</p></section></aside></div></section>;
}

export function MilestoneReviewPage({ contractId, milestoneKey }: { contractId: string; milestoneKey: string }) {
  const { status, auth } = useSignedInAuth();
  const [state, setState] = useState<PageState>('loading');
  const [review, setReview] = useState<MilestoneReview | null>(null);
  const [message, setMessage] = useState('');
  const load = useCallback(async (currentAuth: AuthHeaders) => {
    setState('loading');
    try {
      const response = await apiRequest<ReviewPayload>(`/api/contracts/${encodeURIComponent(contractId)}/milestones/${encodeURIComponent(milestoneKey)}/review`, {}, currentAuth);
      setReview(response.review);
      setState('ready');
    } catch (requestError) {
      const apiError = requestError as ApiError;
      setMessage(apiError.message || 'The protected Milestone Review is unavailable.');
      setState(apiError.status === 401 ? 'unauthenticated' : apiError.status === 403 ? 'forbidden' : 'unavailable');
    }
  }, [contractId, milestoneKey]);
  useEffect(() => {
    if (status === 'ready' && auth) void load(auth);
    if (status === 'error') setState('unauthenticated');
  }, [auth, load, status]);
  if (status === 'loading' || state === 'loading') return <LoadingState />;
  if (state !== 'ready' || !review || !auth) return <StatePanel state={state === 'ready' ? 'unavailable' : state} message={message || 'The protected Milestone Review is unavailable.'} onRetry={auth ? () => void load(auth) : undefined} />;
  return <ReviewContent contractId={contractId} review={review} auth={auth} onSubmitted={setReview} />;
}
