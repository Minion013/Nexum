// @ts-nocheck
import './app-shell';
import { authenticatedRequest } from './supabase-auth';
import { contractDetailPresentation } from './contract-detail-presentation';

let contractId = decodeURIComponent(window.location.pathname.split('/').at(-1));
const byId = id => document.querySelector(`#${id}`);
const panels = ['overview', 'deliverables'];
let presentation;

function text(id, value) { byId(id).textContent = value; }
function stage(className, label) { const node = document.createElement('span'); node.className = `contract-stage ${className}`; node.textContent = label; return node; }
function openTab(name) { panels.forEach(panel => { const selected = panel === name; byId(`tab-${panel}`).setAttribute('aria-selected', String(selected)); byId(`panel-${panel}`).hidden = !selected; }); }
function milestone(item) { const node = document.createElement('li'); node.className = `milestone-item ${item.state}`; const marker = document.createElement('span'); marker.className = 'milestone-marker'; marker.textContent = item.state === 'complete' ? '✓' : item.number; const copy = document.createElement('div'); copy.className = 'milestone-copy'; const title = document.createElement('div'); title.className = 'milestone-title'; const heading = document.createElement('strong'); heading.textContent = item.title; title.append(heading, stage(item.state === 'review' ? 'review' : item.state === 'complete' ? 'active' : '', item.state === 'review' ? 'Under review' : item.state === 'complete' ? 'Complete' : 'Upcoming')); const description = document.createElement('p'); description.textContent = item.deliveryOutcome; const facts = document.createElement('div'); facts.className = 'milestone-facts'; facts.innerHTML = `<span>Due ${new Intl.DateTimeFormat('en-SG', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(item.deliveryDeadlineUtc))}</span><strong>${new Intl.NumberFormat('en-US').format(Number(item.allocation) || 0)} MockEUSD</strong>`; copy.append(title, description, facts); node.append(marker, copy); return node; }
function activity(item) { const node = document.createElement('li'); node.textContent = item.title; const detail = document.createElement('small'); detail.textContent = `${item.detail} · ${new Intl.DateTimeFormat('en-SG', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(item.at))}`; node.append(detail); return node; }
function showDeliverables() { openTab('deliverables'); byId('panel-deliverables').scrollIntoView({ block: 'start', behavior: 'smooth' }); }
function render(detail) {
  presentation = contractDetailPresentation(detail);
  document.title = `${presentation.title} — PactFlow`;
  text('contract-title', presentation.title); const status = byId('contract-status'); status.className = `contract-stage ${presentation.stage.tone}`; status.textContent = presentation.stage.label; text('contract-meta', presentation.meta);
  text('milestone-progress', `${presentation.completed} of ${presentation.milestones.length} complete`); byId('milestone-list').replaceChildren(...presentation.milestones.map(milestone)); byId('activity-list').replaceChildren(...presentation.activity.map(activity));
  const current = presentation.current; text('deliverable-title', current?.title || 'No current deliverable'); text('deliverable-description', current?.evidenceRequirement || 'There are no delivery requirements to show.'); const requirements = byId('deliverable-requirements'); requirements.replaceChildren(...(current?.acceptanceCriteria ?? []).map(criterion => { const line = document.createElement('div'); line.className = 'requirement'; line.textContent = criterion.description; return line; })); const deliverableState = byId('deliverable-state'); deliverableState.className = `contract-stage ${current?.state === 'review' ? 'review' : ''}`; deliverableState.textContent = current?.state === 'review' ? 'Under review' : 'Ready for delivery';
  text('payment-total', presentation.payment.total); text('payment-label', presentation.payment.label); byId('payment-bar-value').style.width = `${presentation.payment.percent}%`; text('payment-progress', presentation.payment.progress);
  text('review-label', current?.state === 'review' ? 'Current milestone · under review' : 'Current milestone'); text('review-title', current?.title || 'No active milestone'); text('review-detail', current ? `Due ${new Intl.DateTimeFormat('en-SG', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(current.deliveryDeadlineUtc))}` : 'No milestone is currently scheduled.'); text('review-amount', current ? `${new Intl.NumberFormat('en-US').format(Number(current.allocation) || 0)} MockEUSD contract term` : '');
  text('next-title', presentation.next?.title || 'No future milestone'); text('next-detail', presentation.next ? `Due ${new Intl.DateTimeFormat('en-SG', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(presentation.next.deliveryDeadlineUtc))} · ${new Intl.NumberFormat('en-US').format(Number(presentation.next.allocation) || 0)} MockEUSD` : 'The final milestone is already in progress or complete.');
  const details = byId('project-details'); details.replaceChildren(...presentation.details.flatMap(item => { const term = document.createElement('dt'); term.textContent = item.label; const value = document.createElement('dd'); value.textContent = item.value; return [term, value]; }));
  byId('contract-loading').hidden = true; byId('contract-page').hidden = false;
}

panels.forEach(name => byId(`tab-${name}`).addEventListener('click', () => openTab(name)));
byId('review-action').addEventListener('click', showDeliverables); byId('next-action').addEventListener('click', showDeliverables);

(async () => { try { const { contract } = await authenticatedRequest(`/api/contracts/${encodeURIComponent(contractId)}/detail`); render(contract); } catch (error) { byId('contract-loading').hidden = true; byId('request-error').hidden = false; byId('request-error').textContent = error.message; } })();
