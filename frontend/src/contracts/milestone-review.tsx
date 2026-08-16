'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ApiError, apiRequest, type AuthHeaders } from '../auth/client';
import { useSignedInAuth } from '../signed-in/app-shell';
import { milestoneReviewPresentation, nextMilestoneReviewTab, type MilestoneReview, type MilestoneReviewTab } from './milestone-review-presentation';

type ReviewPayload = { review: MilestoneReview };
type PageState = 'loading' | 'ready' | 'unauthenticated' | 'forbidden' | 'unavailable';
type ReviewTab = MilestoneReviewTab;
type DecisionInput = { action: 'check_criterion' | 'request_revision' | 'open_dispute' | 'accept'; criterionId?: number; checked?: boolean; reason?: string };
type DecisionHandler = (decision: DecisionInput) => Promise<boolean>;

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

function DecisionReasonForm({ action, title, description, buttonLabel, disabled, onDecision }: { action: 'request_revision' | 'open_dispute'; title: string; description: string; buttonLabel: string; disabled: boolean; onDecision: DecisionHandler }) {
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const succeeded = await onDecision({ action, reason });
    if (succeeded) {
      setReason('');
      setSubmitted(true);
    }
  }
  return <form className="milestone-decision-form" onSubmit={submit}><h3>{title}</h3><p className="form-help">{description}</p><label>Recorded reason<textarea value={reason} onChange={event => { setReason(event.target.value); setSubmitted(false); }} minLength={2} maxLength={2_000} required disabled={disabled} /></label><button className="button" type="submit" disabled={disabled || reason.trim().length < 2}>{buttonLabel}</button>{submitted && <p className="form-success" role="status">Decision recorded in the append-only activity trail.</p>}</form>;
}

function CriteriaView({ presentation, decisionBusy, onDecision }: { presentation: ReturnType<typeof milestoneReviewPresentation>; decisionBusy: boolean; onDecision: DecisionHandler }) {
  const requiredCriteria = presentation.criteria.filter(criterion => criterion.required);
  const allRequiredChecked = requiredCriteria.length > 0 && requiredCriteria.every(criterion => criterion.checked);
  return <section className="app-panel" aria-labelledby="criteria-view-title"><div className="section-heading"><div><p className="eyebrow">Review decisions</p><h2 id="criteria-view-title">Acceptance Criteria</h2></div><span className="status" role="status" aria-live="polite" aria-atomic="true">{allRequiredChecked ? 'Complete' : 'Buyer checklist'}</span></div><p className="notice">These checks are taken from the accepted Contract Version. Acceptance remains unavailable until every required criterion is checked.</p><fieldset className="criteria-checklist"><legend>Required checks</legend>{presentation.criteria.length ? presentation.criteria.map(criterion => <label className="criteria-check" key={criterion.id}><input type="checkbox" checked={criterion.checked} disabled={!presentation.canCheckCriteria || decisionBusy || !criterion.required} onChange={event => { void onDecision({ action: 'check_criterion', criterionId: criterion.id, checked: event.target.checked }); }} /><span><strong>{criterion.required ? 'Required' : 'Optional'}</strong>{criterion.description}</span></label>) : <p className="empty">No Acceptance Criteria are recorded for this milestone.</p>}</fieldset>{presentation.responsibility === 'Buyer' ? <><div className="milestone-decision-actions"><button className="button primary" type="button" disabled={!presentation.canAccept || decisionBusy} onClick={() => { void onDecision({ action: 'accept' }); }}>{decisionBusy ? 'Recording decision...' : 'Accept milestone'}</button><span className="form-help">{presentation.acceptanceHint}</span></div><p className="notice">No release action is available here. This review records the Buyer decision; it does not move or release funds.</p><div className="milestone-decision-grid"><DecisionReasonForm action="request_revision" title="Request revision" description="Ask the Service Provider to address a specific gap without treating the request as acceptance." buttonLabel="Request revision" disabled={!presentation.canRequestRevision || decisionBusy} onDecision={onDecision} /><DecisionReasonForm action="open_dispute" title="Raise a dispute" description="Open a protected dispute case for a contested milestone without completing the acceptance checklist." buttonLabel="Raise dispute" disabled={!presentation.canRaiseDispute || decisionBusy} onDecision={onDecision} /></div></> : <p className="notice">Only the authorised Buyer can record milestone review decisions. Service Provider evidence remains visible in the Evidence view.</p>}</section>;
}

