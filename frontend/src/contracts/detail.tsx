'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, apiRequest, getAuthConfig, type AuthConfig, type AuthHeaders } from '../auth/client';
import { useSignedInAuth } from '../signed-in/app-shell';
import { PrivyProvider, useSubscribeToJwtAuthWithFlag, useWallets, type EIP1193Provider, type SignTypedDataParams } from '@privy-io/react-auth';
import { contractDetailPresentation, formatReviewTerm, sectionLabel, type ContractDetail, type ContractReview } from './detail-presentation';

type DetailPayload = { contract: ContractDetail };
type ReviewPayload = { review: ContractReview };
type DetailState = 'loading' | 'missing' | 'unauthenticated' | 'forbidden' | 'failure' | 'authorised';
type WalletSignature = { walletAddress: string; walletSignature: string; versionHash: string };

const baseSepoliaChainId = 84532;
const contractAcceptanceStatement = 'I accept this exact PactFlow Contract Version. This signature does not move funds.';

function LoadingState() {
  return <section className="app-panel" aria-busy="true"><p className="eyebrow">Contract detail</p><h1>Loading Contract detail...</h1><p className="empty" role="status" aria-live="polite">Checking your authorised Contract terms and lifecycle.</p></section>;
}

function StatePanel({ state, message, onRetry }: { state: Exclude<DetailState, 'loading' | 'authorised'>; message: string; onRetry?: () => void }) {
  const copy = {
    missing: ['Contract not found.', 'This Contract is no longer available to your Profile.'],
    unauthenticated: ['Sign in to view this Contract.', 'A current signed-in Profile is required before PactFlow can load private Contract data.'],
    forbidden: ['Contract access is restricted.', 'Only an authorised Contract Party can view these terms and lifecycle details.'],
    failure: ['Contract detail is unavailable.', message]
  }[state];
  return <section className="app-panel" aria-labelledby="contract-state-title"><p className="eyebrow">Contract detail</p><h1 id="contract-state-title">{copy[0]}</h1><p className="page-intro" role="alert">{copy[1]}</p>{state === 'failure' && <p className="notice">{message}</p>}{onRetry && <p><button className="primary" type="button" onClick={onRetry}>Try again</button></p>}{state === 'unauthenticated' && <p><Link className="button primary" href="/login">Sign in</Link></p>}<p><Link className="button" href="/contracts">Back to Contracts</Link></p></section>;
}

function Milestone({ item }: { item: ReturnType<typeof contractDetailPresentation>['milestones'][number] }) {
  const stateLabel = item.state === 'complete' ? 'Complete' : item.state === 'active' ? 'In progress' : item.state === 'awaiting-acceptance' ? 'Awaiting acceptance' : 'Upcoming';
  return <li className={`milestone-item ${item.state}`}><span className="milestone-marker" aria-hidden="true">{item.state === 'complete' ? '✓' : item.number}</span><div className="milestone-copy"><div className="milestone-title"><strong>{item.title || `Milestone ${item.number}`}</strong><span className={`contract-stage ${item.state === 'active' ? 'active' : item.state === 'complete' ? 'complete' : item.state === 'awaiting-acceptance' ? 'review' : ''}`}>{stateLabel}</span></div><p>{item.deliveryOutcome || 'The agreed outcome is recorded in the Contract Version.'}</p><div className="milestone-facts"><span>Due {item.deliveryDeadlineUtc ? new Intl.DateTimeFormat('en-SG', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(item.deliveryDeadlineUtc)) : 'To be confirmed'}</span><strong>{Number(item.allocation) || 0} proposed Contract terms</strong></div></div></li>;
}

