import './app-shell.js';
import { authenticatedRequest } from './supabase-auth.js';

const form = document.querySelector('#contract-draft-form');
const milestoneList = document.querySelector('#milestone-list');
const status = document.querySelector('#contract-form-status');
const error = document.querySelector('#request-error');
const contractId = decodeURIComponent(window.location.pathname.split('/').at(-1));
const reviewPanel = document.querySelector('#contract-review');
const copilotPanel = document.querySelector('#contract-copilot');
const copilotForm = document.querySelector('#contract-copilot-form');
const copilotStatus = document.querySelector('#contract-copilot-status');

function localDateTime(utc) {
  if (!utc) return '';
  const date = new Date(utc);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
function canonicalUtc(local) { return local ? new Date(local).toISOString() : ''; }
function lines(value) { return String(value ?? '').split('\n').map(item => item.trim()).filter(Boolean); }
function lineText(value) { return Array.isArray(value) ? value.join('\n') : ''; }
function escapeHtml(value = '') { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }
function escapeAttribute(value = '') { return escapeHtml(value).replaceAll('"', '&quot;'); }
function newMilestone() { return { title: '', deliveryOutcome: '', allocation: '', evidenceRequirement: '', deliveryDeadlineUtc: '', reviewWindowHours: 72 }; }
function milestoneFields(milestone, index, canRemove) {
  const item = document.createElement('fieldset');
  item.className = 'milestone-card';
  item.innerHTML = `<legend>Milestone ${index + 1}</legend><label>Deliverable<input name="milestone-title" maxlength="160" required value="${escapeAttribute(milestone.title)}" /></label><label>Measurable delivery outcome<textarea name="milestone-outcome" maxlength="1000" rows="2" required>${escapeHtml(milestone.deliveryOutcome)}</textarea></label><label>Gross allocation<input name="milestone-allocation" type="number" min="1" step="1" required value="${escapeAttribute(milestone.allocation)}" /></label><label>Evidence requirement<textarea name="milestone-evidence" maxlength="4000" rows="2" required>${escapeHtml(milestone.evidenceRequirement)}</textarea></label><label>Delivery deadline (your local time)<input name="milestone-deadline" type="datetime-local" required value="${localDateTime(milestone.deliveryDeadlineUtc)}" /></label><label>Review window<select name="milestone-review-window" required><option value="24" ${Number(milestone.reviewWindowHours) === 24 ? 'selected' : ''}>24 hours</option><option value="72" ${Number(milestone.reviewWindowHours) === 72 ? 'selected' : ''}>72 hours</option><option value="168" ${Number(milestone.reviewWindowHours) === 168 ? 'selected' : ''}>168 hours</option></select></label>${canRemove ? '<button class="home-secondary-action contract-inline-action remove-milestone" type="button">Remove milestone</button>' : ''}`;
  return item;
}
function milestonesFromForm({ preserveLocalDeadline = false } = {}) {
  return [...milestoneList.querySelectorAll('.milestone-card')].map(card => ({
    title: card.querySelector('[name="milestone-title"]').value,
    deliveryOutcome: card.querySelector('[name="milestone-outcome"]').value,
    allocation: Number(card.querySelector('[name="milestone-allocation"]').value),
    evidenceRequirement: card.querySelector('[name="milestone-evidence"]').value,
    deliveryDeadlineUtc: preserveLocalDeadline ? card.querySelector('[name="milestone-deadline"]').value : canonicalUtc(card.querySelector('[name="milestone-deadline"]').value),
    reviewWindowHours: Number(card.querySelector('[name="milestone-review-window"]').value)
  }));
}
function renderMilestones(milestones) {
  milestoneList.replaceChildren(...milestones.map((milestone, index) => milestoneFields(milestone, index, milestones.length > 2)));
  milestoneList.querySelectorAll('.remove-milestone').forEach((button, index) => {
    button.onclick = () => renderMilestones(milestonesFromForm({ preserveLocalDeadline: true }).filter((_, milestoneIndex) => milestoneIndex !== index));
  });
  document.querySelector('#add-milestone').hidden = milestones.length >= 3;
}
function draftFromForm() {
  return {
    authorityId: form.elements.authorityId.value,
    parties: {
      buyer: { partyRef: form.elements.buyerPartyRef.value, responsibility: form.elements.buyerResponsibility.value },
      serviceProvider: { partyRef: form.elements.serviceProviderPartyRef.value, responsibility: form.elements.serviceProviderResponsibility.value }
    },
    scope: {
      title: form.elements.title.value,
      description: form.elements.description.value,
      outcome: form.elements.outcome.value,
      includedDeliverables: lines(form.elements.includedDeliverables.value),
      excludedWork: lines(form.elements.excludedWork.value),
      projectStartDateUtc: canonicalUtc(form.elements.projectStartDateUtc.value),
      clientDependencies: lines(form.elements.clientDependencies.value)
    },
    milestones: milestonesFromForm(),
    payment: {
      settlementToken: form.elements.settlementToken.value,
      network: form.elements.network.value,
      totalAllocation: Number(form.elements.totalAllocation.value),
      fundingDeadlineUtc: canonicalUtc(form.elements.fundingDeadlineUtc.value),
      fundingWindowHours: 48,
      successFeeBps: Number(form.elements.successFeeBps.value),
      feeRecipient: form.elements.feeRecipient.value
    },
    evidence: { reviewDecision: form.elements.reviewDecision.value, dependencyAcknowledgementRequired: form.elements.dependencyAcknowledgementRequired.checked },
    intellectualProperty: { outcome: form.elements.ipOutcome.value, licenseScope: form.elements.licenseScope.value, confidentiality: form.elements.confidentiality.value, confidentialityDuration: form.elements.confidentialityDuration.value },
    changeControl: { proposalProcess: form.elements.proposalProcess.value, bilateralAmendmentOnly: form.elements.bilateralAmendmentOnly.checked },
    notices: { buyerContact: form.elements.buyerContact.value, serviceProviderContact: form.elements.serviceProviderContact.value, exactVersionAcknowledgement: form.elements.exactVersionAcknowledgement.checked }
  };
}
function value(section, key, fallback = '') { return section?.[key] ?? fallback; }
function renderDraft(contract) {
  const sections = contract.sections ?? {};
  const parties = sections.parties ?? {};
  const scope = sections.scope ?? {};
  const payment = sections.payment ?? {};
  const evidence = sections.evidence ?? {};
  const intellectualProperty = sections.intellectualProperty ?? {};
  const changeControl = sections.changeControl ?? {};
  const notices = sections.notices ?? {};
  document.title = `${scope.title || 'Contract draft'} — PactFlow`;
  document.querySelector('#contract-title').textContent = scope.title || 'Contract draft';
  document.querySelector('#contract-summary').textContent = `Version ${contract.versionNumber} · ${contract.status.replaceAll('_', ' ')} · Only Contract Parties can view or edit this Contract Draft.`;
  form.elements.buyerPartyRef.value = value(parties.buyer, 'partyRef', 'initiating_party');
  form.elements.buyerResponsibility.value = value(parties.buyer, 'responsibility');
  form.elements.serviceProviderPartyRef.value = value(parties.serviceProvider, 'partyRef', 'counterparty');
  form.elements.serviceProviderResponsibility.value = value(parties.serviceProvider, 'responsibility');
  form.elements.title.value = value(scope, 'title');
  form.elements.description.value = value(scope, 'description');
  form.elements.outcome.value = value(scope, 'outcome');
  form.elements.includedDeliverables.value = lineText(scope.includedDeliverables);
  form.elements.excludedWork.value = lineText(scope.excludedWork);
  form.elements.projectStartDateUtc.value = localDateTime(value(scope, 'projectStartDateUtc'));
  form.elements.clientDependencies.value = lineText(scope.clientDependencies);
  form.elements.settlementToken.value = value(payment, 'settlementToken', 'eUSD testnet demonstration token');
  form.elements.totalAllocation.value = value(payment, 'totalAllocation');
  form.elements.fundingDeadlineUtc.value = localDateTime(value(payment, 'fundingDeadlineUtc'));
  form.elements.successFeeBps.value = value(payment, 'successFeeBps', 0);
  form.elements.feeRecipient.value = value(payment, 'feeRecipient');
  form.elements.reviewDecision.value = value(evidence, 'reviewDecision');
  form.elements.dependencyAcknowledgementRequired.checked = Boolean(value(evidence, 'dependencyAcknowledgementRequired'));
  form.elements.ipOutcome.value = value(intellectualProperty, 'outcome', 'client_owns_project_deliverables_on_final_settlement');
  form.elements.licenseScope.value = value(intellectualProperty, 'licenseScope');
  form.elements.confidentiality.value = value(intellectualProperty, 'confidentiality', 'not_requested');
  form.elements.confidentialityDuration.value = value(intellectualProperty, 'confidentialityDuration');
  form.elements.proposalProcess.value = value(changeControl, 'proposalProcess');
  form.elements.bilateralAmendmentOnly.checked = Boolean(value(changeControl, 'bilateralAmendmentOnly'));
  form.elements.buyerContact.value = value(notices, 'buyerContact');
  form.elements.serviceProviderContact.value = value(notices, 'serviceProviderContact');
  form.elements.exactVersionAcknowledgement.checked = Boolean(value(notices, 'exactVersionAcknowledgement'));
  const authoritySelect = form.elements.authorityId;
  authoritySelect.replaceChildren(...(contract.authorities ?? []).map(authority => {
    const option = document.createElement('option');
    option.value = authority.id;
    option.textContent = `${authority.name} · ${authority.jurisdictionLabel} · ${authority.rulesetVersion}`;
    return option;
  }));
  authoritySelect.value = contract.authority.id;
  document.querySelector('#authority-summary').textContent = 'The selected Resolution Authority is bound into the new immutable Version when validation succeeds.';
  renderMilestones(sections.milestones?.length ? sections.milestones : [newMilestone(), newMilestone()]);
  copilotPanel.hidden = false;
  form.hidden = false;
}
function applyCopilotSuggestion(suggestion) {
  const { scope, evidence } = suggestion;
  form.elements.title.value = scope.title;
  form.elements.description.value = scope.description;
  form.elements.outcome.value = scope.outcome;
  form.elements.includedDeliverables.value = lineText(scope.includedDeliverables);
  form.elements.excludedWork.value = lineText(scope.excludedWork);
  form.elements.projectStartDateUtc.value = localDateTime(scope.projectStartDateUtc);
  form.elements.clientDependencies.value = lineText(scope.clientDependencies);
  form.elements.reviewDecision.value = evidence.reviewDecision;
  form.elements.dependencyAcknowledgementRequired.checked = Boolean(evidence.dependencyAcknowledgementRequired);
  renderMilestones(suggestion.milestones);
}
function reviewLine(label, reviewValue) { const line = document.createElement('p'); const strong = document.createElement('strong'); strong.textContent = `${label}: `; line.append(strong, reviewValue); return line; }
function reviewSection(title, lines) { const section = document.createElement('article'); section.className = 'contract-review-section'; const heading = document.createElement('h3'); heading.textContent = title; section.append(heading, ...lines); return section; }
function reviewLabel(key) { return key.replaceAll('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, letter => letter.toUpperCase()); }
function reviewValue(value) { if (Array.isArray(value)) return value.map(reviewValue).join(', '); if (value && typeof value === 'object') return Object.entries(value).map(([key, item]) => `${reviewLabel(key)}: ${reviewValue(item)}`).join('; '); return String(value ?? 'Not provided'); }
function renderReview(review) {
  const { version } = review;
  reviewPanel.hidden = false;
  document.querySelector('#contract-version-number').textContent = `Version ${version.number}`;
  document.querySelector('#contract-review-summary').textContent = 'This is a read-only record of the latest immutable Version. Contract Acceptance applies only to this Version and does not move funds.';
  document.querySelector('#contract-version-hash').textContent = `Version hash: ${version.hash}`;
  const sections = new Map(version.sections.map(section => [section.type, section.terms]));
  const sectionLabels = { parties: 'Parties', scope: 'Engagement scope', milestones: 'Milestone schedule', payment: 'Payment and authority', evidence: 'Evidence and review', intellectual_property: 'Intellectual property and confidentiality', change_control: 'Change control', dispute_resolution: 'Dispute resolution', notices: 'Notices and version acknowledgement' };
  const rendered = [...review.requiredSections].map(section => {
    const terms = sections.get(section.type);
    return reviewSection(sectionLabels[section.type], section.complete ? Object.entries(terms).map(([key, item]) => reviewLine(reviewLabel(key), reviewValue(item))) : [reviewLine('Status', 'Missing — this Version cannot be accepted yet')]);
  });
  document.querySelector('#contract-review-sections').replaceChildren(...rendered);
  const acceptanceLines = review.parties.map(party => `${party.label}: ${party.acceptedAt ? `Wallet signature recorded${party.walletAddress ? ` (${party.walletAddress.slice(0, 8)}â€¦${party.walletAddress.slice(-4)})` : ''}` : 'Contract Acceptance required'}`);
  document.querySelector('#contract-acceptance-status').textContent = `${acceptanceLines.join(' · ')}. A later correction creates a new Version and does not carry these Acceptances forward.`;
  const accept = document.querySelector('#accept-contract-version');
  accept.dataset.versionId = version.id;
  accept.disabled = !review.canAccept;
  if (!review.canAccept) document.querySelector('#contract-review-status').textContent = 'This Version needs every required template section, share validation, and exactly two Contract Parties before it can be accepted.';
}
function clearValidationIssues() {
  form.querySelectorAll('.contract-validation-error').forEach(item => item.remove());
  form.querySelectorAll('[aria-invalid="true"]').forEach(control => { control.removeAttribute('aria-invalid'); control.removeAttribute('aria-describedby'); });
}
function controlForIssue(issue) {
  const directNames = {
    'parties.buyer.partyRef': 'buyerPartyRef', 'parties.buyer.responsibility': 'buyerResponsibility',
    'parties.serviceProvider.partyRef': 'serviceProviderPartyRef', 'parties.serviceProvider.responsibility': 'serviceProviderResponsibility',
    'scope.title': 'title', 'scope.description': 'description', 'scope.outcome': 'outcome', 'scope.includedDeliverables': 'includedDeliverables', 'scope.excludedWork': 'excludedWork', 'scope.projectStartDateUtc': 'projectStartDateUtc', 'scope.clientDependencies': 'clientDependencies',
    'payment.settlementToken': 'settlementToken', 'payment.network': 'network', 'payment.totalAllocation': 'totalAllocation', 'payment.fundingDeadlineUtc': 'fundingDeadlineUtc', 'payment.successFeeBps': 'successFeeBps', 'payment.feeRecipient': 'feeRecipient',
    'evidence.reviewDecision': 'reviewDecision', 'intellectual_property.outcome': 'ipOutcome', 'intellectual_property.licenseScope': 'licenseScope', 'intellectual_property.confidentiality': 'confidentiality', 'intellectual_property.confidentialityDuration': 'confidentialityDuration',
    'change_control.proposalProcess': 'proposalProcess', 'change_control.bilateralAmendmentOnly': 'bilateralAmendmentOnly', 'notices.buyerContact': 'buyerContact', 'notices.serviceProviderContact': 'serviceProviderContact', 'notices.exactVersionAcknowledgement': 'exactVersionAcknowledgement'
  };
  if (issue.sectionType === 'milestones') {
    const [index, key] = String(issue.fieldPath).split('.');
    const names = { title: 'milestone-title', deliveryOutcome: 'milestone-outcome', allocation: 'milestone-allocation', evidenceRequirement: 'milestone-evidence', deliveryDeadlineUtc: 'milestone-deadline', reviewWindowHours: 'milestone-review-window' };
    return milestoneList.querySelectorAll('.milestone-card')[Number(index)]?.querySelector(`[name="${names[key]}"]`) ?? milestoneList;
  }
  return form.elements[directNames[`${issue.sectionType}.${issue.fieldPath}`]] ?? form.querySelector('button[type="submit"]');
}
function showValidationIssues(issues = []) {
  clearValidationIssues();
  status.replaceChildren();
  issues.forEach((issue, index) => {
    const control = controlForIssue(issue);
    const id = `validation-${index}`;
    control.id ||= `contract-field-${issue.sectionType}-${issue.fieldPath || index}`.replaceAll('.', '-');
    control.setAttribute('aria-invalid', 'true');
    const message = document.createElement('p');
    message.id = id;
    message.className = 'home-error contract-validation-error';
    message.textContent = issue.message;
    control.insertAdjacentElement('afterend', message);
    control.setAttribute('aria-describedby', id);
    const summary = document.createElement('a');
    summary.href = `#${control.id}`;
    summary.textContent = `${issue.sectionType}: ${issue.message}`;
    status.append(summary, document.createTextNode(' '));
  });
}
document.querySelector('#add-milestone').onclick = () => renderMilestones([...milestonesFromForm({ preserveLocalDeadline: true }), newMilestone()]);
copilotForm.addEventListener('submit', async event => {
  event.preventDefault();
  const submit = copilotForm.querySelector('[type="submit"]');
  submit.disabled = true;
  copilotStatus.textContent = 'Preparing editable suggestions…';
  try {
    const response = await authenticatedRequest(`/api/contracts/${encodeURIComponent(contractId)}/copilot-suggestions`, { method: 'POST', body: JSON.stringify({ brief: copilotForm.elements.brief.value }) });
    applyCopilotSuggestion(response.suggestion);
    copilotStatus.textContent = `${response.suggestion.notice} Review and edit every field, then validate and share the Version when it is ready.`;
    status.textContent = 'Editable suggestions applied. They are not saved or shared until you validate the Contract Version.';
  } catch (requestError) { copilotStatus.textContent = requestError.message; } finally { submit.disabled = false; }
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  clearValidationIssues();
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  status.textContent = 'Validating and saving your Contract Version…';
  try {
    const response = await authenticatedRequest(`/api/contracts/${encodeURIComponent(contractId)}`, { method: 'PUT', body: JSON.stringify(draftFromForm()) });
    renderDraft(response.contract);
    status.textContent = 'Validated Version shared with its Contract Parties. It has no payment authority.';
  } catch (requestError) { showValidationIssues(requestError.issues); if (!status.textContent) status.textContent = requestError.message; } finally { submit.disabled = false; }
});
document.querySelector('#accept-contract-version').onclick = async event => {
  const accept = event.currentTarget; accept.disabled = true;
  document.querySelector('#contract-review-status').textContent = 'Recording your Contract Acceptance for this exact Version…';
  try {
    const versionHash = document.querySelector('#contract-version-hash').textContent.replace('Version hash: ', '');
    document.querySelector('#contract-review-status').textContent = 'Requesting your Base Sepolia wallet signature for this exact Version.';
    const { signContractAcceptance } = await import('./contract-wallet.js');
    const walletAcceptance = await signContractAcceptance({ contractId, versionId: accept.dataset.versionId, versionHash });
    const response = await authenticatedRequest(`/api/contracts/${encodeURIComponent(contractId)}/versions/${encodeURIComponent(accept.dataset.versionId)}/acceptances`, { method: 'POST', body: JSON.stringify(walletAcceptance) });
    renderReview(response.review);
    document.querySelector('#contract-review-status').textContent = 'Your wallet signature was recorded for this exact Contract Version. It does not fund or settle the Contract.';
  }
  catch (requestError) { document.querySelector('#contract-review-status').textContent = requestError.message; } finally { accept.disabled = false; }
};
(async () => {
  try {
    const draftResponse = await authenticatedRequest(`/api/contracts/${encodeURIComponent(contractId)}`);
    renderDraft(draftResponse.contract);
    try {
      const reviewResponse = await authenticatedRequest(`/api/contracts/${encodeURIComponent(contractId)}/review`);
      renderReview(reviewResponse.review);
    } catch (reviewError) {
      if (draftResponse.contract.status !== 'private_draft') throw reviewError;
      // A private one-party Contract Draft remains editable before its review context is available.
    }
  }
  catch (requestError) { error.hidden = false; error.textContent = requestError.message; }
})();