function ReviewContent({ contractId, review, auth, onSubmitted, onDecided }: { contractId: string; review: MilestoneReview; auth: AuthHeaders; onSubmitted: (review: MilestoneReview) => void; onDecided: (review: MilestoneReview) => void }) {
  const [now, setNow] = useState(() => new Date());
  const presentation = useMemo(() => milestoneReviewPresentation(review, now), [now, review]);
  const [tab, setTab] = useState<ReviewTab>('evidence');
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [decisionError, setDecisionError] = useState('');
  const [announcement, setAnnouncement] = useState('Milestone Review loaded.');
  const tabRefs = useRef<Partial<Record<ReviewTab, HTMLButtonElement | null>>>({});
  const announcementKey = `${presentation.status.label}|${presentation.reviewWindow.label}|${presentation.releaseEligibility.label}`;
  const previousAnnouncementKey = useRef(announcementKey);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (previousAnnouncementKey.current === announcementKey) return;
    previousAnnouncementKey.current = announcementKey;
    setAnnouncement(`Milestone Review updated: ${presentation.status.label}. ${presentation.reviewWindow.label}.`);
  }, [announcementKey, presentation.reviewWindow.label, presentation.status.label]);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentTab: ReviewTab) {
    const nextTab = nextMilestoneReviewTab(currentTab, event.key);
    if (!nextTab) return;
    event.preventDefault();
    setTab(nextTab);
    window.requestAnimationFrame(() => tabRefs.current[nextTab]?.focus());
  }

  function handleSubmitted(nextReview: MilestoneReview) {
    onSubmitted(nextReview);
    setAnnouncement('Evidence submitted. Milestone Review updated.');
  }

  async function recordDecision(decision: DecisionInput): Promise<boolean> {
    setDecisionBusy(true);
    setDecisionError('');
    try {
      const response = await apiRequest<ReviewPayload>(`/api/contracts/${encodeURIComponent(contractId)}/milestones/${encodeURIComponent(review.milestone.key)}/decisions`, { method: 'POST', body: JSON.stringify(decision) }, auth);
      onDecided(response.review);
      setAnnouncement({ check_criterion: 'Acceptance Criterion updated.', request_revision: 'Revision request recorded.', open_dispute: 'Dispute opened.', accept: 'Milestone accepted.' }[decision.action]);
      return true;
    } catch (requestError) {
      setDecisionError(requestError instanceof Error ? requestError.message : 'The milestone review decision could not be recorded.');
      return false;
    } finally {
      setDecisionBusy(false);
    }
  }

  const tabs = presentation.tabs as Array<{ id: ReviewTab; label: string }>;
  return <section className="milestone-review" aria-labelledby="milestone-review-title"><p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p><header className="contract-header"><Link className="crumb" href={`/contracts/${encodeURIComponent(contractId)}`}>Contract <span aria-hidden="true">/</span> Milestone Review</Link><div className="contract-heading-row"><div><div className="title-line"><h1 id="milestone-review-title">{presentation.title}</h1><span className={`contract-stage ${presentation.status.tone}`} role="status" aria-live="polite" aria-atomic="true">{presentation.status.label}</span></div><p className="contract-meta">Milestone {review.milestone.number} · Version {review.version.number} · {review.responsibility}</p></div><Link className="button" href={`/contracts/${encodeURIComponent(contractId)}`}>Back to Contract</Link></div></header><div className="milestone-review-grid"><main className="contract-main"><section className="app-panel milestone-context" aria-labelledby="milestone-context-title"><div className="section-heading"><div><p className="eyebrow">Milestone context</p><h2 id="milestone-context-title">{presentation.deliveryOutcome}</h2></div><span className="status">Due {presentation.deliveryDeadline}</span></div><p>{presentation.evidenceRequirement}</p><dl className="project-details"><dt>Responsibility</dt><dd>{review.responsibility}</dd><dt>Review window</dt><dd><span>{presentation.reviewWindow.detail}</span><strong className="review-countdown">{presentation.reviewWindow.countdown}</strong></dd><dt>Release eligibility</dt><dd>{presentation.releaseEligibility.label}</dd></dl></section><div className="detail-tabs" role="tablist" aria-label="Milestone Review views" aria-orientation="horizontal">{tabs.map(item => <button key={item.id} id={`milestone-review-tab-${item.id}`} type="button" role="tab" aria-selected={tab === item.id} aria-controls={`milestone-review-panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1} ref={node => { tabRefs.current[item.id] = node; }} onClick={() => setTab(item.id)} onKeyDown={event => handleTabKeyDown(event, item.id)}>{item.label}{item.id === 'evidence' ? ` (${presentation.evidence.length})` : item.id === 'criteria' ? ` (${presentation.criteria.length})` : ` (${presentation.activity.length})`}</button>)}</div><section id="milestone-review-panel-evidence" className="app-panel" role="tabpanel" aria-labelledby="milestone-review-tab-evidence" tabIndex={0} hidden={tab !== 'evidence'}><div className="section-heading"><div><p className="eyebrow">Evidence</p><h2 id="evidence-view-title">Private delivery evidence</h2></div><span className="status">Contract-scoped</span></div>{presentation.evidence.length ? <div className="milestone-evidence-list">{presentation.evidence.map(item => <EvidenceSummary key={item.id} evidence={item} />)}</div> : <p className="empty">No final evidence has been submitted for this milestone.</p>}{presentation.canSubmitEvidence && <EvidenceSubmissionForm contractId={contractId} milestoneKey={review.milestone.key} auth={auth} onSubmitted={handleSubmitted} />}</section><div id="milestone-review-panel-criteria" role="tabpanel" aria-labelledby="milestone-review-tab-criteria" tabIndex={0} hidden={tab !== 'criteria'}><CriteriaView presentation={presentation} decisionBusy={decisionBusy} onDecision={recordDecision} /></div><section id="milestone-review-panel-activity" className="app-panel" role="tabpanel" aria-labelledby="milestone-review-tab-activity" tabIndex={0} hidden={tab !== 'activity'}><div className="section-heading"><div><p className="eyebrow">Activity</p><h2 id="activity-view-title">Append-only activity</h2></div><span className="status">Chronological</span></div>{presentation.activity.length ? <ol className="milestone-activity-list">{presentation.activity.map(item => <li key={item.id}><span className="activity-marker" aria-hidden="true" /><div><strong>{item.label}</strong><p>{item.detail}</p><small>{item.occurredAt}</small></div></li>)}</ol> : <p className="empty">No milestone activity has been recorded.</p>}</section>{decisionError && <p className="form-error" role="alert">{decisionError}</p>}</main><aside className="contract-rail"><section className="rail-panel" aria-labelledby="review-window-title"><p className="eyebrow">Review timing</p><h2 id="review-window-title">{presentation.reviewWindow.label}</h2><p className="rail-kicker">{presentation.reviewWindow.countdown}</p><p className="notice">{presentation.reviewWindow.detail}. The review window is derived from evidence submission time and Contract terms.</p><p className="notice">{presentation.releaseEligibility.detail}</p></section><section className="rail-panel payment-panel" aria-labelledby="payment-boundary-title"><p className="eyebrow">Settlement state</p><h2 id="payment-boundary-title">{presentation.settlement.label}</h2><p className="rail-kicker">{presentation.settlement.proposedTerms}</p>{presentation.settlement.authoritativeValues.length > 0 && <dl className="settlement-values">{presentation.settlement.authoritativeValues.map(value => <div key={value.label}><dt>{value.label}</dt><dd>{value.value}</dd></div>)}</dl>}{presentation.settlement.vaultAddress && <p className="rail-kicker">Vault: {presentation.settlement.vaultAddress}</p>}<p className="notice">{presentation.paymentBoundary}</p></section></aside></div></section>;
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
  return <ReviewContent contractId={contractId} review={review} auth={auth} onSubmitted={setReview} onDecided={setReview} />;
}
