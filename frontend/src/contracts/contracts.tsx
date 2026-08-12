'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest, type ApiError, type AuthHeaders } from '../auth/client';
import { useSignedInAuth } from '../signed-in/app-shell';
import { emptyContractsMessage, filterContracts, type ContractListItem } from './presentation';

type ContractsPayload = { contracts: ContractListItem[] };

function LoadingState() {
  return <>
    <section className="dashboard-intro"><p className="eyebrow">Contracts</p><h1>Your Contract work, in one place.</h1><p className="page-intro">Loading your Contracts...</p></section>
    <section className="app-panel" aria-busy="true"><p className="empty" role="status">Loading authorised Contracts...</p></section>
  </>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <section className="app-panel" aria-labelledby="contracts-error-title"><p className="eyebrow">Contracts</p><h1 id="contracts-error-title">Contracts could not be loaded.</h1><p className="page-intro" role="alert">{message}</p><button className="primary" type="button" onClick={onRetry}>Try again</button></section>;
}

function ContractTable({ contracts }: { contracts: ReturnType<typeof filterContracts> }) {
  return <table className="contract-table"><caption className="sr-only">Authorised Contracts</caption><thead><tr><th scope="col">Contract</th><th scope="col">Counterparty</th><th scope="col">Your responsibility</th><th scope="col">Stage</th><th scope="col">Next milestone</th><th scope="col">Last activity</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead><tbody>{contracts.map(contract => <tr key={contract.id}><td><strong>{contract.displayTitle}</strong><small>{contract.version}</small></td><td>{contract.counterparty}</td><td>{contract.responsibility}</td><td><span className={`status ${contract.statusTone}`}>{contract.stage}</span></td><td>{contract.nextMilestoneLabel}</td><td>{contract.lastActivityLabel}</td><td><Link className="button" href={contract.action.href}>{contract.action.label}</Link></td></tr>)}</tbody></table>;
}

function MobileRecords({ contracts }: { contracts: ReturnType<typeof filterContracts> }) {
  return <div className="mobile-records" aria-live="polite">{contracts.map(contract => <article className="record contract-record" key={contract.id}><div className="contract-record-heading"><strong>{contract.displayTitle}</strong><small>{contract.version} · {contract.stage}</small></div><span className={`status ${contract.statusTone}`}>{contract.stage}</span><div className="contract-record-action"><span className="label">Counterparty</span> {contract.counterparty}<br /><span className="label">Your responsibility</span> {contract.responsibility}<br /><span className="label">Next milestone</span> {contract.nextMilestoneLabel}<br /><span className="label">Last activity</span> {contract.lastActivityLabel}<Link className="button" href={contract.action.href}>{contract.action.label}</Link></div></article>)}</div>;
}

export function ContractsPage() {
  const { status, auth } = useSignedInAuth();
  const [data, setData] = useState<ContractsPayload | null>(null);
  const [stage, setStage] = useState('');
  const [responsibility, setResponsibility] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadContracts = useCallback(async (currentAuth: AuthHeaders) => {
    setError(null);
    try {
      setData(await apiRequest<ContractsPayload>('/api/contracts', {}, currentAuth));
    } catch (requestError) {
      const apiError = requestError as ApiError;
      setError(apiError.message || 'Your authorised Contracts are unavailable.');
    }
  }, []);

  useEffect(() => {
    if (status === 'ready' && auth) void loadContracts(auth);
  }, [auth, loadContracts, status]);

  const contracts = useMemo(() => filterContracts(data?.contracts ?? [], stage, responsibility), [data, responsibility, stage]);
  const hasFilters = Boolean(stage || responsibility);

  if (status === 'loading' || (!data && !error)) return <LoadingState />;
  if (error && !data) return <ErrorState message={error} onRetry={() => auth && void loadContracts(auth)} />;

  return <>
    <section className="dashboard-intro"><p className="eyebrow">Contracts</p><h1>Your Contract work, in one place.</h1><p className="page-intro">Open authorised Contract records or start a protected Contract Draft. A counterparty selection never grants access by itself.</p></section>
    <section className="app-panel contracts-panel" aria-labelledby="contracts-list-title">
      <div className="dashboard-section-heading"><div><p className="eyebrow">Authorised records</p><h2 id="contracts-list-title">Contracts</h2></div><Link className="button primary" href="/contracts/new/choose-person" id="new-contract">Create a Contract Draft</Link></div>
      <div className="contract-filters" aria-label="Filter Contracts"><label htmlFor="stage-filter">Stage<select id="stage-filter" value={stage} onChange={event => setStage(event.target.value)}><option value="">All stages</option><option value="private_draft">Contract Draft</option><option value="negotiation">Awaiting review</option><option value="active">In progress</option><option value="complete">Complete</option></select></label><label htmlFor="responsibility-filter">Your responsibility<select id="responsibility-filter" value={responsibility} onChange={event => setResponsibility(event.target.value)}><option value="">All responsibilities</option><option value="Buyer">Buyer</option><option value="Service Provider">Service Provider</option></select></label></div>
      {error && <p className="notice" role="alert">{error} <button className="ghost" type="button" onClick={() => auth && void loadContracts(auth)}>Retry</button></p>}
      {!contracts.length ? <p className="empty" role="status">{emptyContractsMessage(hasFilters)}</p> : <><ContractTable contracts={contracts} /><MobileRecords contracts={contracts} /></>}
    </section>
  </>;
}
