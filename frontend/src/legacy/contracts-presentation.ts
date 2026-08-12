// @ts-nocheck
const statusPresentation = Object.freeze({
  private_draft: { label: 'Contract Draft', action: 'Continue draft' },
  negotiation: { label: 'Awaiting review', action: 'Review terms' },
  active: { label: 'In progress', action: 'Open Contract' },
  complete: { label: 'Complete', action: 'View details' }
});

function contractTitle(contract) { return contract.title || 'Untitled Contract'; }

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date to be confirmed';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
}

function presentContract(contract) {
  const presentation = statusPresentation[contract.status] ?? { label: 'Contract update', action: 'Open Contract' };
  const milestoneCount = Number.isInteger(contract.milestoneCount) ? contract.milestoneCount : 0;
  const milestoneLabel = `${milestoneCount} ${milestoneCount === 1 ? 'milestone' : 'milestones'}`;
  return {
    id: contract.id,
    title: contractTitle(contract),
    counterparty: contract.counterparty || 'Counterparty to be confirmed',
    responsibility: contract.responsibility || 'Responsibility to be confirmed',
    stage: presentation.label,
    status: contract.status,
    statusTone: contract.status === 'active' ? 'active' : contract.status === 'negotiation' ? 'attention' : '',
    version: Number.isInteger(contract.latestVersionNumber) ? `Version ${contract.latestVersionNumber}` : 'Version to be confirmed',
    nextMilestone: contract.nextMilestone?.title ? `${milestoneLabel} · Next ${contract.nextMilestone.title} · ${formatDate(contract.nextMilestone.deadlineUtc)}` : `${milestoneLabel} · No upcoming deadline`,
    lastActivity: formatDate(contract.lastActivityAt),
    action: { href: contract.status === 'private_draft' ? `/contracts/${encodeURIComponent(contract.id)}/choose-person` : `/contracts/${encodeURIComponent(contract.id)}`, label: presentation.action }
  };
}

export function contractsPresentation(home, filters = {}) {
  const contracts = (Array.isArray(home?.contracts) ? home.contracts : [])
    .filter(contract => !filters.stage || contract.status === filters.stage)
    .filter(contract => !filters.responsibility || contract.responsibility === filters.responsibility)
    .map(presentContract);
  return {
    contracts,
    emptyMessage: contracts.length ? null : (filters.stage || filters.responsibility ? 'No Contracts match these filters.' : 'No Contracts yet. Create a Contract when you are ready.')
  };
}
