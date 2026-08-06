import { authenticatedRequest, supabase } from './supabase-auth.js';

const $ = selector => document.querySelector(selector);
const statusCopy = {
  private_draft: { label: 'Private draft', action: 'Finish the private draft before sharing it.', attention: true },
  negotiation: { label: 'Awaiting version review', action: 'Review the latest Version with the other Contract Party.', attention: true },
  active: { label: 'Active', action: 'Open the Contract to see the next milestone.', attention: false },
  complete: { label: 'Complete', action: 'All milestones have a final outcome.', attention: false }
};
const requiresAttention = contract => Boolean(statusCopy[contract.status]?.attention);

function element(name, className, text) {
  const node = document.createElement(name);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function emptyState(message) { return element('p', 'home-empty', message); }
function renderWorkspaces(workspaces) {
  const list = $('#workspace-list');
  list.replaceChildren();
  if (!workspaces.length) return list.append(emptyState('Your personal Workspace is being prepared.'));
  workspaces.forEach(workspace => {
    const item = element('article', 'home-workspace-row');
    const initials = element('span', 'home-workspace-initials', workspace.name.slice(0, 2).toUpperCase());
    const copy = element('div');
    copy.append(element('strong', '', workspace.name), element('span', '', `${workspace.kind} · ${workspace.membershipRole}`));
    item.append(initials, copy);
    list.append(item);
  });
}
function renderActions(contracts) {
  const list = $('#action-list');
  const actionable = contracts.filter(requiresAttention);
  list.replaceChildren();
  if (!actionable.length) return list.append(emptyState(contracts.length ? 'No Contract reviews or private drafts need attention.' : 'Your next Contract action will appear here.'));
  actionable.forEach(contract => {
    const item = element('article', 'home-action-row');
    const copy = element('div');
    const meta = statusCopy[contract.status] ?? { label: 'Contract update', action: 'Review this Contract.' };
    copy.append(element('strong', '', meta.label), element('span', '', meta.action));
    copy.append(element('small', 'home-action-context', workspaceLabel(contract)));
    const link = element('a', 'home-row-link', 'View Contract list');
    link.href = '#contracts';
    link.setAttribute('aria-label', `${meta.label} in ${workspaceLabel(contract)}: view the Contract list`);
    item.append(copy, link);
    list.append(item);
  });
}
function workspaceLabel(contract) { return `Workspace: ${contract.workspaceName ?? 'Personal Contract'}`; }
function renderContracts(contracts) {
  const list = $('#contract-list');
  list.replaceChildren();
  if (!contracts.length) return list.append(emptyState('No Contracts are visible to you yet. Create one or accept a specific invitation when those durable workflows are available.'));
  contracts.forEach(contract => {
    const card = element('article', 'home-contract-card');
    card.id = `contract-${contract.id}`;
    const meta = statusCopy[contract.status] ?? { label: 'Contract update' };
    const heading = element('div');
    heading.append(element('span', 'home-contract-eyebrow', `Version ${contract.latestVersionNumber || 'draft'}`), element('h3', '', meta.label), element('p', '', 'Contract details are visible only to its Parties and active delegates.'));
    const badge = element('span', `home-contract-state ${contract.status}`, meta.label);
    card.append(heading, badge);
    list.append(card);
  });
}
function renderHome(profile, home) {
  const contracts = home.contracts ?? [];
  const workspaces = home.workspaces ?? [];
  const attention = contracts.filter(requiresAttention).length;
  $('#home-subtitle').textContent = `${profile.displayName ?? profile.email} · ${workspaces.length ? 'Your access is scoped by Workspace and Contract.' : 'Preparing your first Workspace.'}`;
  $('#attention-count').textContent = String(attention);
  $('#active-count').textContent = String(contracts.filter(contract => contract.status === 'active').length);
  $('#workspace-count').textContent = String(workspaces.length);
  renderActions(contracts);
  renderWorkspaces(workspaces);
  renderContracts(contracts);
}
function showError(error) { const message = $('#request-error'); message.hidden = false; message.textContent = error.message; }

const contractForm = $('#new-contract-form');
const contractStatus = $('#contract-form-status');
function toggleContractForm(open) {
  contractForm.hidden = !open;
  if (open) contractForm.elements.name.focus();
}
$('#new-contract').onclick = () => toggleContractForm(true);
$('#cancel-contract').onclick = () => { contractForm.reset(); contractStatus.textContent = ''; toggleContractForm(false); };
contractForm.addEventListener('submit', async event => {
  event.preventDefault();
  const submit = contractForm.querySelector('[type="submit"]');
  submit.disabled = true;
  contractStatus.textContent = 'Creating your private Contract…';
  try {
    const data = Object.fromEntries(new FormData(contractForm));
    await authenticatedRequest('/api/contracts', { method: 'POST', body: JSON.stringify(data) });
    contractStatus.textContent = 'Private Contract created and invitation sent. It is visible only to you until the counterparty accepts.';
    contractForm.reset();
    const response = await authenticatedRequest('/api/home');
    renderContracts(response.home.contracts ?? []);
    $('#attention-count').textContent = String((response.home.contracts ?? []).filter(requiresAttention).length);
    window.setTimeout(() => toggleContractForm(false), 1200);
  } catch (error) {
    contractStatus.textContent = error.message;
  } finally { submit.disabled = false; }
});

$('#sign-out').onclick = async () => { await (await supabase()).auth.signOut(); window.location.assign('/'); };
(async () => {
  try {
    const [session, response] = await Promise.all([authenticatedRequest('/api/session'), authenticatedRequest('/api/home')]);
    renderHome(session.user.profile, response.home);
  } catch (error) {
    showError(error);
    window.setTimeout(() => window.location.assign('/login.html'), 1_200);
  }
})();