function ReviewTerms({ review }: { review: ContractReview }) {
  return <section className="app-panel" aria-labelledby="review-terms-title"><div className="section-heading"><div><p className="eyebrow">Authorised Version</p><h2 id="review-terms-title">Version {review.version.number} terms</h2></div><span className="status">Exact Version</span></div><p className="page-intro">These terms come from the protected Contract Version returned for your Contract Party. Earlier Versions are not accepted through this page.</p><dl className="term-list">{review.version.sections.map(section => <div key={section.type}><dt>{sectionLabel(section.type)}</dt><dd>{formatReviewTerm(section.terms)}</dd></div>)}</dl></section>;
}

function AcceptanceCopy({ review }: { review: ContractReview }) {
  const incomplete = review.requiredSections.filter(section => !section.complete).map(section => sectionLabel(section.type));
  if (!review.version.acceptanceReadyAt) return <p className="notice" role="status">This Version is still being prepared. Acceptance will become available only after the protected workflow marks the exact Version ready.</p>;
  if (!review.canAccept) return <p className="notice" role="status">This Version cannot be accepted yet. Complete sections: {incomplete.join(', ') || 'the two Contract Party records'}.</p>;
  return <p className="notice" role="status">Sign the exact Version with your wallet. This signature records Contract Acceptance and does not move funds.</p>;
}

function acceptanceTypedData(contractId: string, versionId: string, versionHash: string): SignTypedDataParams & { primaryType: 'ContractAcceptance' } {
  return {
    domain: { name: 'PactFlow Contract Acceptance', version: '1', chainId: baseSepoliaChainId },
    primaryType: 'ContractAcceptance',
    types: {
      EIP712Domain: [{ name: 'name', type: 'string' }, { name: 'version', type: 'string' }, { name: 'chainId', type: 'uint256' }],
      ContractAcceptance: [{ name: 'contractId', type: 'string' }, { name: 'versionId', type: 'string' }, { name: 'versionHash', type: 'string' }, { name: 'statement', type: 'string' }]
    },
    message: { contractId, versionId, versionHash, statement: contractAcceptanceStatement }
  };
}

function WalletAcceptanceControls({ auth, contractId, review, onSignature }: { auth: AuthHeaders; contractId: string; review: ContractReview; onSignature: (signature: WalletSignature) => Promise<void> }) {
  const { state } = useSubscribeToJwtAuthWithFlag({ isAuthenticated: Boolean(auth.accessToken), isLoading: false, getExternalJwt: async () => auth.accessToken ?? '', enabled: Boolean(auth.accessToken) });
  const { wallets, ready } = useWallets();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Preparing the client-side wallet signer...');
  const wallet = wallets.find(item => item.type === 'ethereum');
  const canSign = ready && state.status === 'done' && Boolean(wallet) && !busy;

  async function signExactVersion() {
    const versionHash = review.version.hash;
    if (!wallet || !versionHash || busy) return;
    setBusy(true);
    setMessage('Confirm the exact Contract Version in your wallet...');
    try {
      await wallet.switchChain(baseSepoliaChainId);
      const provider: EIP1193Provider = await wallet.getEthereumProvider();
      const signature = await provider.request({ method: 'eth_signTypedData_v4', params: [wallet.address, JSON.stringify(acceptanceTypedData(contractId, review.version.id, versionHash))] });
      await onSignature({ walletAddress: wallet.address, walletSignature: String(signature), versionHash });
      setMessage('Exact Version acceptance recorded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The wallet signature was not completed.');
    } finally {
      setBusy(false);
    }
  }

  if (!auth.accessToken) return <p className="notice" role="status">The local test identity can inspect this Contract, but it does not emulate a wallet signature.</p>;
  if (!ready || state.status === 'loading') return <p className="empty" role="status" aria-live="polite">Preparing the client-side wallet signer...</p>;
  if (state.status === 'error') return <p className="notice" role="alert">Your wallet connection needs a current signed-in session.</p>;
  if (!wallet) return <><p className="notice" role="status">Connect an EVM wallet on Base Sepolia before accepting this exact Version.</p><Link className="button" href="/wallet">Open Wallet</Link></>;
  return <><p className="wallet-address">Wallet {wallet.address}</p><button className="primary" type="button" onClick={() => void signExactVersion()} disabled={!canSign}>{busy ? 'Waiting for wallet...' : 'Sign and accept exact Version'}</button><p className="empty" role="status" aria-live="polite">{message}</p></>;
}

