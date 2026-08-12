export type ContractStatus = 'private_draft' | 'negotiation' | 'active' | 'complete' | string;

export type ContractListItem = {
  id: string;
  title: string | null;
  status: ContractStatus;
  latestVersionNumber: number;
  counterparty: string | null;
  responsibility: 'Buyer' | 'Service Provider' | string;
  milestoneCount: number;
  nextMilestone?: { title: string; deadlineUtc: string };
  lastActivityAt: string | null;
};

export type PresentedContract = ContractListItem & {
  displayTitle: string;
  stage: string;
  statusTone: string;
  version: string;
  nextMilestoneLabel: string;
  lastActivityLabel: string;
  action: { href: string; label: string };
};

const statusPresentation: Record<string, { label: string; action: string }> = {
  private_draft: { label: 'Contract Draft', action: 'Continue draft' },
  negotiation: { label: 'Awaiting review', action: 'Review terms' },
  active: { label: 'In progress', action: 'Open Contract' },
  complete: { label: 'Complete', action: 'View details' }
};

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Date to be confirmed';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date to be confirmed';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
}

export function presentContract(contract: ContractListItem): PresentedContract {
  const presentation = statusPresentation[contract.status] ?? { label: 'Contract update', action: 'Open Contract' };
  const milestoneCount = Number.isInteger(contract.milestoneCount) ? contract.milestoneCount : 0;
  const milestoneLabel = `${milestoneCount} ${milestoneCount === 1 ? 'milestone' : 'milestones'}`;
  return {
    ...contract,
    displayTitle: contract.title?.trim() || 'Untitled Contract',
    counterparty: contract.counterparty?.trim() || 'Counterparty to be confirmed',
    stage: presentation.label,
    statusTone: contract.status === 'active' ? 'active' : contract.status === 'negotiation' ? 'attention' : '',
    version: Number.isInteger(contract.latestVersionNumber) ? `Version ${contract.latestVersionNumber}` : 'Version to be confirmed',
    nextMilestoneLabel: contract.nextMilestone?.title
      ? `${milestoneLabel} · Next ${contract.nextMilestone.title} · ${formatDate(contract.nextMilestone.deadlineUtc)}`
      : `${milestoneLabel} · No upcoming deadline`,
    lastActivityLabel: formatDate(contract.lastActivityAt),
    action: {
      href: contract.status === 'private_draft' ? `/contracts/${encodeURIComponent(contract.id)}/choose-person` : `/contracts/${encodeURIComponent(contract.id)}`,
      label: presentation.action
    }
  };
}

export function filterContracts(contracts: ContractListItem[], stage: string, responsibility: string): PresentedContract[] {
  return contracts
    .filter(contract => !stage || contract.status === stage)
    .filter(contract => !responsibility || contract.responsibility === responsibility)
    .map(presentContract);
}

export function emptyContractsMessage(hasFilters: boolean): string {
  return hasFilters ? 'No Contracts match these filters.' : 'No Contracts yet. Create a Contract when you are ready.';
}
