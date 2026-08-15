'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, apiRequest, type AuthHeaders } from '../auth/client';
import { useSignedInAuth } from '../signed-in/app-shell';
import { contractDetailPresentation, formatReviewTerm, sectionLabel, type ContractDetail, type ContractReview } from './detail-presentation';

type DetailPayload = { contract: ContractDetail };
type ReviewPayload = { review: ContractReview };
type DetailState = 'loading' | 'missing' | 'unauthenticated' | 'forbidden' | 'failure' | 'authorised';
type ReviewState = 'loading' | 'ready' | 'unavailable';
type IdleWindow = Window & {
  requestIdleCallback?: (callback: (deadline: IdleDeadline) => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function LoadingState() {
  return <section className="app-panel" aria-busy="true"><p className="eyebrow">Contract detail</p><h1>Loading Contract detail...</h1><p className="empty" role="status" aria-live="polite">Checking your authorised Contract terms and lifecycle.</p></section>;
}

function StatePanel({ state, message, onRetry }: { state: Exclude<DetailState, 'loading' | 'authorised'>; message: string; onRetry?: () => void }) {
  const copy = {
    missing: ['Contract not found.', 'This Contract is no longer available to your Profile.'],
    unauthenticated: ['Sign in to view this Contract.', 'A current signed-in Profile is required before NEXUM can load private Contract data.'],
    forbidden: ['Contract access is restricted.', 'Only an authorised Contract Party can view these terms and lifecycle details.'],
    failure: ['Contract detail is unavailable.', message]
  }[state];
  return <section className="app-panel" aria-labelledby="contract-state-title"><p className="eyebrow">Contract detail</p><h1 id="contract-state-title">{copy[0]}</h1><p className="page-intro" role="alert">{copy[1]}</p>{state === 'failure' && <p className="notice">{message}</p>}{onRetry && <p><button className="primary" type="button" onClick={onRetry}>Try again</button></p>}{state === 'unauthenticated' && <p><Link className="button primary" href="/login">Sign in</Link></p>}<p><Link className="button" href="/contracts">Back to Contracts</Link></p></section>;
}

function Milestone({ contractId, item }: { contractId: string; item: ReturnType<typeof contractDetailPresentation>['milestones'][number] }) {
      const stateLabel = item.state === 'complete' ? 'Complete' : item.state === 'active' ? 'In progress' : item.state === 'review' ? 'Review' : item.state === 'awaiting-acceptance' ? 'Awaiting acceptance' : 'Upcoming';
      return <li className={`milestone-item ${item.state}`}><span className="milestone-marker" aria-hidden="true">{item.state === 'complete' ? '✓' : item.number}</span><div className="milestone-copy"><div className="milestone-title"><Link href={`/contracts/${encodeURIComponent(contractId)}/milestones/milestone-${item.number}`}><strong>{item.title || `Milestone ${item.number}`}</strong></Link><span className={`contract-stage ${item.state === 'active' ? 'active' : item.state === 'complete' ? 'complete' : item.state === 'review' || item.state === 'awaiting-acceptance' ? 'review' : ''}`}>{stateLabel}</span></div><p>{item.deliveryOutcome || 'The agreed outcome is recorded in the Contract Version.'}</p><div className="milestone-facts"><span>Due {item.deliveryDeadlineUtc ? new Intl.DateTimeFormat('en-SG', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(item.deliveryDeadlineUtc)) : 'To be confirmed'}</span><strong>{Number(item.allocation) || 0} proposed Contract terms</strong></div></div></li>;
}

function ReviewTerms({ review }: { review: ContractReview }) {
  return <section className="app-panel" aria-labelledby="review-terms-title"><div className="section-heading"><div><p className="eyebrow">Authorised Version</p><h2 id="review-terms-title">Version {review.version.number} terms</h2></div><span className="status">Exact Version</span></div><p className="page-intro">These terms come from the protected Contract Version returned for your Contract Party. Earlier Versions are not accepted through this page.</p><dl className="term-list">{review.version.sections.map(section => <div key={section.type}><dt>{sectionLabel(section.type)}</dt><dd>{formatReviewTerm(section.terms)}</dd></div>)}</dl></section>;
}

function ReviewLoading() {
  return <section className="rail-panel" aria-busy="true" aria-labelledby="review-loading-title"><p className="eyebrow">Version review</p><h2 id="review-loading-title">Loading Version review...</h2><p className="empty" role="status" aria-live="polite">Fetching the exact protected Version terms.</p></section>;
}

function ReviewUnavailable({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <section className="rail-panel" aria-label="Version review unavailable"><p className="eyebrow">Version review</p><h2>Review state unavailable.</h2><p className="empty">{message}</p><button className="button" type="button" onClick={onRetry}>Try again</button></section>;
}

function ReviewAcceptanceLink({ contractId, review }: { contractId: string; review: ContractReview }) {
  return <section className="rail-panel" aria-labelledby="acceptance-title"><div className="section-heading"><div><p className="eyebrow">Wallet-backed acceptance</p><h2 id="acceptance-title">Exact Version {review.version.number}</h2></div><span className={`status ${review.canAccept ? 'active' : ''}`}>{review.canAccept ? 'Ready when signed' : 'Not ready'}</span></div><p className="notice">{review.canAccept ? 'Sign the exact Version with your wallet. This signature records Contract Acceptance and does not move funds.' : 'Review the protected Version state before attempting acceptance.'}</p><Link className="button primary" href={`/contracts/${encodeURIComponent(contractId)}/accept`}>{review.canAccept ? 'Sign and accept exact Version' : 'Open acceptance status'}</Link><p className="empty">Version hash: {review.version.hash || 'Not assigned until the protected Version is complete.'}</p></section>;
}

function AuthorisedContract({ contractId, detail, review, reviewState, reviewMessage, onReviewRetry }: { contractId: string; detail: ContractDetail; review: ContractReview | null; reviewState: ReviewState; reviewMessage: string; onReviewRetry: () => void }) {
  const presentation = useMemo(() => contractDetailPresentation(detail), [detail]);
  return <section className="contract-detail" aria-labelledby="contract-detail-title"><header className="contract-header"><Link className="crumb" href="/contracts">Contracts <span aria-hidden="true">/</span> Detail</Link><div className="contract-heading-row"><div><div className="title-line"><h1 id="contract-detail-title">{presentation.title}</h1><span className={`contract-stage ${presentation.stage.tone}`}>{presentation.stage.label}</span></div><p className="contract-meta">{presentation.meta}</p></div><Link className="button" href={`/contracts/${encodeURIComponent(contractId)}/review-terms`}>Open editable terms</Link></div></header><div className="contract-layout"><main className="contract-main"><div className="detail-tabs" role="tablist" aria-label="Contract detail views"><button type="button" role="tab" aria-selected="true">Overview</button><button type="button" role="tab" aria-selected="false" disabled>Activity (coming soon)</button></div><section className="app-panel" aria-labelledby="milestones-title"><div className="section-heading"><div><p className="eyebrow">Lifecycle</p><h2 id="milestones-title">Milestones</h2></div><span className="status">{presentation.completed} of {presentation.milestones.length} complete</span></div>{presentation.milestones.length ? <ol className="milestone-timeline">{presentation.milestones.map(item => <Milestone key={`${item.number}-${item.title}`} contractId={contractId} item={item}/>)}</ol> : <p className="empty">No milestones are present in the authorised Contract Version.</p>}</section><section className="app-panel scope-panel" aria-labelledby="scope-title"><p className="eyebrow">Scope</p><h2 id="scope-title">Agreed work</h2><p>{detail.sections.scope?.description || 'The authorised Contract Version does not include a scope description.'}</p><dl className="project-details"><dt>Buyer</dt><dd>{detail.buyer}</dd><dt>Counterparty</dt><dd>{detail.counterparty}</dd><dt>Outcome</dt><dd>{detail.sections.scope?.outcome || 'Recorded in Contract terms'}</dd></dl></section>{review && <ReviewTerms review={review}/>}</main><aside className="contract-rail"><section className="rail-panel payment-panel" aria-labelledby="payment-title"><p className="eyebrow">Payment boundary</p><h2 id="payment-title">{presentation.payment.total}</h2><p className="rail-kicker">{presentation.payment.label}</p><p className="rail-amount">{presentation.payment.progress}</p><p className="notice">Proposed Contract terms are not personal wallet funds, secured funds, paid funds, or released funds.</p></section>{reviewState === 'ready' && review ? <ReviewAcceptanceLink contractId={contractId} review={review}/> : reviewState === 'loading' ? <ReviewLoading /> : <ReviewUnavailable message={reviewMessage} onRetry={onReviewRetry}/>}</aside></div></section>;
}

export function ContractDetailPage({ contractId }: { contractId: string }) {
  const { status, auth } = useSignedInAuth();
  const [detail, setDetail] = useState<ContractDetail | null>(null);
  const [review, setReview] = useState<ContractReview | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState>('loading');
  const [reviewMessage, setReviewMessage] = useState('The protected Version review could not be loaded.');
  const [state, setState] = useState<DetailState>('loading');
  const [message, setMessage] = useState('');
  const reviewRequest = useRef(0);

  const load = useCallback(async (currentAuth: AuthHeaders) => {
    setState('loading');
    setDetail(null);
    setReview(null);
    setReviewState('loading');
    setMessage('');
    try {
      const detailResponse = await apiRequest<DetailPayload>(`/api/contracts/${encodeURIComponent(contractId)}/detail`, {}, currentAuth);
      setDetail(detailResponse.contract);
      setState('authorised');
    } catch (requestError) {
      const apiError = requestError as ApiError;
      setState(apiError.status === 401 ? 'unauthenticated' : apiError.status === 403 ? 'forbidden' : apiError.status === 404 || apiError.status === 422 ? 'missing' : 'failure');
      setMessage(apiError.message || 'The protected Contract detail is unavailable.');
    }
  }, [contractId]);

  const loadReview = useCallback(async (currentAuth: AuthHeaders) => {
    const requestId = reviewRequest.current + 1;
    reviewRequest.current = requestId;
    setReviewState('loading');
    setReviewMessage('The protected Version review could not be loaded.');
    try {
      const reviewResponse = await apiRequest<ReviewPayload>(`/api/contracts/${encodeURIComponent(contractId)}/review`, {}, currentAuth);
      if (requestId !== reviewRequest.current) return;
      setReview(reviewResponse.review);
      setReviewState('ready');
    } catch (reviewError) {
      if (requestId !== reviewRequest.current) return;
      setReview(null);
      setReviewState('unavailable');
      setReviewMessage(reviewError instanceof Error ? reviewError.message : 'The protected Version review could not be loaded.');
    }
  }, [contractId]);

  useEffect(() => {
    if (status === 'ready' && auth) void load(auth);
    if (status === 'error') setState('unauthenticated');
  }, [auth, load, status]);

  useEffect(() => {
    if (status !== 'ready' || state !== 'authorised' || !auth) return;
    const idleWindow = window as IdleWindow;
    const loadWhenIdle = () => { void loadReview(auth); };
    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(loadWhenIdle, { timeout: 1500 });
      return () => idleWindow.cancelIdleCallback?.(handle);
    }
    const timeout = window.setTimeout(loadWhenIdle, 0);
    return () => window.clearTimeout(timeout);
  }, [auth, loadReview, state, status]);

  if (status === 'loading' || state === 'loading') return <LoadingState />;
  if (state !== 'authorised' || !detail) return <StatePanel state={state === 'authorised' ? 'failure' : state} message={message || 'The protected Contract detail is unavailable.'} onRetry={auth ? () => void load(auth) : undefined} />;
  return <AuthorisedContract contractId={contractId} detail={detail} review={review} reviewState={reviewState} reviewMessage={reviewMessage} onReviewRetry={() => auth && void loadReview(auth)} />;
}
