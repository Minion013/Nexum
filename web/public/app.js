import Privy, { LocalStorage, getUserEmbeddedEthereumWallet } from '@privy-io/js-sdk-core';

const $ = selector => document.querySelector(selector);
let role = null;
let model = null;
let draftTerms = null;
let draftDirty = false;
let privy = null;
let accessToken = null;
let identityToken = null;
let walletAddress = null;
const money = value => `${(value / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 2 })} simulated eUSD`;
const active = () => model?.milestones.find(milestone => ['Active', 'InReview', 'Disputed'].includes(milestone.status)) || model?.milestones[0];
const enable = (id, allowed) => { $(id).disabled = !allowed; };
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const localInput = seconds => {
  const date = new Date(seconds * 1000);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
const deadline = seconds => `${new Date(seconds * 1000).toLocaleString()} (UTC ${new Date(seconds * 1000).toISOString().replace('.000Z', 'Z')})`;

async function request(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
  const payload = response.status === 204 ? {} : await response.json();
  if (!response.ok) {
    const error = new Error(payload.error || 'The local request failed.');
    error.code = payload.code;
    throw error;
  }
  return payload;
}
function showError(message = '') { $('#request-error').hidden = !message; $('#request-error').textContent = message; }
function shortAddress(address) { return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'pending wallet'; }
async function initializePrivy() {
  const { appId } = await request('/api/auth/config');
  if (!appId) throw new Error('Privy is not configured for this environment.');
  privy = new Privy({ appId, storage: new LocalStorage() });
  await privy.initialize();
  accessToken = await privy.getAccessToken();
}
async function prepareWallet() {
  const email = $('#email').value.trim();
  const code = $('#email-code').value.trim();
  if (!email || !code) throw new Error('Enter the email address and the Privy sign-in code.');
  const authenticated = await privy.auth.email.loginWithCode(email, code);
  let user = authenticated.user ?? authenticated;
  let wallet = getUserEmbeddedEthereumWallet(user);
  if (!wallet) {
    const created = await privy.embeddedWallet.create();
    user = created.user ?? created;
    wallet = getUserEmbeddedEthereumWallet(user);
  }
  if (!wallet?.address) throw new Error('Privy did not return an embedded Ethereum wallet.');
  accessToken = await privy.getAccessToken();
  identityToken = await privy.getIdentityToken();
  if (!accessToken) throw new Error('Privy did not return an access token.');
  if (!identityToken) throw new Error('Privy did not return an identity token.');
  walletAddress = wallet.address;
  $('#auth-controls').hidden = true;
  $('#role-controls').hidden = false;
  showError('Privy sign-in complete. Choose your local agreement role. Your wallet remains user-controlled.');
}
async function startSession(requestedRole) {
  if (!accessToken || !identityToken || !walletAddress) throw new Error('Sign in with Privy and prepare a wallet first.');
  const create = async roleToCreate => request('/api/session', { method: 'POST', body: JSON.stringify({ role: roleToCreate, accessToken, identityToken, walletAddress }) });
  let session;
  try { session = await create(requestedRole); } catch (error) {
    if (requestedRole !== 'seller' || error.code !== 'seller_invitation_required') throw error;
    session = await create('invitee');
  }
  role = session.role;
  walletAddress = session.walletAddress ?? walletAddress;
  await refresh();
}
function milestoneEditor() {
  if (!draftTerms) return;
  $('#draft-scope').value = draftTerms.scope;
  $('#draft-roles').textContent = `Buyer ${draftTerms.buyer} | Seller ${draftTerms.seller} | Bound resolver ${draftTerms.resolver} | Success fee ${(draftTerms.feeBps / 100).toFixed(2)}%`;
  $('#milestone-editor').innerHTML = draftTerms.milestones.map((milestone, index) => `<fieldset class="milestone-fields"><h3>Milestone ${index + 1}</h3><label>Title<input name="title-${index}" required value="${escape(milestone.title)}"></label><label>Allocation (eUSD)<input name="amount-${index}" required type="number" min="0.01" step="0.01" value="${milestone.amount / 1_000_000}"></label><label>Deadline in your local time<input name="deadline-${index}" required type="datetime-local" value="${localInput(milestone.deadline)}"></label><label>Review hours<select name="review-${index}"><option value="24" ${milestone.reviewSeconds === 86_400 ? 'selected' : ''}>24</option><option value="72" ${milestone.reviewSeconds === 259_200 ? 'selected' : ''}>72</option><option value="168" ${milestone.reviewSeconds === 604_800 ? 'selected' : ''}>168</option></select></label><label class="wide">Evidence requirement<input name="evidence-${index}" required value="${escape(milestone.evidenceRequirement)}"></label>${draftTerms.milestones.length > 2 ? `<button type="button" class="danger" data-remove-milestone="${index}">Remove</button>` : ''}</fieldset>`).join('');
  updateDraftPreview();
}
function termsFromForm() {
  const form = $('#draft-form');
  const milestones = draftTerms.milestones.map((_, index) => ({
    title: form.elements[`title-${index}`].value.trim(),
    amount: Math.round(Number(form.elements[`amount-${index}`].value) * 1_000_000),
    deadline: Math.floor(new Date(form.elements[`deadline-${index}`].value).getTime() / 1000),
    reviewSeconds: Number(form.elements[`review-${index}`].value) * 3_600,
    evidenceRequirement: form.elements[`evidence-${index}`].value.trim()
  }));
  return { ...draftTerms, scope: $('#draft-scope').value.trim(), milestones };
}
function updateDraftPreview() {
  try {
    const terms = termsFromForm();
    const total = terms.milestones.reduce((sum, milestone) => sum + milestone.amount, 0);
    $('#draft-preview').textContent = `Draft allocation: ${money(total)}. ${terms.milestones.map((milestone, index) => `Milestone ${index + 1}: ${deadline(milestone.deadline)}`).join(' | ')}`;
  } catch { $('#draft-preview').textContent = 'Enter complete milestone values to preview local and UTC deadlines.'; }
}
function renderVersions() {
  const panel = $('#version-panel');
  const history = model?.history;
  panel.hidden = !history;
  if (!history) return;
  $('#version-history').innerHTML = history.slice().reverse().map(version => {
    const approvals = version.approvals.length ? `Approved by ${version.approvals.join(', ')}` : 'No approvals yet';
    const changes = version.changes.length ? version.changes.map(change => `${escape(change.field)}: ${escape(change.before)} to ${escape(change.after)}`).join('; ') : 'Original terms';
    return `<li><strong>v${version.version} - ${escape(version.status)}</strong><span>${new Date(version.timestamp).toLocaleString()} | ${approvals} | ${changes}</span></li>`;
  }).join('');
}
function render() {
  $('#wallet-state').textContent = role ? `${role[0].toUpperCase() + role.slice(1)} · Privy test wallet ${shortAddress(walletAddress)}` : 'No authenticated session';
  $('#sign-in').hidden = Boolean(role); $('#sign-out').hidden = !role;
  const invitationPanel = $('#invitation-panel');
  invitationPanel.hidden = !['buyer', 'seller', 'invitee'].includes(role);
  $('#create-invitation').hidden = !['buyer', 'seller'].includes(role);
  $('#invitation-input').parentElement.hidden = role !== 'invitee';
  if (!model) { $('#draft-panel').hidden = true; $('#version-panel').hidden = true; return; }
  const milestone = active();
  const approvals = model.approvals ?? [];
  $('#agreement-state').textContent = model.state === 'Funded' ? 'Funded - local simulation' : model.state === 'Expired' ? 'Funding window expired' : 'Draft - no payment authority';
  $('#agreement-version').textContent = model.approvals ? `v${model.version} - ${approvals.length}/2 approvals${model.hasPendingAmendment ? ' - amendment pending' : ''}` : `v${model.version} - operational status only`;
  $('#milestone-title').textContent = milestone?.title || 'All milestones complete';
  $('#milestone-detail').textContent = milestone ? `${money(milestone.amount)} - ${deadline(milestone.deadline)}` : 'No active milestone';
  $('#milestone-status').textContent = !milestone ? 'All milestones have a terminal local outcome.' : model.state !== 'Funded' ? 'Locked until the agreement is funded' : milestone.status === 'InReview' ? `In review until ${deadline(milestone.reviewEndsAt)}` : milestone.status === 'Disputed' ? 'Frozen locally - only the simulated resolver may resolve it.' : 'Active - seller can submit one final local evidence record.';
  enable('#approve', Boolean(role) && model.state === 'Unfunded' && !approvals.includes(`local-${role}`) && ['buyer', 'seller'].includes(role));
  enable('#fund', role === 'buyer' && approvals.length === 2 && model.state === 'Unfunded'); enable('#evidence', role === 'seller' && milestone?.status === 'Active');
  enable('#accept', role === 'buyer' && milestone?.status === 'InReview'); enable('#release', milestone?.status === 'InReview'); enable('#dispute', role === 'buyer' && milestone?.status === 'InReview');
  enable('#resolve', role === 'resolver' && milestone?.status === 'Disputed'); enable('#refund', role === 'buyer' && milestone?.status === 'Active'); enable('#amend', ['buyer', 'seller'].includes(role) && model.state !== 'Expired' && !model.hasPendingAmendment);
  $('#timeline').innerHTML = model.events.slice().reverse().map(item => `<li><strong>${escape(item.type)}</strong><span>${new Date(item.timestamp).toLocaleString()} - ${item.version ? `version ${item.version}` : item.milestone !== undefined ? `milestone ${item.milestone + 1}` : 'local event'}</span></li>`).join('');
  const canEdit = ['buyer', 'seller'].includes(role) && model.state === 'Unfunded';
  $('#draft-panel').hidden = !canEdit;
  if (canEdit && (!draftTerms || !draftDirty)) { draftTerms = structuredClone(model.terms); milestoneEditor(); }
  renderVersions();
}
async function refresh() {
  try { const session = await request('/api/session'); role = session.role; walletAddress = session.walletAddress ?? walletAddress; } catch { role = null; }
  try { model = (await request('/api/agreement')).agreement; draftDirty = false; showError(); } catch { model = null; }
  render();
}
async function act(type) { try { model = (await request('/api/agreement/actions', { method: 'POST', body: JSON.stringify({ type }) })).agreement; draftDirty = false; showError(); render(); } catch (error) { showError(error.message); } }
document.querySelectorAll('[data-role]').forEach(button => button.onclick = async () => { try { await startSession(button.dataset.role); } catch (error) { showError(error.message); } });
$('#sign-in').onclick = () => $('#session-panel').scrollIntoView({ behavior: 'smooth' });
$('#send-code').onclick = async () => { try { if (!privy) await initializePrivy(); const email = $('#email').value.trim(); if (!email) throw new Error('Enter an email address.'); await privy.auth.email.sendCode(email); $('#email-code').hidden = false; $('#verify-code').hidden = false; showError('Privy sent a one-time sign-in code.'); } catch (error) { showError(error.message); } };
$('#verify-code').onclick = async () => { try { if (!privy) await initializePrivy(); await prepareWallet(); } catch (error) { showError(error.message); } };
$('#sign-out').onclick = async () => { try { await request('/api/session', { method: 'DELETE' }); if (privy) await privy.auth.logout(); accessToken = null; identityToken = null; walletAddress = null; draftTerms = null; $('#auth-controls').hidden = false; $('#role-controls').hidden = true; await refresh(); } catch (error) { showError(error.message); } };
$('#create-invitation').onclick = async () => { try { const invitation = await request('/api/agreement/invitations', { method: 'POST' }); $('#invitation-code').textContent = `Share this one-time local invitation code with the counterparty: ${invitation.id}`; showError(); } catch (error) { showError(error.message); } };
$('#accept-invitation').onclick = async () => { try { const code = $('#invitation-input').value.trim(); await request(`/api/agreement/invitations/${encodeURIComponent(code)}/accept`, { method: 'POST' }); await refresh(); } catch (error) { showError(error.message); } };
['approve', 'fund', 'evidence', 'accept', 'release', 'dispute', 'resolve', 'refund', 'amend'].forEach(type => { $(`#${type}`).onclick = () => act(type); });
$('#copilot').onclick = async () => { try { const result = await request('/api/agreement/copilot', { method: 'POST', body: JSON.stringify({ brief: $('#copilot-brief').value }) }); draftTerms = result.terms; draftDirty = true; milestoneEditor(); showError(result.notice); } catch (error) { showError(error.message); } };
$('#add-milestone').onclick = () => { if (draftTerms.milestones.length < 3) { const previous = draftTerms.milestones.at(-1); draftTerms.milestones.push({ ...previous, title: 'Additional delivery', deadline: previous.deadline + 7 * 86_400 }); draftDirty = true; milestoneEditor(); } };
$('#milestone-editor').onclick = event => { const index = Number(event.target.dataset.removeMilestone); if (Number.isInteger(index)) { draftTerms.milestones.splice(index, 1); draftDirty = true; milestoneEditor(); } };
$('#draft-form').oninput = () => { draftDirty = true; updateDraftPreview(); };
$('#draft-form').onsubmit = async event => { event.preventDefault(); try { model = (await request('/api/agreement/draft', { method: 'PUT', body: JSON.stringify({ terms: termsFromForm() }) })).agreement; draftDirty = false; showError(); render(); } catch (error) { showError(error.message); } };
initializePrivy().catch(error => showError(error.message));
refresh();
