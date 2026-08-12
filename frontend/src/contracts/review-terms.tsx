'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { apiRequest, ApiError } from '../auth/client';
import { useSignedInAuth } from '../signed-in/app-shell';
import { DraftIssues, DraftStepper } from './draft-components';
import {
  editableDraftFromContract,
  linesToList,
  listToLines,
  localDateTimeValue,
  utcFromLocalDateTime,
  type AcceptanceCriterion,
  type ContractDraftResponse,
  type DraftIssue,
  type DraftMilestone,
  type EditableContractDraft,
  type PartyReference
} from './draft-model';

type DraftPayload = { contract: ContractDraftResponse };
type AuthorityOption = { id: string; name: string; jurisdictionLabel: string; rulesetVersion: string };

function LoadingReview() {
  return <section className="app-panel" aria-busy="true"><p className="eyebrow">Step 3 of 4 · Review terms</p><h1>Loading Review terms...</h1><p className="empty" role="status">Loading Milestones and payment, Required Acceptance Criterion, Evidence and change control.</p></section>;
}

function UnavailableReview({ error }: { error: ApiError | Error | null }) {
  const forbidden = error instanceof ApiError && error.status === 403;
  return <section className="app-panel" aria-labelledby="review-terms-error"><p className="eyebrow">Review terms</p><h1 id="review-terms-error">{forbidden ? 'This Contract Draft is restricted.' : 'Review terms is unavailable.'}</h1><p className="page-intro" role="alert">{forbidden ? 'Only a Contract Party can view or edit this draft.' : error?.message || 'The protected Contract Draft could not be loaded.'}</p><p><Link className="button" href="/contracts">Back to Contracts</Link></p></section>;
}

function fieldValue(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): string {
  return event.target.value;
}

