import { authenticatedRequest, supabase } from './supabase-auth.js';

const form = document.querySelector('#contract-draft-form');
const milestoneList = document.querySelector('#milestone-list');
const status = document.querySelector('#contract-form-status');
const error = document.querySelector('#request-error');
const contractId = decodeURIComponent(window.location.pathname.split('/').at(-1));
const reviewPanel = document.querySelector('#contract-review');

function localDateTime(utc) {
  if (!utc) return '';
  const date = new Date(utc);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
function newMilestone() {
  return { title: '', allocation: '', evidenceRequirement: '', deliveryDeadlineUtc: '', reviewWindowHours: 48 };
}
function milestoneFields(milestone, index, canRemove) {
  const item = document.createElement('fieldset');
  item.className = 'milestone-card';
  item.innerHTML = `<legend>Milestone ${index + 1}</legend><label>Deliverable<input name="milestone-title" maxlength="160" required value="${escapeAttribute(milestone.title)}" /></label><label>Allocation<input name="milestone-allocation" type="number" min="1" step="1" required value="${escapeAttribute(milestone.allocation)}" /></label><label>Evidence requirement<textarea name="milestone-evidence" maxlength="4000" rows="2" required>${escapeHtml(milestone.evidenceRequirement)}</textarea></label><label>Delivery deadline (your local time)<input name="milestone-deadline" type="datetime-local" required value="${localDateTime(milestone.deliveryDeadlineUtc)}" /></label><label>Review window (hours)<input name="milestone-review-window" type="number" min="1" max="720" step="1" required value="${escapeAttribute(milestone.reviewWindowHours)}" /></label>${canRemove ? '<button class="home-secondary-action contract-inline-action remove-milestone" type="button">Remove milestone</button>' : ''}`;
  return item;
}
function escapeHtml(value = '') { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }
function escapeAttribute(value = '') { return escapeHtml(value).replaceAll('"', '&quot;'); }
function renderMilestones(milestones) {
  milestoneList.replaceChildren(...milestones.map((milestone, index) => milestoneFields(milestone, index, milestones.length > 2)));
  milestoneList.querySelectorAll('.remove-milestone').forEach((button, index) => {
    button.onclick = () => renderMilestones(milestonesFromForm({ preserveLocalDeadline: true }).filter((_, milestoneIndex) => milestoneIndex !== index));
  });
  document.querySelector('#add-milestone').hidden = milestones.length >= 3;
}
function milestonesFromForm({ preserveLocalDeadline = false } = {}) {
  return [...milestoneList.querySelectorAll('.milestone-card')].map(card => ({
      title: card.querySelector('[name="milestone-title"]').value,
      allocation: Number(card.querySelector('[name="milestone-allocation"]').value),
      evidenceRequirement: card.querySelector('[name="milestone-evidence"]').value,
      deliveryDeadlineUtc: preserveLocalDeadline ? card.querySelector('[name="milestone-deadline"]').value : new Date(card.querySelector('[name="milestone-deadline"]').value).toISOString(),
      reviewWindowHours: Number(card.querySelector('[name="milestone-review-window"]').value)
    }));
}
function draftFromForm() {
  return {
    scope: { title: form.elements.title.value, description: form.elements.description.value },
    totalAllocation: Number(form.elements.totalAllocation.value),
    successFeeBps: Number(form.elements.successFeeBps.value),
    authorityId: form.elements.authorityId.value,
    milestones: milestonesFromForm()
  };
}
function renderDraft(contract) {
  document.title = `${contract.scope.title || 'Contract draft'} — PactFlow`;
  document.querySelector('#contract-title').textContent = contract.scope.title || 'Contract draft';
  document.querySelector('#contract-summary').textContent = `Version ${contract.versionNumber} · ${contract.status.replaceAll('_', ' ')} · Only Contract Parties can view or edit this private draft.`;
  form.elements.title.value = contract.scope.title;
  form.elements.description.value = contract.scope.description;
  form.elements.totalAllocation.value = contract.totalAllocation || '';
  form.elements.successFeeBps.value = contract.successFeeBps;
  const authoritySelect = form.elements.authorityId;
  authoritySelect.replaceChildren(...(contract.authorities ?? []).map(authority => {
    const option = document.createElement('option');
    option.value = authority.id;
    option.textContent = `${authority.name} · ${authority.jurisdictionLabel} · ${authority.rulesetVersion}`;
    return option;
  }));
  authoritySelect.value = contract.authority.id;
  document.querySelector('#authority-summary').textContent = 'The selected Resolution Authority is bound into the new Contract Version when you save.';
  renderMilestones(contract.milestones.length ? contract.milestones : [newMilestone(), newMilestone()]);
  form.hidden = false;
}
function reviewLine(label, value) {
  const line = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = `${label}: `;
  line.append(strong, value);
  return line;
}
function reviewSection(title, lines) {
  const section = document.createElement('article');
  section.className = 'contract-review-section';
  const heading = document.createElement('h3');
  heading.textContent = title;
  section.append(heading, ...lines);
  return section;
}
function reviewLabel(key) { return key.replaceAll('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, letter => letter.toUpperCase()); }
function reviewValue(value) {
  if (Array.isArray(value)) return value.map(reviewValue).join(', ');
  if (value && typeof value === 'object') return Object.entries(value).map(([key, item]) => `${reviewLabel(key)}: ${reviewValue(item)}`).join('; ');
  return String(value ?? 'Not provided');
}
function renderReview(review) {
  const { version } = review;
  reviewPanel.hidden = false;
  document.querySelector('#contract-version-number').textContent = `Version ${version.number}`;
  document.querySelector('#contract-review-summary').textContent = 'This is a read-only record of the latest immutable Version. Contract Acceptance applies only to this Version and does not move funds.';
  document.querySelector('#contract-version-hash').textContent = `Version hash: ${version.hash}`;
  const sections = new Map(version.sections.map(section => [section.type, section.terms]));
  const scope = sections.get('scope') ?? {};
  const milestones = sections.get('milestones')?.items ?? [];
  const payment = sections.get('payment') ?? {};
  const authority = version.authority ?? {};
  const sectionLabels = { parties: 'Parties', scope: 'Engagement scope', milestones: 'Milestone schedule', payment: 'Payment and authority', evidence: 'Evidence and review', intellectual_property: 'Intellectual property and confidentiality', change_control: 'Change control', dispute_resolution: 'Dispute resolution', notices: 'Notices and version acknowledgement' };
  const rendered = [
    reviewSection('Engagement scope', [reviewLine(scope.title || 'Scope', scope.description || 'Not provided')]),
    reviewSection('Milestone schedule', milestones.map((milestone, index) => reviewLine(`Milestone ${index + 1}`, `${milestone.title} · ${milestone.allocation} testnet eUSD units · evidence: ${milestone.evidenceRequirement} · deadline ${milestone.deliveryDeadlineUtc} · ${milestone.reviewWindowHours}-hour review`))),
    reviewSection('Payment and authority', [
      reviewLine('Total allocation', `${payment.total_allocation ?? payment.totalAllocation ?? 'Not provided'} testnet eUSD units`),
      reviewLine('Network and token', payment.settlement_token ?? payment.settlementToken ?? 'Not provided'),
      reviewLine('Funding deadline', payment.funding_deadline_utc ?? payment.fundingDeadlineUtc ?? 'Not provided'),
      reviewLine('Fee recipient', payment.fee_recipient ?? payment.feeRecipient ?? 'Not provided'),
      reviewLine('Success fee', `${payment.success_fee_bps ?? payment.successFeeBps ?? 'Not provided'} basis points`),
      reviewLine('Resolution Authority', `${authority.authority_name ?? 'Not provided'} · ${authority.jurisdiction_label ?? ''} · ${authority.ruleset_version ?? ''}`),
      reviewLine('Payment authority', review.paymentAuthority)
    ]),
    reviewSection('Change control', [reviewLine('Rule', sections.get('change_control')?.rule ?? 'Not provided')]),
    ...review.requiredSections.filter(section => !['scope', 'milestones', 'payment', 'change_control'].includes(section.type)).map(section => {
      const terms = sections.get(section.type);
      return reviewSection(sectionLabels[section.type], section.complete
        ? Object.entries(terms).map(([key, value]) => reviewLine(reviewLabel(key), reviewValue(value)))
        : [reviewLine('Status', 'Missing — this Version cannot be accepted yet')]);
    })
  ];
  document.querySelector('#contract-review-sections').replaceChildren(...rendered);
  const acceptanceLines = review.parties.map(party => `${party.label}: ${party.acceptedAt ? 'Contract Acceptance recorded' : 'Contract Acceptance required'}`);
  document.querySelector('#contract-acceptance-status').textContent = `${acceptanceLines.join(' · ')}. A later correction creates a new Version and does not carry these Acceptances forward.`;
  const accept = document.querySelector('#accept-contract-version');
  accept.dataset.versionId = version.id;
  accept.disabled = !review.canAccept;
  if (!review.canAccept) document.querySelector('#contract-review-status').textContent = 'This Version needs every required template section and exactly two Contract Parties before it can be accepted.';
}

document.querySelector('#add-milestone').onclick = () => {
  renderMilestones([...milestonesFromForm({ preserveLocalDeadline: true }), newMilestone()]);
};
form.addEventListener('submit', async event => {
  event.preventDefault();
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  status.textContent = 'Saving your private Contract draft…';
  try {
    const response = await authenticatedRequest(`/api/contracts/${encodeURIComponent(contractId)}`, { method: 'PUT', body: JSON.stringify(draftFromForm()) });
    renderDraft(response.contract);
    status.textContent = 'Private draft saved. It still has no payment authority.';
  } catch (requestError) { status.textContent = requestError.message; } finally { submit.disabled = false; }
});
document.querySelector('#sign-out').onclick = async () => { await (await supabase()).auth.signOut(); window.location.assign('/'); };
document.querySelector('#accept-contract-version').onclick = async event => {
  const accept = event.currentTarget;
  accept.disabled = true;
  document.querySelector('#contract-review-status').textContent = 'Recording your Contract Acceptance for this exact Version…';
  try {
    const response = await authenticatedRequest(`/api/contracts/${encodeURIComponent(contractId)}/versions/${encodeURIComponent(accept.dataset.versionId)}/acceptances`, { method: 'POST' });
    renderReview(response.review);
    document.querySelector('#contract-review-status').textContent = 'Contract Acceptance recorded. Wallet signatures and payment authority are not configured.';
  } catch (requestError) { document.querySelector('#contract-review-status').textContent = requestError.message; } finally { accept.disabled = false; }
};
(async () => {
  try {
    const [draftResponse, reviewResponse] = await Promise.all([
      authenticatedRequest(`/api/contracts/${encodeURIComponent(contractId)}`),
      authenticatedRequest(`/api/contracts/${encodeURIComponent(contractId)}/review`)
    ]);
    renderDraft(draftResponse.contract);
    renderReview(reviewResponse.review);
  }
  catch (requestError) { error.hidden = false; error.textContent = requestError.message; window.setTimeout(() => window.location.assign('/contracts'), 1_200); }
})();
