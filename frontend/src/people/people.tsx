'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { apiRequest, type ApiError, type AuthHeaders } from '../auth/client';
import { useSignedInAuth } from '../signed-in/app-shell';

type Person = {
  id: string;
  display_name: string | null;
  username?: string | null;
  professional_headline?: string | null;
};

type Connection = {
  id: string;
  other_profile_id: string;
  display_name: string | null;
  professional_headline?: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'blocked' | string;
  direction: 'incoming' | 'outgoing' | string;
};

type PeopleData = { discover: Person[]; connections: Connection[] };
type ConnectionAction = 'send' | 'accept' | 'decline' | 'withdraw' | 'remove' | 'block';

const actionLabels: Record<ConnectionAction, string> = {
  send: 'Send connection request',
  accept: 'Accept request',
  decline: 'Decline request',
  withdraw: 'Withdraw request',
  remove: 'Remove connection',
  block: 'Block Profile'
};

function displayName(person: Pick<Person, 'display_name'>): string {
  return person.display_name?.trim() || 'NEXUM Profile';
}

function connectionStatus(connection: Connection | undefined): string {
  if (!connection) return 'Not connected';
  if (connection.status === 'pending') return connection.direction === 'incoming' ? 'Incoming request' : 'Request pending';
  if (connection.status === 'accepted') return 'Connected';
  if (connection.status === 'blocked') return 'Blocked';
  if (connection.status === 'declined') return 'Request declined';
  if (connection.status === 'withdrawn') return 'Request withdrawn';
  return 'Connection unavailable';
}

function statusClass(connection: Connection | undefined): string {
  if (connection?.status === 'accepted') return 'active';
  if (connection?.status === 'blocked') return 'attention';
  if (connection?.status === 'pending') return 'attention';
  return '';
}

function connectionActionSet(connection: Connection | undefined, surface: 'discover' | 'network' | 'requests'): ConnectionAction[] {
  if (!connection) return ['send'];
  if (connection.status === 'pending' && connection.direction === 'incoming') return ['accept', 'decline', 'block'];
  if (connection.status === 'pending' && connection.direction === 'outgoing') return ['withdraw', 'block'];
  if (connection.status === 'accepted' && surface === 'network') return ['remove', 'block'];
  return [];
}

function actionClass(action: ConnectionAction): string {
  return action === 'send' || action === 'accept' ? 'primary' : action === 'block' || action === 'decline' ? 'danger' : 'ghost';
}

function PersonActions({
  personId,
  connection,
  surface,
  busy,
  onAction
}: {
  personId: string;
  connection?: Connection;
  surface: 'discover' | 'network' | 'requests';
  busy: boolean;
  onAction: (profileId: string, action: ConnectionAction) => void;
}) {
  return <div className="people-actions">
    {connectionActionSet(connection, surface).map(action => <button key={action} className={actionClass(action)} type="button" disabled={busy} onClick={() => onAction(personId, action)}>{actionLabels[action]}</button>)}
  </div>;
}

function PersonSummary({ person, connection }: { person: Person | Connection; connection?: Connection }) {
  return <div className="people-summary">
    <strong>{displayName(person)}</strong>
    {('username' in person && person.username) && <small>@{person.username}</small>}
    {person.professional_headline && <small>{person.professional_headline}</small>}
    {connection && <span className={`status ${statusClass(connection)}`}>{connectionStatus(connection)}</span>}
  </div>;
}

function PeopleLoading() {
  return <>
    <section className="people-intro"><p className="eyebrow">People</p><h1>Professional connections, kept separate from access.</h1><p id="people-access-note" className="page-intro">Discovering or connecting with a person does not grant either of you Contract access.</p></section>
    <section className="app-panel people-panel"><p className="eyebrow">Discover People</p><div className="people-search"><label htmlFor="people-search">Search name, username, or professional headline<input id="people-search" type="search" placeholder="Search name, username, or professional headline" disabled /></label><button className="primary" type="button" disabled>Search</button></div><p className="notice" role="status" aria-live="polite">Loading eligible People…</p><div className="list" aria-busy="true"><p className="empty">Loading Profiles that opted into discovery…</p></div></section>
    <section className="dashboard-grid"><article className="app-panel"><p className="eyebrow">My network</p><h2>Accepted connections</h2><p className="empty">Loading your network…</p></article><article className="app-panel"><p className="eyebrow">Requests</p><h2>Pending activity</h2><p className="empty">Loading requests…</p></article></section>
  </>;
}