function WalletAcceptance({ auth, contractId, review, onAccepted }: { auth: AuthHeaders; contractId: string; review: ContractReview; onAccepted: (review: ContractReview) => void }) {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  useEffect(() => {
    if (auth.localTestEmail) return;
    void getAuthConfig().then(setConfig).catch(error => setConfigError(error instanceof Error ? error.message : 'Wallet configuration is unavailable.'));
  }, [auth.localTestEmail]);
  if (auth.localTestEmail) return <p className="notice" role="status">The local test identity can inspect this Contract, but it does not emulate a wallet signature.</p>;
  if (configError) return <p className="notice" role="alert">{configError}</p>;
  if (!config) return <p className="empty" role="status">Loading wallet acceptance...</p>;
  if (!config.privyAppId) return <p className="notice" role="status">Wallet acceptance is not configured for this environment. No server-only wallet credentials are used by the page.</p>;
  return <PrivyProvider appId={config.privyAppId} config={{ embeddedWallets: { ethereum: { createOnLogin: 'off' } } }}><WalletAcceptanceControls auth={auth} contractId={contractId} review={review} onSignature={async signature => {
    const response = await apiRequest<ReviewPayload>(`/api/contracts/${encodeURIComponent(contractId)}/versions/${encodeURIComponent(review.version.id)}/acceptances`, { method: 'POST', body: JSON.stringify(signature) }, auth);
    onAccepted(response.review);
  }} /></PrivyProvider>;
}

function AcceptancePanel({ auth, contractId, review, onAccepted }: { auth: AuthHeaders; contractId: string; review: ContractReview; onAccepted: (review: ContractReview) => void }) {
  return <section className="app-panel acceptance-panel" aria-labelledby="acceptance-title"><div className="section-heading"><div><p className="eyebrow">Wallet-backed acceptance</p><h2 id="acceptance-title">Accept exact Version {review.version.number}</h2></div><span className={`status ${review.canAccept ? 'active' : ''}`}>{review.canAccept ? 'Ready when signed' : 'Not ready'}</span></div><AcceptanceCopy review={review}/>{review.canAccept && review.version.hash && <WalletAcceptance auth={auth} contractId={contractId} review={review} onAccepted={onAccepted}/>}<p className="empty">Version hash: {review.version.hash || 'Not assigned until the protected Version is complete.'}</p></section>;
}

