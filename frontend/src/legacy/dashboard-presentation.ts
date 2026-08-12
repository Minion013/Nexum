// @ts-nocheck
const contractStatusPresentation = Object.freeze({
  private_draft: { label: 'Contract Draft', attention: { title: 'Continue Contract Draft', detail: (title, counterparty) => `${title} is private until you share it with ${counterparty}.`, label: 'Continue' } },
  negotiation: { label: 'Awaiting review', attention: { title: 'Review Contract terms', detail: (title, counterparty) => `${title} is awaiting your review with ${counterparty}.`, label: 'Review' } },
  active: { label: 'In progress' },
  complete: { label: 'Complete' }
});

export function statusLabel(status) {
  return contractStatusPresentation[status]?.label ?? 'Contract update';
}

export function dashboardDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date to be confirmed';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
}

function contractTitle(contract) { return contract.title || 'Untitled Contract'; }
function contractHref(contract) { return contract.status === 'private_draft' ? `/contracts/${encodeURIComponent(contract.id)}/choose-person` : `/contracts/${encodeURIComponent(contract.id)}`; }

function attentionAction(contract) {
  const title = contractTitle(contract);
  const attention = contractStatusPresentation[contract.status]?.attention;
  return attention && { contractId: contract.id, title: attention.title, detail: attention.detail(title, contract.counterparty), href: contractHref(contract), label: attention.label };
}

export function dashboardPresentation(home) {
  const contracts = Array.isArray(home?.contracts) ? home.contracts : [];
  if (!contracts.length) return { state: 'empty', headline: 'Start your first Contract.', description: 'Create a Contract Draft, then share it with the other Contract Party when it is ready for review.', primaryAction: { href: '/contracts#new-contract', label: 'Create Contract' }, metrics: { attention: 0, active: 0, complete: 0 }, actions: [], timeline: [], contracts: [] };
  const actions = contracts.map(attentionAction).filter(Boolean);
  const timeline = contracts.filter(contract => contract.status === 'active' && contract.nextMilestone?.deadlineUtc).sort((left, right) => Date.parse(left.nextMilestone.deadlineUtc) - Date.parse(right.nextMilestone.deadlineUtc)).map(contract => ({ contractId: contract.id, title: contract.nextMilestone.title, detail: `${contractTitle(contract)} · Due ${dashboardDate(contract.nextMilestone.deadlineUtc)}`, href: `/contracts/${encodeURIComponent(contract.id)}`, state: 'active' }));
  return { state: actions.length ? 'attention' : 'populated', headline: actions.length ? 'Your next Contract action is ready.' : 'Your Contract work is on track.', description: actions.length ? 'Review the work that needs your decision, then keep the next milestone moving.' : 'See the Contracts and milestones that are currently in motion.', primaryAction: { href: '/contracts', label: 'View Contracts' }, metrics: { attention: actions.length, active: contracts.filter(contract => contract.status === 'active').length, complete: contracts.filter(contract => contract.status === 'complete').length }, actions, timeline, contracts: contracts.map(contract => ({ ...contract, title: contractTitle(contract), stage: statusLabel(contract.status), href: contractHref(contract) })) };
}
