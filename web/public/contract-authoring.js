import { authenticatedRequest } from './supabase-auth.js';
import { authoringRoutes, contractDraftUpdate, reviewDefaults } from './contract-authoring-flow.js';

const step = Number(document.body.dataset.authoringStep);
const form = document.querySelector('[data-authoring-form]');
const key = 'pactflow-contract-draft';
const draft = JSON.parse(sessionStorage.getItem(key) || '{}');
const existingRoute = location.pathname.match(/^\/contracts\/([^/]+)\/(choose-person|project-details|review-terms|send)$/);
const existingContractId = existingRoute ? decodeURIComponent(existingRoute[1]) : null;
const routes = existingContractId ? ['choose-person', 'project-details', 'review-terms', 'send'].map(name => `/contracts/${encodeURIComponent(existingContractId)}/${name}`) : authoringRoutes;
let existingAuthorityId = null;
const recipientEmail = () => draft.inviteEmail || draft.counterpartyEmail || '';
const save = fields => {
  Object.assign(draft, Object.fromEntries([...fields].filter(field => field.name).map(field => [field.name, field.type === 'checkbox' ? field.checked : field.value])));
  sessionStorage.setItem(key, JSON.stringify(draft));
};

for (const field of form.elements) if (field.name && draft[field.name] !== undefined) field.value = draft[field.name];

function setFormValues() {
  for (const field of form.elements) {
    if (!field.name || draft[field.name] === undefined) continue;
    if (field.type === 'checkbox') field.checked = draft[field.name] === true || draft[field.name] === 'true';
    else field.value = draft[field.name];
  }
  form.elements.includeThirdMilestone?.dispatchEvent(new Event('change'));
}

function draftFromContract(contract, initiatorEmail) {
  const { sections } = contract;
  const parties = sections.parties || {};
  const scope = sections.scope || {};
  const payment = sections.payment || {};
  const evidence = sections.evidence || {};
  const intellectualProperty = sections.intellectualProperty || {};
  const changeControl = sections.changeControl || {};
  const notices = sections.notices || {};
  const initiatorIsBuyer = parties.buyer?.partyRef === 'initiating_party' || parties.initiator_responsibility === 'buyer';
  const milestones = sections.milestones || [];
  const source = {
    initiatorEmail,
    initiatorResponsibility: initiatorIsBuyer ? 'buyer' : 'service_provider',
    name: scope.title || '', scope: scope.description || '', outcome: scope.outcome || '',
    includedDeliverables: Array.isArray(scope.includedDeliverables) ? scope.includedDeliverables.join('\n') : '',
    totalAllocation: payment.totalAllocation || '', projectStartDateUtc: localInput(scope.projectStartDateUtc), fundingDeadlineUtc: localInput(payment.fundingDeadlineUtc),
    proposalProcess: changeControl.proposalProcess || '', buyerResponsibility: parties.buyer?.responsibility || '', serviceProviderResponsibility: parties.serviceProvider?.responsibility || '',
    excludedWork: Array.isArray(scope.excludedWork) ? scope.excludedWork.join('\n') : '', clientDependencies: Array.isArray(scope.clientDependencies) ? scope.clientDependencies.join('\n') : '',
    settlementToken: payment.settlementToken || '', successFeeBps: payment.successFeeBps ?? '', feeRecipient: payment.feeRecipient || '',
    ipOutcome: intellectualProperty.outcome || '', licenseScope: intellectualProperty.licenseScope || '', confidentiality: intellectualProperty.confidentiality || '', confidentialityDuration: intellectualProperty.confidentialityDuration || '',
    reviewDecision: evidence.reviewDecision || '', dependencyAcknowledgementRequired: Boolean(evidence.dependencyAcknowledgementRequired), bilateralAmendmentOnly: Boolean(changeControl.bilateralAmendmentOnly),
    buyerContact: notices.buyerContact || '', serviceProviderContact: notices.serviceProviderContact || '', exactVersionAcknowledgement: Boolean(notices.exactVersionAcknowledgement), includeThirdMilestone: milestones.length === 3
  };
  const counterparty = initiatorIsBuyer ? source.serviceProviderContact : source.buyerContact;
  if (counterparty && counterparty !== initiatorEmail) source.inviteEmail = counterparty;
  milestones.forEach((milestone, index) => {
    const name = ['One', 'Two', 'Three'][index];
    source[`milestone${name}Title`] = milestone.title || '';
    source[`milestone${name}`] = milestone.deliveryOutcome || '';
    source[`milestone${name}Allocation`] = milestone.allocation || '';
    source[`milestone${name}Evidence`] = milestone.evidenceRequirement || '';
    source[`milestone${name}Criterion`] = milestone.acceptanceCriteria?.find(criterion => criterion.required)?.description || '';
    source[`milestone${name}Deadline`] = localInput(milestone.deliveryDeadlineUtc);
    source[`milestone${name}Review`] = milestone.reviewWindowHours || 72;
  });
  return source;
}

function localInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

async function hydrateExistingDraft() {
  if (!existingContractId) return;
  const [{ contract }, { user }] = await Promise.all([
    authenticatedRequest(`/api/contracts/${encodeURIComponent(existingContractId)}`),
    authenticatedRequest('/api/session')
  ]);
  existingAuthorityId = contract.authority.id;
  Object.assign(draft, draftFromContract(contract, user.email));
  setFormValues();
  if (step === 4) renderSendSummary();
}

document.querySelectorAll('.authoring-step').forEach((item, index) => {
  if (index === step - 1) return;
  item.tabIndex = 0;
  item.setAttribute('role', 'link');
  item.setAttribute('aria-label', `Go to ${item.textContent.trim()}`);
  const navigate = () => location.assign(routes[index]);
  item.addEventListener('click', navigate);
  item.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(); } });
});

if (step === 1) {
  const select = form.querySelector('[data-people]');
  const invite = form.elements.inviteEmail;
  select.addEventListener('change', () => { if (select.value) invite.value = ''; });
  invite.addEventListener('input', () => { if (invite.value) select.value = ''; });
  authenticatedRequest('/api/people').then(({ people }) => {
    const accepted = (people.connections || []).filter(person => person.status === 'accepted' && person.email);
    select.replaceChildren(new Option('Choose a Person later', ''), ...accepted.map(person => new Option(`${person.display_name} — ${person.email}`, person.email)));
    select.value = recipientEmail();
  }).catch(() => select.replaceChildren(new Option('Add a person later', '')));
}

if (step === 3) {
  const advanced = document.createElement('section');
  advanced.className = 'terms-card';
  advanced.innerHTML = '<h2>Complete Contract terms</h2><label>Buyer responsibility<textarea name="buyerResponsibility" required rows="2"></textarea></label><label>Service Provider responsibility<textarea name="serviceProviderResponsibility" required rows="2"></textarea></label><label>Excluded work<textarea name="excludedWork" required rows="2"></textarea></label><label>Client dependencies<textarea name="clientDependencies" rows="2"></textarea></label><label>Settlement token<input name="settlementToken" required></label><label>Success fee (basis points)<input name="successFeeBps" type="number" min="0" max="1000" required></label><label>Fee recipient<input name="feeRecipient"></label><label>Intellectual property<select name="ipOutcome"><option value="client_owns_project_deliverables_on_final_settlement">Client owns deliverables on final settlement</option><option value="provider_retains_ownership_with_client_license">Provider retains ownership with client license</option></select></label><label>License scope<input name="licenseScope"></label><label>Confidentiality<select name="confidentiality"><option value="not_requested">Not requested</option><option value="mutual_confidentiality">Mutual confidentiality</option></select></label><label>Confidentiality duration<input name="confidentialityDuration"></label><label>Buyer notice email<input name="buyerContact" type="email" required></label><label>Service Provider notice email<input name="serviceProviderContact" type="email" required></label><label><input name="dependencyAcknowledgementRequired" type="checkbox"> Require dependency acknowledgement</label><label><input name="bilateralAmendmentOnly" type="checkbox" required> Future work changes require both Contract Parties</label><label><input name="exactVersionAcknowledgement" type="checkbox" required> Acceptance applies only to this exact Version</label></section>';
  form.querySelector('.authoring-actions').before(advanced);
  for (const [name, value] of Object.entries(reviewDefaults(draft))) if (form.elements[name] && !form.elements[name].value) form.elements[name].value = value;
  authenticatedRequest('/api/session').then(({ user }) => {
    draft.initiatorEmail = user.email;
    const initiatorIsBuyer = draft.initiatorResponsibility === 'buyer';
    const recipientNotice = recipientEmail() || user.email;
    form.elements.buyerContact.value ||= initiatorIsBuyer ? user.email : recipientNotice;
    form.elements.serviceProviderContact.value ||= initiatorIsBuyer ? recipientNotice : user.email;
  });
  form.elements.bilateralAmendmentOnly.checked = draft.bilateralAmendmentOnly !== false && draft.bilateralAmendmentOnly !== 'false';
  form.elements.exactVersionAcknowledgement.checked = draft.exactVersionAcknowledgement !== false && draft.exactVersionAcknowledgement !== 'false';
  const milestoneCards = form.querySelectorAll('fieldset');
  const third = milestoneCards[1]?.cloneNode(true);
  if (third) {
    third.querySelector('legend').textContent = 'Milestone 3';
    for (const field of third.querySelectorAll('[name]')) field.name = field.name.replace('Two', 'Three');
    third.hidden = true;
    third.querySelectorAll('input, textarea, select').forEach(field => { field.disabled = true; });
    const toggle = document.createElement('label');
    toggle.className = 'milestone-toggle';
    toggle.innerHTML = '<input type="checkbox" name="includeThirdMilestone"> Add a third milestone';
    milestoneCards[1].after(toggle, third);
    const setThird = () => {
      const enabled = toggle.querySelector('input').checked;
      third.hidden = !enabled;
      third.querySelectorAll('input, textarea, select').forEach(field => { field.disabled = !enabled; });
    };
    toggle.querySelector('input').checked = draft.includeThirdMilestone === true || draft.includeThirdMilestone === 'true';
    toggle.querySelector('input').addEventListener('change', setThird);
    setThird();
  }
}