export function ReviewTermsPage({ contractId }: { contractId: string }) {
  const { status, auth, profile } = useSignedInAuth();
  const [draft, setDraft] = useState<EditableContractDraft | null>(null);
  const [authorities, setAuthorities] = useState<AuthorityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedVersion, setSavedVersion] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [issues, setIssues] = useState<DraftIssue[]>([]);

  const loadDraft = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<DraftPayload>(`/api/contracts/${encodeURIComponent(contractId)}`, {}, auth);
      setDraft(editableDraftFromContract(response.contract, profile?.email ?? ''));
      setAuthorities(response.contract.authorities ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError : new Error('The protected Contract Draft could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [auth, contractId, profile?.email]);

  useEffect(() => {
    if (status === 'ready') void loadDraft();
  }, [loadDraft, status]);

  function updateDraft<K extends keyof EditableContractDraft>(field: K, value: EditableContractDraft[K]) {
    setDraft(current => current ? { ...current, [field]: value } : current);
    setIssues([]);
    setSavedVersion(null);
  }

  function updateScope(field: keyof EditableContractDraft['scope'], value: string | string[]) {
    setDraft(current => current ? { ...current, scope: { ...current.scope, [field]: value } } : current);
    setIssues([]);
    setSavedVersion(null);
  }

  function updateParty(party: 'buyer' | 'serviceProvider', field: 'partyRef' | 'responsibility', value: string) {
    setDraft(current => current ? { ...current, parties: { ...current.parties, [party]: { ...current.parties[party], [field]: value } } } : current);
    setIssues([]);
    setSavedVersion(null);
  }

  function updateMilestone(index: number, field: keyof DraftMilestone, value: string | number | AcceptanceCriterion[]) {
    setDraft(current => current ? { ...current, milestones: current.milestones.map((milestone, milestoneIndex) => milestoneIndex === index ? { ...milestone, [field]: value } : milestone) } : current);
    setIssues([]);
    setSavedVersion(null);
  }

  function updateCriterion(milestoneIndex: number, criterionIndex: number, value: string) {
    const milestone = draft?.milestones[milestoneIndex];
    if (!milestone) return;
    updateMilestone(milestoneIndex, 'acceptanceCriteria', milestone.acceptanceCriteria.map((criterion, index) => index === criterionIndex ? { ...criterion, description: value } : criterion));
  }

  function addMilestone() {
    if (!draft || draft.milestones.length >= 3) return;
    const last = draft.milestones[draft.milestones.length - 1];
    const deadline = new Date(last.deliveryDeadlineUtc);
    deadline.setUTCDate(deadline.getUTCDate() + 14);
    const next: DraftMilestone = {
      title: `Milestone ${draft.milestones.length + 1}`,
      deliveryOutcome: 'Deliver the agreed outcome for this stage.',
      allocation: 1,
      evidenceRequirement: 'A private delivery record without credentials or secrets.',
      acceptanceCriteria: [{ description: 'The agreed outcome for this stage is complete.', required: true }],
      deliveryDeadlineUtc: deadline.toISOString(),
      reviewWindowHours: 72
    };
    updateDraft('milestones', [...draft.milestones, next]);
  }

  function removeMilestone(index: number) {
    if (!draft || draft.milestones.length <= 2) return;
    updateDraft('milestones', draft.milestones.filter((_, milestoneIndex) => milestoneIndex !== index));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !auth || saving) return;
    setSaving(true);
    setError(null);
    setIssues([]);
    try {
      const response = await apiRequest<DraftPayload>(`/api/contracts/${encodeURIComponent(contractId)}`, { method: 'PUT', body: JSON.stringify(draft) }, auth);
      setDraft(editableDraftFromContract(response.contract, profile?.email ?? ''));
      setAuthorities(response.contract.authorities ?? authorities);
      setSavedVersion(response.contract.versionNumber);
    } catch (requestError) {
      const apiError = requestError as ApiError;
      setError(apiError);
      setIssues(apiError.issues ?? []);
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading' || loading) return <LoadingReview />;
  if (error && !draft) return <UnavailableReview error={error} />;
  if (!draft) return <UnavailableReview error={new Error('The protected Contract Draft could not be loaded.')} />;

  const allocated = draft.milestones.reduce((sum, milestone) => sum + Number(milestone.allocation || 0), 0);
  return <section className="contract-authoring-flow draft-editor app-panel" aria-labelledby="review-terms-title">
    <DraftStepper current="Review terms" />
    <div className="draft-heading"><div><p className="eyebrow">Step 3 of 4 · Review terms</p><h1 id="review-terms-title">Make every term unambiguous.</h1><p className="page-intro">This is the complete editable Contract Version. Save only when the responsibilities, schedule, evidence, and acknowledgements are ready for the next step.</p></div><span className="draft-status">Not sent</span></div>
    {savedVersion && <p className="notice draft-success" role="status">Saved Version {savedVersion}. No invitation or Contract access was created by saving.</p>}
    {error && <div className="notice draft-error" role="alert"><strong>Review terms could not be saved.</strong><span>{error.message}</span><DraftIssues issues={issues} /></div>}
    <form className="draft-form" onSubmit={save}>
      <fieldset className="draft-card"><legend>Parties and responsibilities</legend><p className="muted">A role choice describes the work. It does not grant the counterparty access; only the later invitation does that.</p><div className="draft-two-column"><label htmlFor="buyer-role">Buyer role<select id="buyer-role" value={draft.parties.buyer.partyRef} onChange={event => updateParty('buyer', 'partyRef', event.target.value as PartyReference)}><option value="initiating_party">Initiating Party</option><option value="counterparty">Counterparty</option></select></label><label htmlFor="provider-role">Service Provider role<select id="provider-role" value={draft.parties.serviceProvider.partyRef} onChange={event => updateParty('serviceProvider', 'partyRef', event.target.value as PartyReference)}><option value="initiating_party">Initiating Party</option><option value="counterparty">Counterparty</option></select></label></div><label htmlFor="buyer-responsibility">Buyer responsibility<textarea id="buyer-responsibility" value={draft.parties.buyer.responsibility} onChange={event => updateParty('buyer', 'responsibility', fieldValue(event))} rows={2} required /></label><label htmlFor="provider-responsibility">Service Provider responsibility<textarea id="provider-responsibility" value={draft.parties.serviceProvider.responsibility} onChange={event => updateParty('serviceProvider', 'responsibility', fieldValue(event))} rows={2} required /></label></fieldset>
      <fieldset className="draft-card"><legend>Project scope</legend><div className="draft-two-column"><label htmlFor="review-title">Project title<input id="review-title" value={draft.scope.title} onChange={event => updateScope('title', fieldValue(event))} maxLength={160} required /></label><label htmlFor="review-start">Project start<input id="review-start" type="datetime-local" value={localDateTimeValue(draft.scope.projectStartDateUtc)} onChange={event => updateScope('projectStartDateUtc', utcFromLocalDateTime(event.target.value))} required /></label></div><label htmlFor="review-description">Scope<textarea id="review-description" value={draft.scope.description} onChange={event => updateScope('description', fieldValue(event))} rows={3} maxLength={4000} required /></label><label htmlFor="review-outcome">Outcome<textarea id="review-outcome" value={draft.scope.outcome} onChange={event => updateScope('outcome', fieldValue(event))} rows={2} maxLength={1000} required /></label><div className="draft-two-column"><label htmlFor="review-included">Included deliverables<textarea id="review-included" value={listToLines(draft.scope.includedDeliverables)} onChange={event => updateScope('includedDeliverables', linesToList(event.target.value))} rows={3} required /></label><label htmlFor="review-excluded">Excluded work<textarea id="review-excluded" value={listToLines(draft.scope.excludedWork)} onChange={event => updateScope('excludedWork', linesToList(event.target.value))} rows={3} required /></label></div><label htmlFor="review-dependencies">Client dependencies<textarea id="review-dependencies" value={listToLines(draft.scope.clientDependencies)} onChange={event => updateScope('clientDependencies', linesToList(event.target.value))} rows={2} /></label></fieldset>
      <fieldset className="draft-card"><legend>Milestones and payment</legend><p className="muted">Each milestone needs a measurable outcome, a private-safe evidence requirement, at least one required Acceptance Criterion, a future UTC deadline, and a review window. Allocation total: <strong>{allocated}</strong> / {draft.payment.totalAllocation}.</p>{draft.milestones.map((milestone, index) => <article className="milestone-editor" key={`milestone-${index}`}><div className="milestone-editor-heading"><h2>Milestone {index + 1}</h2>{draft.milestones.length > 2 && <button type="button" className="ghost" onClick={() => removeMilestone(index)}>Remove milestone</button>}</div><div className="draft-two-column"><label htmlFor={`milestone-${index}-title`}>Title<input id={`milestone-${index}-title`} value={milestone.title} onChange={event => updateMilestone(index, 'title', fieldValue(event))} maxLength={160} required /></label><label htmlFor={`milestone-${index}-allocation`}>Allocation<input id={`milestone-${index}-allocation`} type="number" min="1" step="1" value={milestone.allocation} onChange={event => updateMilestone(index, 'allocation', Number(event.target.value))} required /></label></div><label htmlFor={`milestone-${index}-outcome`}>Delivery outcome<textarea id={`milestone-${index}-outcome`} value={milestone.deliveryOutcome} onChange={event => updateMilestone(index, 'deliveryOutcome', fieldValue(event))} rows={2} required /></label><label htmlFor={`milestone-${index}-evidence`}>Evidence requirement<textarea id={`milestone-${index}-evidence`} value={milestone.evidenceRequirement} onChange={event => updateMilestone(index, 'evidenceRequirement', fieldValue(event))} rows={2} required /><span className="muted">Keep evidence private and never include credentials or raw file URLs.</span></label><div className="draft-two-column"><label htmlFor={`milestone-${index}-deadline`}>Delivery deadline (local time, sent as UTC)<input id={`milestone-${index}-deadline`} type="datetime-local" value={localDateTimeValue(milestone.deliveryDeadlineUtc)} onChange={event => updateMilestone(index, 'deliveryDeadlineUtc', utcFromLocalDateTime(event.target.value))} required /></label><label htmlFor={`milestone-${index}-review`}>Review window<select id={`milestone-${index}-review`} value={milestone.reviewWindowHours} onChange={event => updateMilestone(index, 'reviewWindowHours', Number(event.target.value) as 24 | 72 | 168)}><option value="24">24 hours</option><option value="72">72 hours</option><option value="168">168 hours</option></select></label></div><div className="criteria-list"><h3>Required Acceptance Criterion</h3>{milestone.acceptanceCriteria.map((criterion, criterionIndex) => <label key={`criterion-${index}-${criterionIndex}`} htmlFor={`criterion-${index}-${criterionIndex}`}>Criterion {criterionIndex + 1}<input id={`criterion-${index}-${criterionIndex}`} value={criterion.description} onChange={event => updateCriterion(index, criterionIndex, event.target.value)} maxLength={500} required /></label>)}</div></article>)}{draft.milestones.length < 3 && <button type="button" className="ghost add-milestone" onClick={addMilestone}>Add a third milestone</button>}<div className="draft-two-column"><label htmlFor="settlement-token">Settlement token<input id="settlement-token" value={draft.payment.settlementToken} onChange={event => updateDraft('payment', { ...draft.payment, settlementToken: fieldValue(event) })} required /></label><label htmlFor="network">Network<select id="network" value={draft.payment.network} disabled><option>Base Sepolia</option></select></label></div><div className="draft-two-column"><label htmlFor="total-allocation">Total allocation<input id="total-allocation" type="number" min="1" step="1" value={draft.payment.totalAllocation} onChange={event => updateDraft('payment', { ...draft.payment, totalAllocation: Number(event.target.value) })} required /></label><label htmlFor="funding-deadline">Funding deadline<input id="funding-deadline" type="datetime-local" value={localDateTimeValue(draft.payment.fundingDeadlineUtc)} onChange={event => updateDraft('payment', { ...draft.payment, fundingDeadlineUtc: utcFromLocalDateTime(event.target.value) })} required /></label></div><div className="draft-two-column"><label htmlFor="success-fee">Success fee (basis points)<input id="success-fee" type="number" min="0" max="1000" step="1" value={draft.payment.successFeeBps} onChange={event => updateDraft('payment', { ...draft.payment, successFeeBps: Number(event.target.value) })} required /></label><label htmlFor="fee-recipient">Fee recipient <span className="muted">(required above 0 bps)</span><input id="fee-recipient" value={draft.payment.feeRecipient} onChange={event => updateDraft('payment', { ...draft.payment, feeRecipient: fieldValue(event) })} /></label></div></fieldset>
      <fieldset className="draft-card"><legend>Evidence and change control</legend><label htmlFor="review-decision">Review decision rule<textarea id="review-decision" value={draft.evidence.reviewDecision} onChange={event => updateDraft('evidence', { ...draft.evidence, reviewDecision: fieldValue(event) })} rows={3} required /></label><label className="checkbox-label"><input type="checkbox" checked={draft.evidence.dependencyAcknowledgementRequired} onChange={event => updateDraft('evidence', { ...draft.evidence, dependencyAcknowledgementRequired: event.target.checked })} /> Require acknowledgement of client dependencies</label><label htmlFor="change-process">Change-request process<textarea id="change-process" value={draft.changeControl.proposalProcess} onChange={event => updateDraft('changeControl', { ...draft.changeControl, proposalProcess: fieldValue(event) })} rows={3} required /></label><label className="checkbox-label"><input type="checkbox" checked={draft.changeControl.bilateralAmendmentOnly} onChange={event => updateDraft('changeControl', { ...draft.changeControl, bilateralAmendmentOnly: event.target.checked })} /> Future uncompleted milestones require a bilateral amendment</label></fieldset>
      <fieldset className="draft-card"><legend>Intellectual property, notices, and authority</legend><div className="draft-two-column"><label htmlFor="ip-outcome">Intellectual-property outcome<select id="ip-outcome" value={draft.intellectualProperty.outcome} onChange={event => updateDraft('intellectualProperty', { ...draft.intellectualProperty, outcome: event.target.value as EditableContractDraft['intellectualProperty']['outcome'] })}><option value="client_owns_project_deliverables_on_final_settlement">Client owns deliverables at final settlement</option><option value="provider_retains_ownership_with_client_license">Provider retains ownership with client license</option></select></label><label htmlFor="confidentiality">Confidentiality<select id="confidentiality" value={draft.intellectualProperty.confidentiality} onChange={event => updateDraft('intellectualProperty', { ...draft.intellectualProperty, confidentiality: event.target.value as EditableContractDraft['intellectualProperty']['confidentiality'] })}><option value="mutual_confidentiality">Mutual confidentiality</option><option value="not_requested">Not requested</option></select></label></div><label htmlFor="license-scope">License scope<input id="license-scope" value={draft.intellectualProperty.licenseScope} onChange={event => updateDraft('intellectualProperty', { ...draft.intellectualProperty, licenseScope: fieldValue(event) })} required={draft.intellectualProperty.outcome === 'provider_retains_ownership_with_client_license'} /></label><label htmlFor="confidentiality-duration">Confidentiality duration<input id="confidentiality-duration" value={draft.intellectualProperty.confidentialityDuration} onChange={event => updateDraft('intellectualProperty', { ...draft.intellectualProperty, confidentialityDuration: fieldValue(event) })} required={draft.intellectualProperty.confidentiality === 'mutual_confidentiality'} /></label><div className="draft-two-column"><label htmlFor="buyer-contact">Buyer notice email<input id="buyer-contact" type="email" value={draft.notices.buyerContact} onChange={event => updateDraft('notices', { ...draft.notices, buyerContact: fieldValue(event) })} required /></label><label htmlFor="provider-contact">Service Provider notice email<input id="provider-contact" type="email" value={draft.notices.serviceProviderContact} onChange={event => updateDraft('notices', { ...draft.notices, serviceProviderContact: fieldValue(event) })} required /></label></div><label className="checkbox-label"><input type="checkbox" checked={draft.notices.exactVersionAcknowledgement} onChange={event => updateDraft('notices', { ...draft.notices, exactVersionAcknowledgement: event.target.checked })} /> I understand acceptance applies only to this exact Contract Version</label><label htmlFor="authority">Resolution Authority<select id="authority" value={draft.authorityId} onChange={event => updateDraft('authorityId', event.target.value)} required><option value="">Choose a published authority</option>{authorities.map(authority => <option key={authority.id} value={authority.id}>{authority.name} · {authority.jurisdictionLabel} · {authority.rulesetVersion}</option>)}</select></label>{!authorities.length && <p className="notice">The published Authority Registry could not be loaded. Saving will be rejected until a valid authority is available.</p>}</fieldset>
      <div className="draft-actions action-row"><Link className="button" href={`/contracts/${encodeURIComponent(contractId)}/project-details`}>Back to Project details</Link><button className="primary" type="submit" disabled={saving}>{saving ? 'Saving exact terms...' : 'Save exact terms'}</button></div>
    </form>
  </section>;
}
