// @ts-nocheck
import './app-shell';
import { authenticatedRequest } from './supabase-auth';
import { dashboardPresentation } from './dashboard-presentation';

const error = document.querySelector('#request-error');
const subtitle = document.querySelector('#dashboard-subtitle');
const actionList = document.querySelector('#action-list');
const timeline = document.querySelector('#timeline');
const contractList = document.querySelector('#contract-list');
const primaryAction = document.querySelector('#dashboard-primary-action');
const count = name => document.querySelector(`#${name}-count`);
function element(tag, text, className) { const item = document.createElement(tag); if (text) item.textContent = text; if (className) item.className = className; return item; }
function link(href, text, className = 'button') { const item = element('a', text, className); item.href = href; return item; }
function emptyMessage(message, href, label) { const wrapper = element('div', null, 'dashboard-empty'); wrapper.append(element('p', message), link(href, label, 'button primary')); return wrapper; }
function actionItem(action) { const item = element('article', null, 'dashboard-item'); const copy = element('div'); copy.append(element('strong', action.title), element('p', action.detail)); item.append(copy, link(action.href, action.label)); return item; }
function timelineItem(milestone) { const item = element('article', null, 'dashboard-item'); const copy = element('div'); copy.append(element('strong', milestone.title), element('p', milestone.detail)); item.append(copy, link(milestone.href, milestone.state === 'attention' ? 'Review date' : 'Open Contract')); return item; }
function contractItem(contract) {
  const item = element('article', null, 'dashboard-contract'); const copy = element('div'); copy.append(element('p', `Version ${contract.latestVersionNumber} · ${contract.responsibility}`, 'dashboard-card-eyebrow'), element('h3', contract.title), element('p', `With ${contract.counterparty}`));
  const right = element('div', null, 'dashboard-contract-action'); right.append(element('span', contract.stage, `status ${contract.status === 'active' ? 'active' : contract.status === 'negotiation' ? 'attention' : ''}`), link(contract.href, contract.status === 'private_draft' ? 'Continue' : 'Open')); item.append(copy, right); return item;
}
function render(presentation) {
  document.body.dataset.dashboardState = presentation.state; subtitle.textContent = presentation.description; primaryAction.href = presentation.primaryAction.href; primaryAction.textContent = presentation.primaryAction.label;
  count('attention').textContent = String(presentation.metrics.attention); count('active').textContent = String(presentation.metrics.active); count('complete').textContent = String(presentation.metrics.complete);
  actionList.replaceChildren(...(presentation.actions.length ? presentation.actions.map(actionItem) : [emptyMessage('No Contract decisions need you right now.', '/contracts#new-contract', 'Create Contract')]));
  timeline.replaceChildren(...(presentation.timeline.length ? presentation.timeline.map(timelineItem) : [emptyMessage('No upcoming milestones are scheduled yet.', '/contracts', 'View Contracts')]));
  contractList.replaceChildren(...presentation.contracts.map(contractItem)); document.querySelector('#dashboard-contracts').hidden = presentation.contracts.length === 0;
}
async function mountDashboard() {
  try { const { home } = await authenticatedRequest('/api/home'); render(dashboardPresentation(home)); }
  catch (requestError) { error.hidden = false; error.textContent = requestError.message; subtitle.textContent = 'Your Dashboard could not be loaded. Check your sign-in, then try again.'; actionList.replaceChildren(emptyMessage('Reconnect to load your Contract actions.', '/contracts', 'Open Contracts')); timeline.replaceChildren(emptyMessage('Milestone dates are unavailable until the Dashboard reconnects.', '/contracts', 'Open Contracts')); }
  finally { actionList.setAttribute('aria-busy', 'false'); timeline.setAttribute('aria-busy', 'false'); }
}
mountDashboard();