function renderSendSummary() {
  const recipient = recipientEmail();
  document.querySelector('[data-send-name]').textContent = draft.name || 'Contract Draft';
  document.querySelector('[data-counterparty]').textContent = recipient || 'No person selected';
  document.querySelector('[data-allocation]').textContent = draft.totalAllocation ? `${draft.totalAllocation} eUSD` : '—';
  document.querySelector('[data-send-summary]').textContent = recipient
    ? `Sending creates a shared, finalised Contract Version for ${recipient}.`
    : 'Publish this as your private Contract Draft. You can select a person and share an exact Contract Version later.';
  document.querySelector('[data-send-action]').textContent = recipient ? 'Send finalised Contract Version' : 'Publish Contract Draft';
}
if (step === 4) renderSendSummary();

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  save(form.elements);
  if (step < 4) return location.assign(routes[step]);

  const status = document.querySelector('#authoring-status');
  const button = form.querySelector('button[type=submit]');
  const email = recipientEmail();
  button.disabled = true;
  status.textContent = email ? 'Creating and sending the finalised Contract Version…' : 'Publishing your private Contract Draft…';
  try {
    const { user } = await authenticatedRequest('/api/session');
    draft.initiatorEmail = user.email;
    const contract = existingContractId
      ? { id: existingContractId }
      : (await authenticatedRequest('/api/contracts', {
          method: 'POST',
          body: JSON.stringify({ name: draft.name, scope: draft.scope, counterpartyEmail: email || null, initiatorResponsibility: draft.initiatorResponsibility })
        })).contract;
    const { contract: readable } = await authenticatedRequest(`/api/contracts/${encodeURIComponent(contract.id)}`);
    await authenticatedRequest(`/api/contracts/${encodeURIComponent(contract.id)}`, {
      method: 'PUT', body: JSON.stringify(contractDraftUpdate(draft, existingAuthorityId || readable.authority.id))
    });
    if (email) await authenticatedRequest(`/api/contracts/${encodeURIComponent(contract.id)}/invitations`, { method: 'POST', body: JSON.stringify({ email }) });
    sessionStorage.removeItem(key);
    location.assign(`/contracts/${encodeURIComponent(contract.id)}`);
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
  }
});

if (existingContractId) {
  const back = form.querySelector('.authoring-actions a');
  if (back) back.href = step === 1 ? '/contracts' : routes[step - 2];
  void hydrateExistingDraft().catch(error => {
    const status = document.querySelector('#authoring-status') || document.createElement('p');
    status.textContent = error.message;
    if (!status.isConnected) form.prepend(status);
  });
}
