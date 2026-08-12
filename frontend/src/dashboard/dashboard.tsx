'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest, type ApiError } from '../auth/client';
import { dashboardPresentation, dashboardStatusClass, type DashboardPresentation, type HomeData } from './presentation';
import { useSignedInAuth } from '../signed-in/app-shell';

function EmptyMessage({ message, href, label }: { message: string; href: string; label: string }) {
  return <div className="dashboard-empty"><p>{message}</p><Link className="button primary" href={href}>{label}</Link></div>;
}

function DashboardContent({ presentation }: { presentation: DashboardPresentation }) {
  return <>
    <section className="dashboard-intro"><p className="eyebrow">Dashboard</p><h1>{presentation.headline}</h1><p className="page-intro">{presentation.description}</p></section>
    <section className="metric-grid dashboard-metrics" aria-label="Contract summary">
      <article className="app-panel metric"><strong>{presentation.metrics.attention}</strong><span>Needs your attention</span></article>
      <article className="app-panel metric"><strong>{presentation.metrics.active}</strong><span>Active Contracts</span></article>
      <article className="app-panel metric"><strong>{presentation.metrics.complete}</strong><span>Completed Contracts</span></article>
    </section>
    <section className="dashboard-grid">
      <article className="app-panel"><p className="eyebrow">Action board</p><h2>What needs you now</h2><div className="list" aria-live="polite">{presentation.actions.length ? presentation.actions.map(action => <article className="dashboard-item" key={action.contractId}><div><strong>{action.title}</strong><p>{action.detail}</p></div><Link className="button" href={action.href}>{action.label}</Link></article>) : <EmptyMessage message="No Contract decisions need you right now." href="/contracts#new-contract" label="Create Contract" />}</div></article>
      <aside className="app-panel"><p className="eyebrow">Milestone schedule</p><h2>Next milestones</h2><div className="list" aria-live="polite">{presentation.timeline.length ? presentation.timeline.map(item => <article className="dashboard-item" key={item.contractId}><div><strong>{item.title}</strong><p>{item.detail}</p></div><Link className="button" href={item.href}>Open Contract</Link></article>) : <EmptyMessage message="No upcoming milestones are scheduled yet." href="/contracts" label="View Contracts" />}</div></aside>
    </section>
    {presentation.contracts.length > 0 && <section className="app-panel dashboard-contracts" aria-labelledby="dashboard-contracts-title"><div className="dashboard-section-heading"><div><p className="eyebrow">Your Contracts</p><h2 id="dashboard-contracts-title">Current Contract work</h2></div><Link className="button" href={presentation.primaryAction.href}>{presentation.primaryAction.label}</Link></div><div className="dashboard-contract-list" aria-live="polite">{presentation.contracts.map(contract => <article className="dashboard-contract" key={contract.id}><div><p className="dashboard-card-eyebrow">Version {contract.latestVersionNumber} · {contract.responsibility}</p><h3>{contract.title}</h3><p>With {contract.counterparty}</p></div><div className="dashboard-contract-action"><span className={`status ${dashboardStatusClass(contract.status)}`}>{contract.stage}</span><Link className="button" href={contract.href}>{contract.status === 'private_draft' ? 'Continue' : 'Open'}</Link></div></article>)}</div></section>}
  </>;
}

export function DashboardPage() {
  const { status, auth } = useSignedInAuth();
  const [presentation, setPresentation] = useState<DashboardPresentation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'ready' || !auth) return;
    let active = true;
    void apiRequest<{ home: HomeData }>('/api/home', {}, auth).then(({ home }) => {
      if (active) setPresentation(dashboardPresentation(home));
    }).catch(requestError => {
      if (!active) return;
      const message = requestError as ApiError;
      setError(message.message || 'Your Dashboard could not be loaded. Check your sign-in, then try again.');
    });
    return () => { active = false; };
  }, [status, auth]);

  if (status === 'loading') return <DashboardLoading />;
  if (error) return <DashboardError message={error} />;
  if (!presentation) return <DashboardLoading />;
  return <DashboardContent presentation={presentation} />;
}

function DashboardLoading() {
  return <><section className="dashboard-intro"><p className="eyebrow">Dashboard</p><h1>Your work, with the next step clear.</h1><p className="page-intro">Loading your Contract actions...</p></section><section className="metric-grid dashboard-metrics" aria-label="Contract summary" aria-busy="true"><article className="app-panel metric"><strong>-</strong><span>Needs your attention</span></article><article className="app-panel metric"><strong>-</strong><span>Active Contracts</span></article><article className="app-panel metric"><strong>-</strong><span>Completed Contracts</span></article></section><section className="dashboard-grid"><article className="app-panel"><p className="eyebrow">Action board</p><h2>What needs you now</h2><div className="list" aria-live="polite" aria-busy="true"><p className="empty">Loading Contract actions...</p></div></article><aside className="app-panel"><p className="eyebrow">Milestone schedule</p><h2>Next milestones</h2><div className="list" aria-live="polite" aria-busy="true"><p className="empty">Loading active milestones...</p></div></aside></section></>;
}

function DashboardError({ message }: { message: string }) {
  return <><p className="dashboard-error" role="alert">{message}</p><section className="dashboard-intro"><p className="eyebrow">Dashboard</p><h1>Your Dashboard could not be loaded.</h1><p className="page-intro">Check your sign-in, then try again.</p></section><section className="dashboard-grid"><article className="app-panel"><p className="eyebrow">Action board</p><h2>What needs you now</h2><EmptyMessage message="Reconnect to load your Contract actions." href="/contracts" label="Open Contracts" /></article><aside className="app-panel"><p className="eyebrow">Milestone schedule</p><h2>Next milestones</h2><EmptyMessage message="Milestone dates are unavailable until the Dashboard reconnects." href="/contracts" label="Open Contracts" /></aside></section></>;
}