export function PeoplePage() {
  const { status, auth } = useSignedInAuth();
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<PeopleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyProfileId, setBusyProfileId] = useState<string | null>(null);
  const initialLoad = useRef(true);

  const loadPeople = useCallback(async (search: string, currentAuth: AuthHeaders) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<{ people: PeopleData }>(`/api/people${search ? `?q=${encodeURIComponent(search)}` : ''}`, {}, currentAuth);
      setPeople(response.people);
    } catch (requestError) {
      const apiError = requestError as ApiError;
      setError(apiError.message || 'People is unavailable. Check your sign-in, then try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== 'ready' || !auth) return;
    const delay = initialLoad.current ? 0 : 220;
    initialLoad.current = false;
    const timer = window.setTimeout(() => { void loadPeople(query, auth); }, delay);
    return () => window.clearTimeout(timer);
  }, [auth, loadPeople, query, status]);

  const connectionsByProfile = useMemo(() => new Map((people?.connections ?? []).map(connection => [connection.other_profile_id, connection])), [people]);
  const network = useMemo(() => (people?.connections ?? []).filter(connection => connection.status === 'accepted'), [people]);
  const requests = useMemo(() => (people?.connections ?? []).filter(connection => connection.status === 'pending'), [people]);

  async function handleAction(profileId: string, action: ConnectionAction) {
    if (!auth || busyProfileId) return;
    setBusyProfileId(profileId);
    setActionError(null);
    try {
      await apiRequest('/api/people/connections', { method: 'POST', body: JSON.stringify({ profileId, action }) }, auth);
      await loadPeople(query, auth);
    } catch (requestError) {
      const apiError = requestError as ApiError;
      setActionError(apiError.message || 'This connection action is unavailable. Refresh the directory and try again.');
    } finally {
      setBusyProfileId(null);
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(value => value.trim());
  }

  if (status === 'loading' || (!people && !error)) return <PeopleLoading />;
  if (error && !people) return <section className="app-panel people-error-panel"><p className="eyebrow">People</p><h1>People is unavailable.</h1><p className="page-intro" role="alert">{error}</p><button className="primary" type="button" onClick={() => auth && void loadPeople(query, auth)}>Try again</button></section>;

  return <>
    <section className="people-intro"><p className="eyebrow">People</p><h1>Professional connections, kept separate from access.</h1><p id="people-access-note" className="page-intro">Discovering or connecting with a person does not grant either of you Contract access.</p></section>
    <section className="app-panel people-panel" aria-labelledby="discover-people-title">
      <div className="people-panel-heading"><div><p className="eyebrow">Directory</p><h2 id="discover-people-title">Discover People</h2></div><span className="people-result-note">Opt-in Profiles only</span></div>
      <form className="people-search" onSubmit={handleSearch}><label htmlFor="people-search">Search name, username, or professional headline<input id="people-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, username, or professional headline" aria-describedby="people-access-note people-status" /></label><button className="primary" type="submit">Search</button></form>
      {actionError && <p className="people-error" role="alert">{actionError}</p>}
      {error && <p className="people-error" role="alert">{error} <button type="button" className="ghost" onClick={() => auth && void loadPeople(query, auth)}>Retry</button></p>}
      <p id="people-status" className="notice" role="status" aria-live="polite">{loading ? 'Loading eligible People…' : people?.discover.length ? `${people.discover.length} eligible Profile${people.discover.length === 1 ? '' : 's'} found.` : 'No eligible Profiles match this search yet.'}</p>
      <div className="list" aria-live="polite" aria-busy={loading}>
        {!loading && people?.discover.map(person => {
          const connection = connectionsByProfile.get(person.id);
          return <article className="list-item people-card" key={person.id}><PersonSummary person={person} connection={connection} /><PersonActions personId={person.id} connection={connection} surface="discover" busy={busyProfileId === person.id} onAction={handleAction} /></article>;
        })}
        {!loading && people?.discover.length === 0 && <p className="empty">Try a name, username, or professional headline. Discovery never exposes private Profile fields.</p>}
      </div>
    </section>

    <section className="dashboard-grid people-secondary-grid">
      <article className="app-panel" aria-labelledby="network-title"><p className="eyebrow">My network</p><h2 id="network-title">Accepted connections</h2><div className="list" aria-live="polite">{network.length ? network.map(connection => <article className="list-item people-card" key={connection.id}><PersonSummary person={connection} connection={connection} /><PersonActions personId={connection.other_profile_id} connection={connection} surface="network" busy={busyProfileId === connection.other_profile_id} onAction={handleAction} /></article>) : <p className="empty">Accepted connections will appear here after a request is accepted.</p>}</div></article>
      <article className="app-panel" aria-labelledby="requests-title"><p className="eyebrow">Requests</p><h2 id="requests-title">Pending activity</h2><div className="list" aria-live="polite">{requests.length ? requests.map(connection => <article className="list-item people-card" key={connection.id}><div><PersonSummary person={connection} connection={connection} /><small className="people-direction">{connection.direction === 'incoming' ? 'This Profile is waiting for your response.' : 'Waiting for the other Profile to respond.'}</small></div><PersonActions personId={connection.other_profile_id} connection={connection} surface="requests" busy={busyProfileId === connection.other_profile_id} onAction={handleAction} /></article>) : <p className="empty">There are no pending connection requests.</p>}</div></article>
    </section>
  </>;
}
