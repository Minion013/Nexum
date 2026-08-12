import type { ReactNode } from 'react';

export type AuthorityEntry = {
  id: string;
  name: string;
  jurisdictionLabel: string;
  rulesetVersion: string;
  isSimulated: boolean;
};

export type AuthorityRegistryData = { entries: AuthorityEntry[] };

export function AuthoritiesLoading() {
  return <>
    <section className="page-intro-block"><p className="eyebrow">Authorities</p><h1>Resolution Authorities</h1><p className="page-intro">A platform-managed registry of the authorities and rulesets available for Contract selection.</p></section>
    <section className="app-panel" aria-labelledby="authority-registry-title" aria-busy="true"><p className="eyebrow">Authority Registry</p><h2 id="authority-registry-title">Loading published authorities</h2><p className="empty" role="status" aria-live="polite">Loading the Authority Registry…</p></section>
  </>;
}

export function AuthoritiesError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <section className="app-panel" aria-labelledby="authority-error-title"><p className="eyebrow">Authorities</p><h1 id="authority-error-title">Authority Registry unavailable.</h1><p className="page-intro" role="alert">{message}</p>{onRetry && <p><button className="primary" type="button" onClick={onRetry}>Try again</button></p>}</section>;
}

export function AuthoritiesForbidden() {
  return <section className="app-panel" aria-labelledby="authority-forbidden-title"><p className="eyebrow">Authorities</p><h1 id="authority-forbidden-title">Authority Registry access is restricted.</h1><p className="page-intro" role="alert">Your Profile is not allowed to view this registry.</p></section>;
}

function AuthorityCard({ authority }: { authority: AuthorityEntry }) {
  return <article className="list-item" aria-label={authority.name}>
    <div><strong>{authority.name}</strong><small>{authority.jurisdictionLabel}</small></div>
    <div><small>Ruleset {authority.rulesetVersion}</small>{authority.isSimulated && <span className="status">Simulated</span>}</div>
  </article>;
}

export function AuthoritiesContent({ data }: { data: AuthorityRegistryData }): ReactNode {
  return <>
    <section className="page-intro-block"><p className="eyebrow">Authorities</p><h1>Resolution Authorities</h1><p className="page-intro">A platform-managed registry of the authorities and rulesets available for Contract selection.</p></section>
    <section className="app-panel" aria-labelledby="authority-registry-title"><p className="eyebrow">Authority Registry</p><h2 id="authority-registry-title">Published authorities</h2><p className="notice">Registry entries are platform-managed. A simulated label describes this environment and is not an accreditation claim.</p><div className="list" aria-live="polite">{data.entries.length ? data.entries.map(authority => <AuthorityCard key={authority.id} authority={authority} />) : <p className="empty">No published Resolution Authorities are available yet.</p>}</div></section>
  </>;
}
