import './app-shell.js';
import { authenticatedRequest, supabase } from './supabase-auth.js';
import { loadAcceptedConnections } from './contract-network.js';
import { privateAvatarUrl } from './private-avatar.js';
import { saveProfileSettings } from './profile-settings.js';
import { avatarAppearance, profileInitials } from './profile-presentation.js';

const $ = selector => document.querySelector(selector);
const text = (name, value, className) => { const node = document.createElement(name); node.textContent = value; if (className) node.className = className; return node; };
const stageCopy = { private_draft: 'Proposal', negotiation: 'Awaiting review', active: 'In progress', complete: 'Complete' };
const actionOrder = { negotiation: 0, private_draft: 1, active: 2, complete: 3 };
const attention = status => ['private_draft', 'negotiation'].includes(status);
const stage = contract => stageCopy[contract.status] ?? 'Contract update';
const formatDate = value => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : 'No activity recorded';
const milestone = contract => contract.nextMilestone ? `${contract.nextMilestone.title} · due ${formatDate(contract.nextMilestone.deadlineUtc)}` : 'No scheduled milestone yet';
function statusNode(contract) { return text('span', stage(contract), `status ${attention(contract.status) ? 'attention' : contract.status}`); }
function link(contract, label) { const node = text('a', label, 'button'); node.href = `/contracts/${encodeURIComponent(contract.id)}`; return node; }
function contractLabel(contract) { return contract.title?.trim() || `Contract ${contract.id.slice(0, 8)}`; }
function dashboardMessage(target, message, className = 'empty') { target.replaceChildren(text('p', message, className)); }
function setDashboardBusy(busy) {
  ['#action-list', '#timeline'].forEach(selector => $(selector)?.setAttribute('aria-busy', String(busy)));
}
function dashboardLoading() {
  dashboardMessage($('#action-list'), 'Loading Contract actions...');
  dashboardMessage($('#timeline'), 'Loading active milestones...');
  setDashboardBusy(true);
}
function dashboardError(error) {
  const subtitle = $('#dashboard-subtitle');
  if (subtitle) subtitle.textContent = 'Your Dashboard could not be loaded. Check your connection and sign-in, then try again.';
  [['#attention-count', '—'], ['#active-count', '—'], ['#workspace-count', '—']].forEach(([selector, value]) => { const node = $(selector); if (node) node.textContent = value; });
  const rawMessage = error?.message || '';
  const message = /^(?:the )?request failed\.?$/i.test(rawMessage) ? 'Dashboard data is temporarily unavailable. Please refresh the page.' : rawMessage || 'Dashboard data is unavailable.';
  const sessionExpired = /sign-in session has expired/i.test(message);
  ['#action-list', '#timeline'].forEach(selector => {
    const target = $(selector);
    if (!target) return;
    if (!sessionExpired) return dashboardMessage(target, message, 'error');
    const notice = text('p', message, 'error');
    const signIn = text('a', 'Log in again', 'button');
    signIn.href = '/login.html';
    target.replaceChildren(notice, signIn);
  });
  setDashboardBusy(false);
}
function renderDashboard(home) {
  const contracts = home.contracts ?? [];
  $('#attention-count').textContent = contracts.filter(contract => attention(contract.status)).length;
  $('#active-count').textContent = contracts.filter(contract => contract.status === 'active').length;
  $('#workspace-count').textContent = contracts.filter(contract => contract.status === 'complete').length;
  document.querySelectorAll('.metric-grid .metric span').forEach((label, index) => { label.textContent = ['Awaiting you', 'In progress', 'Completed'][index]; });
  const actions = $('#action-list'); actions.replaceChildren();
  const ordered = contracts.filter(contract => attention(contract.status)).sort((left, right) => actionOrder[left.status] - actionOrder[right.status] || new Date(right.lastActivityAt) - new Date(left.lastActivityAt));
  if (!ordered.length) {
    if (contracts.length) dashboardMessage(actions, 'No Contract actions need your attention.');
    else {
      const empty = text('p', 'No Contracts are visible yet. ', 'empty');
      const create = text('a', 'Create a Proposal');
      create.href = '/contracts#new-proposal';
      empty.append(create, '.');
      actions.replaceChildren(empty);
    }
  }
  ordered.forEach(contract => { const item = document.createElement('article'); item.className = 'list-item'; const copy = document.createElement('div'); copy.append(text('strong', stage(contract)), text('small', `${contract.workspaceName} · ${contract.responsibility} · ${contract.counterparty}`)); item.append(copy, link(contract, 'Open')); actions.append(item); });
  const timeline = $('#timeline'); timeline.replaceChildren();
  const active = contracts.filter(contract => contract.status === 'active' && contract.nextMilestone);
  if (!active.length) timeline.append(text('p', 'Milestones appear here once an active Contract has an authoritative schedule.', 'empty'));
  active.sort((left, right) => Date.parse(left.nextMilestone.deadlineUtc) - Date.parse(right.nextMilestone.deadlineUtc)).forEach(contract => timeline.append(text('div', `${contract.workspaceName} · ${milestone(contract)}`, 'list-item')));
  setDashboardBusy(false);
}
async function initDashboard() {
  dashboardLoading();
  const result = await authenticatedRequest('/api/home');
  $('#dashboard-subtitle').textContent = 'Your Contract actions stay scoped to the Workspaces and Contract Parties you can access.';
  renderDashboard(result.home);
}
function workspaceStatus(message, className = '') {
  const status = $('#workspace-create-status');
  if (!status) return;
  status.className = className;
  status.textContent = message;
}
function renderWorkspaceList(workspaces) {
  const list = $('#workspace-list');
  if (!list) return;
  list.setAttribute('aria-busy', 'false');
  const selectedId = new URLSearchParams(window.location.search).get('workspace');
  list.replaceChildren();
  if (!workspaces.length) {
    list.append(text('p', 'Your personal Workspace is being prepared.', 'empty'));
    return;
  }
  workspaces.forEach(workspace => {
    const item = document.createElement('article');
    item.className = 'list-item workspace-list-item';
    const copy = document.createElement('div');
    copy.append(text('strong', workspace.name), text('small', `${workspace.kind === 'personal' ? 'Personal' : 'Collaborative'} Workspace · ${workspace.membershipRole}`));
    const current = workspace.id === selectedId;
    const action = text('button', current ? 'Current Workspace' : 'Open Workspace', 'button');
    action.type = 'button';
    action.disabled = current;
    action.addEventListener('click', () => selectWorkspace(workspace.id, workspaces));
    item.append(copy, action);
    list.append(item);
  });
}
function selectWorkspace(workspaceId, workspaces) {
  window.history.replaceState({}, '', `/workspace?workspace=${encodeURIComponent(workspaceId)}`);
  renderWorkspaceList(workspaces);
}
async function initWorkspaces() {
  const list = $('#workspace-list');
  if (list) list.replaceChildren(text('p', 'Loading your Workspaces…', 'empty'));
  let workspaces = (await authenticatedRequest('/api/workspaces')).workspaces ?? [];
  renderWorkspaceList(workspaces);
  const form = $('#workspace-create-form');
  const name = form?.elements.name;
  name?.addEventListener('input', () => name.setCustomValidity(''));
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const trimmedName = name.value.trim();
    if (!trimmedName) {
      name.setCustomValidity('Enter a Workspace name.');
      name.reportValidity();
      workspaceStatus('Enter a Workspace name before creating it.', 'error');
      return;
    }
    name.setCustomValidity('');
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    workspaceStatus('Creating Workspace…');
    try {
      const { workspace } = await authenticatedRequest('/api/workspaces', { method: 'POST', body: JSON.stringify({ name: trimmedName }) });
      form.reset();
      workspaces = [...workspaces, workspace];
      selectWorkspace(workspace.id, workspaces);
      workspaceStatus(`${workspace.name} is ready. You are its owner.`);
    } catch (error) {
      workspaceStatus(error.message || 'This Workspace could not be created.', 'error');
    } finally {
      submit.disabled = false;
    }
  });
}
function filteredContracts(home) { const workspace = $('#workspace-filter').value; const status = $('#stage-filter').value; const responsibility = $('#responsibility-filter').value; return (home.contracts ?? []).filter(contract => (!workspace || contract.workspaceName === workspace) && (!status || contract.status === status) && (!responsibility || responsibility === contract.responsibility)); }
function appendField(record, label, value) { record.append(text('span', label, 'label'), text('span', value)); }
function renderContracts(home) {
  const table = $('#contract-table-body'); const cards = $('#contract-records');
  const render = () => { const contracts = filteredContracts(home); table.replaceChildren(); cards.replaceChildren(); if (!contracts.length) { cards.append(text('p', 'No Contracts match these filters.', 'empty')); return; }
    contracts.forEach(contract => { const row = document.createElement('tr'); const contractCell = document.createElement('td'); contractCell.append(link(contract, contractLabel(contract))); const stageCell = document.createElement('td'); stageCell.append(statusNode(contract)); [contractCell, text('td', contract.workspaceName), text('td', contract.counterparty), text('td', contract.responsibility), stageCell, text('td', milestone(contract)), text('td', formatDate(contract.lastActivityAt))].forEach(cell => row.append(cell)); const actionCell = document.createElement('td'); actionCell.append(link(contract, 'Open')); row.append(actionCell); table.append(row);
      const record = document.createElement('article'); record.className = 'record'; const recordLink = link(contract, contractLabel(contract)); record.append(text('span', 'Contract', 'label'), recordLink); appendField(record, 'Workspace', contract.workspaceName); appendField(record, 'Counterparty', contract.counterparty); appendField(record, 'Your responsibility', contract.responsibility); record.append(text('span', 'Stage', 'label'), statusNode(contract)); appendField(record, 'Next milestone', milestone(contract)); appendField(record, 'Last activity', formatDate(contract.lastActivityAt)); const action = link(contract, 'Open'); record.append(text('span', 'Action', 'label'), action); cards.append(record); }); };
  ['#workspace-filter', '#stage-filter', '#responsibility-filter'].forEach(selector => $(selector).addEventListener('change', render)); render();
}
async function initContracts() { const home = (await authenticatedRequest('/api/home')).home; const workspaces = home.workspaces ?? []; const workspaceSelect = $('#proposal-workspace'); const filter = $('#workspace-filter'); const responsibility = $('#responsibility-filter'); responsibility.replaceChildren(...[['', 'Any responsibility'], ['Buyer', 'Buyer'], ['Service Provider', 'Service Provider']].map(([value, label]) => { const option = text('option', label); option.value = value; return option; })); document.querySelector('.contract-table thead tr')?.replaceChildren(...['Contract', 'Workspace', 'Counterparty', 'Your responsibility', 'Stage', 'Next milestone', 'Last activity', 'Action'].map(label => text('th', label))); workspaces.forEach(workspace => { for (const select of [workspaceSelect, filter]) { const option = document.createElement('option'); option.value = select === filter ? workspace.name : workspace.id; option.textContent = workspace.name; select.append(option); } }); renderContracts(home); const chooser = $('#network-counterparty'); const networkResult = await loadAcceptedConnections(authenticatedRequest); const network = networkResult.connections; if (!networkResult.available) $('#proposal-status').textContent = 'Your connection list is temporarily unavailable. You can still enter a counterparty email.'; network.forEach(person => { const option = document.createElement('option'); option.value = person.other_profile_id; option.textContent = person.display_name; chooser.append(option); }); const help = text('p', 'Choosing an accepted connection only pre-fills their confirmed email. It does not invite them, add Workspace membership, or share this Proposal.', 'notice'); help.id = 'network-counterparty-help'; chooser.closest('label')?.after(help); chooser.addEventListener('change', () => { const selected = network.find(person => person.other_profile_id === chooser.value); const email = $('#counterparty-email'); if (selected) { email.value = selected.email; email.readOnly = true; email.setAttribute('aria-describedby', 'network-counterparty-help'); } else { email.value = ''; email.readOnly = false; email.removeAttribute('aria-describedby'); } }); $('#proposal-form').addEventListener('submit', async event => { event.preventDefault(); const form = new FormData(event.currentTarget); const status = $('#proposal-status'); status.textContent = 'Creating Proposal…'; try { const result = await authenticatedRequest('/api/contracts', { method: 'POST', body: JSON.stringify(Object.fromEntries(form)) }); status.replaceChildren(text('span', 'Proposal created. It remains available only to authorised members of its owning Workspace until you explicitly share it.'), link(result.contract, ' Open Proposal')); event.currentTarget.reset(); $('#counterparty-email').readOnly = false; } catch (error) { status.textContent = error.message; } }); }
function connectionButton(profileId, action, label) { const button = text('button', label); button.dataset.profileId = profileId; button.dataset.action = action; return button; }
function renderPeople(people) { const discover = $('#discover-results'); const network = $('#network-results'); const requests = $('#request-results'); [discover, network, requests].forEach(list => list.replaceChildren()); (people.discover ?? []).forEach(person => { const item = document.createElement('article'); item.className = 'list-item'; const copy = document.createElement('div'); copy.append(text('strong', person.display_name), text('small', person.professional_headline || 'Professional Profile')); item.append(copy, connectionButton(person.id, 'send', 'Connect')); discover.append(item); }); (people.connections ?? []).forEach(connection => { const item = document.createElement('article'); item.className = 'list-item'; const copy = document.createElement('div'); copy.append(text('strong', connection.display_name), text('small', `${connection.status} connection · viewing them never grants Workspace or Contract access.`)); const actions = document.createElement('div'); if (connection.status === 'accepted') actions.append(connectionButton(connection.other_profile_id, 'remove', 'Remove'), connectionButton(connection.other_profile_id, 'block', 'Block')); else if (connection.status === 'pending' && connection.direction === 'incoming') actions.append(connectionButton(connection.other_profile_id, 'accept', 'Accept'), connectionButton(connection.other_profile_id, 'decline', 'Decline')); else if (connection.status === 'pending') actions.append(connectionButton(connection.other_profile_id, 'withdraw', 'Withdraw')); item.append(copy, actions); (connection.status === 'accepted' ? network : requests).append(item); }); if (!discover.children.length) discover.append(text('p', 'No eligible People match this search.', 'empty')); if (!network.children.length) network.append(text('p', 'Your accepted professional connections will appear here.', 'empty')); if (!requests.children.length) requests.append(text('p', 'No pending connection activity.', 'empty')); }
async function initPeople() { let people = (await authenticatedRequest('/api/people')).people; renderPeople(people); $('#people-search')?.addEventListener('change', async event => { people = (await authenticatedRequest(`/api/people?q=${encodeURIComponent(event.target.value)}`)).people; renderPeople(people); }); $('#people-content').addEventListener('click', async event => { const button = event.target.closest('[data-action]'); if (!button) return; await authenticatedRequest('/api/people/connections', { method: 'POST', body: JSON.stringify({ profileId: button.dataset.profileId, action: button.dataset.action }) }); people = (await authenticatedRequest('/api/people')).people; renderPeople(people); }); }
function setPeopleBusy(busy) { $('#discover-results')?.setAttribute('aria-busy', String(busy)); const search = $('#people-search'); if (search) search.disabled = busy; }
function peopleStatus(message) { const status = $('#people-status'); if (status) status.textContent = message; }
function renderPeopleEnhanced(people) { renderPeople(people); [...document.querySelectorAll('#discover-results .list-item')].forEach((item, index) => { const person = people.discover?.[index]; const details = item.querySelector('small'); if (person && details) details.textContent = [person.username ? `@${person.username}` : null, person.professional_headline || 'Professional Profile'].filter(Boolean).join(' · '); item.querySelector('div')?.append(text('small', 'Viewing this Profile does not grant Workspace or Contract access.')); }); setPeopleBusy(false); peopleStatus((people.discover ?? []).length ? `${people.discover.length} eligible People found.` : 'No eligible People match this search.'); }
function peopleLoading() { setPeopleBusy(true); peopleStatus('Loading eligible People…'); $('#discover-results')?.replaceChildren(text('p', 'Loading People…', 'empty')); }
function peopleError(error) { setPeopleBusy(false); const message = error?.message || 'People discovery is unavailable.'; peopleStatus('People discovery could not be loaded. Check your connection and try again.'); $('#discover-results')?.replaceChildren(text('p', message, 'error')); }
async function initPeopleEnhanced() { let people; const loadPeople = async search => { peopleLoading(); try { people = (await authenticatedRequest(`/api/people?q=${encodeURIComponent(search)}`)).people; renderPeopleEnhanced(people); } catch (error) { peopleError(error); } }; await loadPeople(''); $('#people-search')?.addEventListener('change', event => { void loadPeople(event.target.value); }); $('#people-content').addEventListener('click', async event => { const button = event.target.closest('[data-action]'); if (!button) return; peopleStatus('Updating connection…'); try { await authenticatedRequest('/api/people/connections', { method: 'POST', body: JSON.stringify({ profileId: button.dataset.profileId, action: button.dataset.action }) }); await loadPeople($('#people-search')?.value ?? ''); } catch (error) { peopleStatus(error.message || 'This connection could not be updated.'); } }); }
let avatarRenderVersion = 0;
async function renderAvatar(profile, previewUrl = null) {
  const avatar = $('#avatar-preview');
  if (!avatar) return;
  const renderVersion = ++avatarRenderVersion;
  const imageUrl = previewUrl ?? await privateAvatarUrl(profile, await supabase());
  if (renderVersion !== avatarRenderVersion) return;
  const appearance = avatarAppearance(profile.avatarSeed);
  avatar.textContent = imageUrl ? '' : profileInitials(profile);
  avatar.style.backgroundColor = appearance.background;
  avatar.style.color = appearance.foreground;
  avatar.style.backgroundImage = imageUrl ? `url("${imageUrl}")` : '';
  avatar.classList.toggle('has-image-preview', Boolean(imageUrl));
  $('#avatar-status').textContent = previewUrl
    ? 'Selected private image preview. It will be uploaded only when you save changes.'
    : imageUrl ? 'Your saved private image is visible only to you.'
      : profile.avatarPath ? 'Your saved private image is temporarily unavailable. Initials are shown instead.'
        : 'A deterministic colour avatar is used unless a private upload succeeds.';
}
async function uploadAvatar(file, profile) { if (!file) return profile.avatarPath; if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('Choose a JPEG, PNG, or WebP image up to 5 MB.'); const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]; const path = `${profile.id}/avatar.${extension}`; const { error } = await (await supabase()).storage.from('profile-images').upload(path, file, { upsert: true, contentType: file.type }); if (error) throw new Error('Your profile image was not uploaded. Your existing avatar remains unchanged.'); return path; }
async function initRefinedSettings() {
  const session = await authenticatedRequest('/api/session');
  const form = $('#settings-form');
  const imageInput = form.elements.avatarFile;
  const imageButton = $('#avatar-file-button');
  const fileStatus = $('#avatar-file-status');
  let profile = session.user.profile;
  let previewUrl = null;
  const clearPreview = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = null; };
  const updatePreview = () => {
    clearPreview();
    const file = imageInput.files[0];
    if (file) {
      previewUrl = URL.createObjectURL(file);
      fileStatus.textContent = `Selected: ${file.name}`;
      imageButton.textContent = 'Change profile image';
    } else {
      fileStatus.textContent = 'No new image selected.';
      imageButton.textContent = 'Choose profile image';
    }
    void renderAvatar({ ...profile, avatarSeed: form.elements.avatarSeed.value }, previewUrl);
  };
  form.elements.displayName.value = profile.displayName ?? '';
  form.elements.professionalHeadline.value = profile.professionalHeadline ?? '';
  form.elements.bio.value = profile.bio ?? '';
  form.elements.avatarSeed.value = profile.avatarSeed ?? 'indigo';
  form.elements.discoverable.checked = Boolean(profile.discoverable);
  await renderAvatar(profile);
  form.elements.avatarSeed.addEventListener('change', updatePreview);
  imageInput.addEventListener('change', updatePreview);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    data.discoverable = form.elements.discoverable.checked;
    delete data.avatarFile;
    const status = $('#settings-status');
    status.textContent = 'Saving Profile Settings…';
    try {
      const result = await saveProfileSettings({
        profile,
        values: data,
        file: imageInput.files[0],
        uploadAvatar,
        saveProfile: payload => authenticatedRequest('/api/profile/settings', { method: 'PUT', body: JSON.stringify(payload) }).then(response => response.profile)
      });
      profile = result.profile;
      if (!result.uploadError) {
        clearPreview();
        imageInput.value = '';
        fileStatus.textContent = 'No new image selected.';
        imageButton.textContent = 'Choose profile image';
      }
      await renderAvatar(profile, result.uploadError ? previewUrl : null);
      document.dispatchEvent(new CustomEvent('pactflow:profile-updated', { detail: { profile } }));
      status.textContent = result.uploadError ? `Profile Settings were saved, but the profile image was not uploaded. ${result.uploadError}` : `${profile.displayName}'s Profile Settings were saved.`;
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

function ensureContractResponsibilityFilter() {
  if (document.body.dataset.page !== 'contracts') return;
  const select = $('#responsibility-filter');
  if (select && ![...select.options].some(option => option.value === 'Workspace member')) {
    const option = text('option', 'Workspace member');
    option.value = 'Workspace member';
    select.append(option);
  }
}
const init = document.body.dataset.page === 'dashboard' ? initDashboard : document.body.dataset.page === 'workspace' ? initWorkspaces : document.body.dataset.page === 'contracts' ? initContracts : document.body.dataset.page === 'people' ? initPeopleEnhanced : document.body.dataset.page === 'settings' ? initRefinedSettings : null;
Promise.resolve(init?.()).then(ensureContractResponsibilityFilter).catch(error => {
  const target = $('#request-error');
  if (target && document.body.dataset.page !== 'dashboard') { target.hidden = false; target.textContent = error.message; }
  if (document.body.dataset.page === 'dashboard') dashboardError(error);
});
