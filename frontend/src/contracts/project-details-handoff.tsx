'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiRequest, ApiError } from '../auth/client';
import { useSignedInAuth } from '../signed-in/app-shell';
import { DraftIssues, DraftStepper } from './draft-components';
import {
  editableDraftFromContract,
  linesToList,
  listToLines,
  type ContractDraftResponse,
  type DraftIssue,
  type EditableContractDraft,
  utcFromLocalDateTime,
  localDateTimeValue
} from './draft-model';

type DraftPayload = { contract: ContractDraftResponse };

function LoadingDraft() {
  return <section className="app-panel" aria-busy="true"><p className="eyebrow">Contract Draft</p><h1>Loading your persisted draft...</h1><p className="empty" role="status">Checking your authorised Project details.</p></section>;
}

function DraftUnavailable({ error }: { error: ApiError | Error | null }) {
  const forbidden = error instanceof ApiError && error.status === 403;
  return <section className="app-panel" aria-labelledby="project-details-error"><p className="eyebrow">Contract Draft</p><h1 id="project-details-error">{forbidden ? 'This Contract Draft is restricted.' : 'This Contract Draft is unavailable.'}</h1><p className="page-intro" role="alert">{forbidden ? 'Only a Contract Party can edit or view this draft.' : error?.message || 'The protected Contract Draft could not be loaded.'}</p><p><Link className="button" href="/contracts">Back to Contracts</Link></p></section>;
}

export function ProjectDetailsPage({ contractId }: { contractId: string }) {
  const { status, auth, profile } = useSignedInAuth();
  const router = useRouter();
  const [draft, setDraft] = useState<EditableContractDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [issues, setIssues] = useState<DraftIssue[]>([]);

  const loadDraft = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<DraftPayload>(`/api/contracts/${encodeURIComponent(contractId)}`, {}, auth);
      setDraft(editableDraftFromContract(response.contract, profile?.email ?? ''));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError : new Error('The protected Contract Draft could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [auth, contractId, profile?.email]);

  useEffect(() => {
    if (status === 'ready') void loadDraft();
  }, [loadDraft, status]);

  function updateScope(field: keyof EditableContractDraft['scope'], value: string | string[]) {
    setDraft(current => current ? { ...current, scope: { ...current.scope, [field]: value } } : current);
    setIssues([]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !auth || saving) return;
    setSaving(true);
    setError(null);
    setIssues([]);
    try {
      const response = await apiRequest<DraftPayload>(`/api/contracts/${encodeURIComponent(contractId)}`, { method: 'PUT', body: JSON.stringify(draft) }, auth);
      setDraft(editableDraftFromContract(response.contract, profile?.email ?? ''));
      router.push(`/contracts/${encodeURIComponent(contractId)}/review-terms`);
    } catch (requestError) {
      const apiError = requestError as ApiError;
      setError(apiError);
      setIssues(apiError.issues ?? []);
      setSaving(false);
    }
  }

  if (status === 'loading' || loading) return <LoadingDraft />;
  if (error && !draft) return <DraftUnavailable error={error} />;
  if (!draft) return <DraftUnavailable error={new Error('The protected Contract Draft could not be loaded.')} />;

  const counterparty = draft.parties.counterparty_email || 'Counterparty to be confirmed';
  return <section className="contract-authoring-flow draft-editor app-panel" aria-labelledby="project-details-title">
    <DraftStepper current="Project details" />
    <div className="draft-heading"><div><p className="eyebrow">Step 2 of 4 · Project details</p><h1 id="project-details-title">Give the work a clear shape.</h1><p className="page-intro">Save the scope before reviewing responsibilities, payment, evidence, and the exact terms the other Contract Party will see.</p></div><span className="draft-status">Private draft</span></div>
    <dl className="draft-context"><div><dt>Counterparty</dt><dd>{counterparty}</dd></div><div><dt>Access</dt><dd>Only Contract Parties</dd></div><div><dt>Authority</dt><dd>{draft.authorityId ? 'Selected registry authority' : 'Choose an authority'}</dd></div></dl>
    {error && <div className="notice draft-error" role="alert"><strong>Project details could not be saved.</strong><span>{error.message}</span><DraftIssues issues={issues} /></div>}
    <form className="draft-form" onSubmit={submit}>
      <fieldset className="draft-card">
        <legend>Project scope</legend>
        <p className="muted">Describe the outcome both Contract Parties can recognise, including what is and is not included.</p>
        <label htmlFor="project-title">Project title<input id="project-title" value={draft.scope.title} onChange={event => updateScope('title', event.target.value)} maxLength={160} required /></label>
        <label htmlFor="project-description">What is the work?<textarea id="project-description" value={draft.scope.description} onChange={event => updateScope('description', event.target.value)} rows={4} maxLength={4000} required /></label>
        <label htmlFor="project-outcome">What does done look like?<textarea id="project-outcome" value={draft.scope.outcome} onChange={event => updateScope('outcome', event.target.value)} rows={3} maxLength={1000} required /></label>
        <label htmlFor="project-start">Project start<input id="project-start" type="datetime-local" value={localDateTimeValue(draft.scope.projectStartDateUtc)} onChange={event => updateScope('projectStartDateUtc', utcFromLocalDateTime(event.target.value))} required /></label>
        <div className="draft-two-column"><label htmlFor="included-deliverables">Included deliverables<textarea id="included-deliverables" value={listToLines(draft.scope.includedDeliverables)} onChange={event => updateScope('includedDeliverables', linesToList(event.target.value))} rows={4} required /></label><label htmlFor="excluded-work">Excluded work<textarea id="excluded-work" value={listToLines(draft.scope.excludedWork)} onChange={event => updateScope('excludedWork', linesToList(event.target.value))} rows={4} required /></label></div>
        <label htmlFor="client-dependencies">Client dependencies <span className="muted">(one per line)</span><textarea id="client-dependencies" value={listToLines(draft.scope.clientDependencies)} onChange={event => updateScope('clientDependencies', linesToList(event.target.value))} rows={3} /></label>
      </fieldset>
      <div className="draft-actions action-row"><Link className="button" href={`/contracts/${encodeURIComponent(contractId)}/choose-person`}>Back to Person</Link><button className="primary" type="submit" disabled={saving}>{saving ? 'Saving Project details...' : 'Save and review terms'}</button></div>
    </form>
  </section>;
}

// Kept as a compatibility export for the prior typed handoff route and its tests.
export const ProjectDetailsHandoffPage = ProjectDetailsPage;
