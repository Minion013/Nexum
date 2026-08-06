import { authenticatedRequest, supabase } from './supabase-auth.js';

const form = document.querySelector('#contract-draft-form');
const milestoneList = document.querySelector('#milestone-list');
const status = document.querySelector('#contract-form-status');
const error = document.querySelector('#request-error');
const contractId = decodeURIComponent(window.location.pathname.split('/').at(-1));

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
(async () => {
  try { renderDraft((await authenticatedRequest(`/api/contracts/${encodeURIComponent(contractId)}`)).contract); }
  catch (requestError) { error.hidden = false; error.textContent = requestError.message; window.setTimeout(() => window.location.assign('/contracts'), 1_200); }
})();
