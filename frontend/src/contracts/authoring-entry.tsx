'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { apiRequest, type ApiError, type AuthHeaders } from '../auth/client';
import { useSignedInAuth } from '../signed-in/app-shell';
import { acceptedCounterparties, normalizeExactEmail, type CounterpartyConnection } from './authoring-entry-presentation';

type PeoplePayload = { people: { connections: Connection[] } };
type DraftPayload = { contract: { id: string; sections?: { parties?: { counterparty_email?: string | null } }; status: string } };
type Connection = CounterpartyConnection;

function Stepper({ existing }: { existing: boolean }) {
  const steps = ['Choose Person', 'Project details', 'Review terms', 'Send'];
  return <ol className="contract-stepper" aria-label="Contract Draft steps">{steps.map((step, index) => <li key={step} aria-current={index === 0 ? 'step' : undefined}><span>{index + 1}. </span>{step}{existing && index > 0 ? ' · available next' : ''}</li>)}</ol>;
}

function LoadingState({ existing }: { existing: boolean }) {
  return <section className="app-panel" aria-busy="true"><p className="eyebrow">Contract Draft</p><h1>Loading {existing ? 'the authorised draft' : 'counterparty choices'}...</h1><p className="empty" role="status">Preparing the protected authoring entry.</p></section>;
}

export function AuthoringEntryPage({ contractId }: { contractId?: string }) {
  const { status, auth } = useSignedInAuth();
  const router = useRouter();
  const existing = Boolean(contractId);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [email, setEmail] = useState('');
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const loadEntry = useCallback(async (currentAuth: AuthHeaders) => {
    setLoading(true);
    setError(null);
    try {
      const peoplePromise = apiRequest<PeoplePayload>('/api/people', {}, currentAuth);
      const draftPromise = contractId ? apiRequest<DraftPayload>(`/api/contracts/${encodeURIComponent(contractId)}`, {}, currentAuth) : Promise.resolve(null);
      const [people, draft] = await Promise.all([peoplePromise, draftPromise]);
      setConnections(acceptedCounterparties(people.people.connections));
      const currentEmail = draft?.contract.sections?.parties?.counterparty_email?.trim().toLowerCase() || null;
      setSavedEmail(currentEmail);
      if (currentEmail) setEmail(currentEmail);
    } catch (requestError) {
      const apiError = requestError as ApiError;
      setError(apiError.message || 'The protected authoring entry is unavailable.');
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    if (status === 'ready' && auth) void loadEntry(auth);
  }, [auth, loadEntry, status]);

  const selectedPerson = useMemo(() => connections.find(connection => connection.other_profile_id === selectedPersonId), [connections, selectedPersonId]);

  function choosePerson(connection: Connection) {
    setSelectedPersonId(connection.other_profile_id);
    setEmail(connection.email ?? '');
    setValidationError(null);
  }

  function changeEmail(value: string) {
    setEmail(value);
    setSelectedPersonId('');
    setValidationError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth || submitting) return;
    const rawEmail = selectedPerson?.email ?? email;
    const exactEmail = normalizeExactEmail(rawEmail);
    if (rawEmail.trim() && !exactEmail) {
      setValidationError('Enter an exact, valid counterparty email address or choose an accepted Person.');
      return;
    }
    setValidationError(null);
    setSubmitting(true);
    setError(null);
    try {
      if (contractId) {
        router.push(`/contracts/${encodeURIComponent(contractId)}/project-details`);
        return;
      }
      const response = await apiRequest<{ contract: { id: string } }>('/api/contracts', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Untitled Contract Draft',
          scope: 'Define the Contract scope before publishing.',
          counterpartyEmail: exactEmail,
          initiatorResponsibility: 'buyer'
        })
      }, auth);
      router.push(`/contracts/${encodeURIComponent(response.contract.id)}/project-details`);
    } catch (requestError) {
      const apiError = requestError as ApiError;
      setError(apiError.message || 'The Contract Draft could not be created.');
      setSubmitting(false);
    }
  }

  if (status === 'loading' || loading) return <LoadingState existing={existing} />;
  if (error && existing && !savedEmail) return <section className="app-panel" aria-labelledby="authoring-error-title"><p className="eyebrow">Contract Draft</p><h1 id="authoring-error-title">This authoring entry is unavailable.</h1><p className="page-intro" role="alert">{error}</p><Link className="button" href="/contracts">Back to Contracts</Link></section>;

  return <section className="contract-authoring-flow app-panel" aria-labelledby="authoring-title"><Stepper existing={existing} /><p className="eyebrow">Contract Draft</p><h1 id="authoring-title">Choose the other Contract Party.</h1><p className="page-intro">People discovery and Contract access stay separate. Choose a Person, enter an exact email, or continue without one. A choice only records the intended counterparty on your private draft; it does not grant them access.</p>
    {savedEmail && <p className="notice" role="status">This authorised draft already names <strong>{savedEmail}</strong>. Continue to Project details when you are ready.</p>}
    <form onSubmit={submit}>
      {!existing && <fieldset><legend>Choose an accepted Person</legend>{connections.length ? <div className="person-list">{connections.map(connection => <button className="person-choice" type="button" key={connection.other_profile_id} aria-pressed={selectedPersonId === connection.other_profile_id} onClick={() => choosePerson(connection)}><span className="person-avatar" aria-hidden="true">{(connection.display_name?.trim() || 'P').slice(0, 1).toUpperCase()}</span><span><strong>{connection.display_name?.trim() || 'PactFlow Profile'}</strong><small>{connection.email}</small></span></button>)}</div> : <p className="empty">No accepted People are available yet. Use an exact email below.</p>}</fieldset>}
      {!existing && <><hr className="authoring-divider" /><fieldset><legend>Or enter an exact email</legend><label htmlFor="counterparty-email">Counterparty email<input id="counterparty-email" className="exact-email" type="email" value={email} onChange={event => changeEmail(event.target.value)} placeholder="person@example.com" autoComplete="email" aria-invalid={Boolean(validationError)} aria-describedby="counterparty-help" /></label><p id="counterparty-help" className="muted">Optional. Leave this blank for a private draft; the invitation and access workflow happen later.</p></fieldset></>}
      {validationError && <p className="notice" role="alert">{validationError}</p>}
      {error && <p className="notice" role="alert">{error}</p>}
      <div className="action-row"><Link className="button" href="/contracts">Back to Contracts</Link><button className="primary" type="submit" disabled={submitting}>{submitting ? 'Opening Draft...' : existing ? 'Continue to Project details' : 'Continue to Project details'}</button></div>
    </form>
  </section>;
}
