export type ContractStatus = 'private_draft' | 'negotiation' | 'active' | 'complete' | string;

export type HomeContract = {
  id: string;
  title: string | null;
  status: ContractStatus;
  latestVersionNumber: number;
  counterparty: string;
  responsibility: string;
  milestoneCount: number;
  nextMilestone?: { title: string; deadlineUtc: string };
  lastActivityAt?: string;
};

export type HomeData = { contracts: HomeContract[] };
export type DashboardAction = { contractId: string; title: string; detail: string; href: string; label: string };
export type DashboardTimelineItem = { contractId: string; title: string; detail: string; href: string; state: 'active' };
export type DashboardContract = HomeContract & { title: string; stage: string; href: string };
export type DashboardPresentation = {
  state: 'empty' | 'attention' | 'populated';
  headline: string;
  description: string;
  primaryAction: { href: string; label: string };
  metrics: { attention: number; active: number; complete: number };
  actions: DashboardAction[];
  timeline: DashboardTimelineItem[];
  contracts: DashboardContract[];
};

const statusLabels: Record<string, string> = { private_draft: 'Contract Draft', negotiation: 'Awaiting review', active: 'In progress', complete: 'Complete' };

export function dashboardStatusClass(status: ContractStatus): string {
  return status === 'active' ? 'active' : status === 'negotiation' ? 'attention' : '';
}

function titleFor(contract: HomeContract): string { return contract.title?.trim() || 'Untitled Contract'; }
function hrefFor(contract: HomeContract): string { return contract.status === 'private_draft' ? `/contracts/${encodeURIComponent(contract.id)}/choose-person` : `/contracts/${encodeURIComponent(contract.id)}`; }

export function dashboardDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date to be confirmed';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
}

function attentionAction(contract: HomeContract): DashboardAction | null {
  const title = titleFor(contract);
  if (contract.status === 'private_draft') return { contractId: contract.id, title: 'Continue Contract Draft', detail: `${title} is private until you share it with ${contract.counterparty}.`, href: hrefFor(contract), label: 'Continue' };
  if (contract.status === 'negotiation') return { contractId: contract.id, title: 'Review Contract terms', detail: `${title} is awaiting your review with ${contract.counterparty}.`, href: hrefFor(contract), label: 'Review' };
  return null;
}

export function dashboardPresentation(home: HomeData): DashboardPresentation {
  const contracts = Array.isArray(home.contracts) ? home.contracts : [];
  if (!contracts.length) return { state: 'empty', headline: 'Start your first Contract.', description: 'Create a Contract Draft, then share it with the other Contract Party when it is ready for review.', primaryAction: { href: '/contracts#new-contract', label: 'Create Contract' }, metrics: { attention: 0, active: 0, complete: 0 }, actions: [], timeline: [], contracts: [] };
  const actions = contracts.map(attentionAction).filter((action): action is DashboardAction => Boolean(action));
  const timeline = contracts
    .filter(contract => contract.status === 'active' && contract.nextMilestone?.deadlineUtc)
    .sort((left, right) => Date.parse(left.nextMilestone!.deadlineUtc) - Date.parse(right.nextMilestone!.deadlineUtc))
    .map(contract => ({ contractId: contract.id, title: contract.nextMilestone!.title, detail: `${titleFor(contract)} · Due ${dashboardDate(contract.nextMilestone!.deadlineUtc)}`, href: `/contracts/${encodeURIComponent(contract.id)}`, state: 'active' as const }));
  return {
    state: actions.length ? 'attention' : 'populated',
    headline: actions.length ? 'Your next Contract action is ready.' : 'Your Contract work is on track.',
    description: actions.length ? 'Review the work that needs your decision, then keep the next milestone moving.' : 'See the Contracts and milestones that are currently in motion.',
    primaryAction: { href: '/contracts', label: 'View Contracts' },
    metrics: { attention: actions.length, active: contracts.filter(contract => contract.status === 'active').length, complete: contracts.filter(contract => contract.status === 'complete').length },
    actions,
    timeline,
    contracts: contracts.map(contract => ({ ...contract, title: titleFor(contract), stage: statusLabels[contract.status] ?? 'Contract update', href: hrefFor(contract) }))
  };
}