function AuthorisedContract({ auth, contractId, detail, review, onAccepted }: { auth: AuthHeaders; contractId: string; detail: ContractDetail; review: ContractReview | null; onAccepted: (review: ContractReview) => void }) {
  const presentation = useMemo(() => contractDetailPresentation(detail), [detail]);
  const [activeReview, setActiveReview] = useState<ContractReview | null>(review);
  useEffect(() => setActiveReview(review), [review]);
  return <section className="contract-detail" aria-labelledby="contract-detail-title"><header className="contract-header"><Link className="crumb" href="/contracts">Contracts <span aria-hidden="true">/</span> Detail</Link><div className="contract-heading-row"><div><div className="title-line"><h1 id="contract-detail-title">{presentation.title}</h1><span className={`contract-stage ${presentation.stage.tone}`}>{presentation.stage.label}</span></div><p className="contract-meta">{presentation.meta}</p></div><Link className="button" href={`/contracts/${encodeURIComponent(contractId)}/review-terms`}>Open editable terms</Link></div></header><div className="contract-layout"><main className="contract-main"><div className="detail-tabs" role="tablist" aria-label="Contract detail views"><button type="button" role="tab" aria-selected="true">Overview</button><button type="button" role="tab" aria-selected="false" disabled>Activity (coming soon)</button></div><section className="app-panel" aria-labelledby="milestones-title"><div className="section-heading"><div><p className="eyebrow">Lifecycle</p><h2 id="milestones-title">Milestones</h2></div><span className="status">{presentation.completed} of {presentation.milestones.length} complete</span></div>{presentation.milestones.length ? <ol className="milestone-timeline">{presentation.milestones.map(item => <Milestone key={`${item.number}-${item.title}`} item={item}/>)}</ol> : <p className="empty">No milestones are present in the authorised Contract Version.</p>}</section><section className="app-panel scope-panel" aria-labelledby="scope-title"><p className="eyebrow">Scope</p><h2 id="scope-title">Agreed work</h2><p>{detail.sections.scope?.description || 'The authorised Contract Version does not include a scope description.'}</p><dl className="project-details"><dt>Buyer</dt><dd>{detail.buyer}</dd><dt>Counterparty</dt><dd>{detail.counterparty}</dd><dt>Outcome</dt><dd>{detail.sections.scope?.outcome || 'Recorded in Contract terms'}</dd></dl></section>{activeReview && <ReviewTerms review={activeReview}/>}</main><aside className="contract-rail"><section className="rail-panel payment-panel" aria-labelledby="payment-title"><p className="eyebrow">Payment boundary</p><h2 id="payment-title">{presentation.payment.total}</h2><p className="rail-kicker">{presentation.payment.label}</p><p className="rail-amount">{presentation.payment.progress}</p><p className="notice">Proposed Contract terms are not personal wallet funds, secured funds, paid funds, or released funds.</p></section>{activeReview ? <AcceptancePanel auth={auth} contractId={contractId} review={activeReview} onAccepted={nextReview => { setActiveReview(nextReview); onAccepted(nextReview); }}/> : <section className="rail-panel" aria-label="Version review unavailable"><p className="eyebrow">Version review</p><h2>Review state unavailable.</h2><p className="empty">The Contract detail is authorised, but its Version review could not be loaded.</p></section>}</aside></div></section>;
}

export function ContractDetailPage({ contractId }: { contractId: string }) {
  const { status, auth } = useSignedInAuth();
  const [detail, setDetail] = useState<ContractDetail | null>(null);
  const [review, setReview] = useState<ContractReview | null>(null);
  const [state, setState] = useState<DetailState>('loading');
  const [message, setMessage] = useState('');

  const load = useCallback(async (currentAuth: AuthHeaders) => {
    setState('loading');
    setMessage('');
    try {
      const detailResponse = await apiRequest<DetailPayload>(`/api/contracts/${encodeURIComponent(contractId)}/detail`, {}, currentAuth);
      setDetail(detailResponse.contract);
      setState('authorised');
      try {
        const reviewResponse = await apiRequest<ReviewPayload>(`/api/contracts/${encodeURIComponent(contractId)}/review`, {}, currentAuth);
        setReview(reviewResponse.review);
      } catch (reviewError) {
        setReview(null);
        setMessage(reviewError instanceof Error ? reviewError.message : 'The protected Version review is unavailable.');
      }
    } catch (requestError) {
      const apiError = requestError as ApiError;
      setState(apiError.status === 401 ? 'unauthenticated' : apiError.status === 403 ? 'forbidden' : apiError.status === 404 || apiError.status === 422 ? 'missing' : 'failure');
      setMessage(apiError.message || 'The protected Contract detail is unavailable.');
    }
  }, [contractId]);

  useEffect(() => {
    if (status === 'ready' && auth) void load(auth);
    if (status === 'error') setState('unauthenticated');
  }, [auth, load, status]);

  if (status === 'loading' || state === 'loading') return <LoadingState />;
  if (state !== 'authorised' || !detail) return <StatePanel state={state === 'authorised' ? 'failure' : state} message={message || 'The protected Contract detail is unavailable.'} onRetry={auth ? () => void load(auth) : undefined} />;
  return <AuthorisedContract auth={auth ?? {}} contractId={contractId} detail={detail} review={review} onAccepted={setReview} />;
}
