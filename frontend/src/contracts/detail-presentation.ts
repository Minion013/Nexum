export type ContractMilestone = {
  title?: string;
  deliveryOutcome?: string;
  allocation?: number;
  evidenceRequirement?: string;
  acceptanceCriteria?: Array<{ description?: string; required?: boolean }>;
  deliveryDeadlineUtc?: string;
  reviewWindowHours?: number;
};

export type ContractDetail = {
  id: string;
  status: string;
  versionNumber: number;
  counterparty: string;
  buyer: string;
  sections: {
    scope?: { title?: string; description?: string; projectStartDateUtc?: string; outcome?: string };
    milestones?: ContractMilestone[];
    payment?: { settlementToken?: string; totalAllocation?: number; network?: string; fundingDeadlineUtc?: string };
    evidence?: { reviewDecision?: string; dependencyAcknowledgementRequired?: boolean };
    changeControl?: { proposalProcess?: string; bilateralAmendmentOnly?: boolean };
  };
  paymentAuthority: string;
  activity?: Array<{ title?: string; detail?: string; at?: string }>;
};

export type ContractReview = {
  id: string;
  status: string;
  version: {
    id: string;
    number: number;
    hash?: string | null;
    acceptanceReadyAt?: string | null;
    authority?: { authority_name?: string; jurisdiction_label?: string; ruleset_version?: string };
    sections: Array<{ type: string; terms: Record<string, unknown> }>;
  };
  parties: Array<{ id: string; label: string; acceptedAt?: string | null; walletAddress?: string | null }>;
  requiredSections: Array<{ type: string; complete: boolean }>;
  canAccept: boolean;
  paymentAuthority: string;
};

export type DetailMilestonePresentation = ContractMilestone & {
  number: number;
  state: 'complete' | 'active' | 'review' | 'pending' | 'awaiting-acceptance';
};

export type ContractDetailPresentation = {
  title: string;
  stage: { label: string; tone: string };
  meta: string;
  milestones: DetailMilestonePresentation[];
  activity: Array<{ title?: string; detail?: string; at?: string }>;
  completed: number;
  current: DetailMilestonePresentation | null;
  next: DetailMilestonePresentation | null;
  payment: { total: string; label: string; progress: string; percent: number };
};

const dateFormatter = new Intl.DateTimeFormat('en-SG', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const numberFormatter = new Intl.NumberFormat('en-US');

function date(value: unknown): string {
  if (typeof value !== 'string') return 'To be confirmed';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'To be confirmed' : dateFormatter.format(parsed);
}

function amount(value: unknown, token: string): string {
  const numericValue = Number(value);
  return `${numberFormatter.format(Number.isFinite(numericValue) ? numericValue : 0)} ${token}`;
}

function stage(status: string): { label: string; tone: string } {
  return ({
    private_draft: { label: 'Private draft', tone: '' },
    negotiation: { label: 'Shared · awaiting acceptance', tone: 'review' },
    active: { label: 'In progress', tone: 'active' },
    complete: { label: 'Complete', tone: 'complete' }
  } as Record<string, { label: string; tone: string }>)[status] ?? { label: 'Contract update', tone: '' };
}

function milestoneState(status: string, index: number, hasActivity: boolean): DetailMilestonePresentation['state'] {
  if (status === 'complete') return 'complete';
  if (status === 'negotiation' || status === 'private_draft') return 'awaiting-acceptance';
  if (status === 'active' && hasActivity) return index === 0 ? 'complete' : index === 1 ? 'review' : 'pending';
  return index === 0 ? 'active' : 'pending';
}

export function contractDetailPresentation(contract: ContractDetail): ContractDetailPresentation {
  const scope = contract.sections.scope ?? {};
  const payment = contract.sections.payment ?? {};
  const rawMilestones = Array.isArray(contract.sections.milestones) ? contract.sections.milestones : [];
  const milestones = rawMilestones.map((item, index) => ({ ...item, number: index + 1, state: milestoneState(contract.status, index, Boolean(contract.activity?.length)) }));
  const completed = milestones.filter(item => item.state === 'complete').length;
  const current = milestones.find(item => item.state === 'review') ?? milestones.find(item => item.state === 'active') ?? milestones.find(item => item.state === 'pending') ?? null;
  const next = milestones.find(item => item.state === 'pending' && item !== current) ?? null;
  const token = typeof payment.settlementToken === 'string' && payment.settlementToken.trim() ? payment.settlementToken : 'MockEUSD';
  const total = Number(payment.totalAllocation) || rawMilestones.reduce((sum, item) => sum + (Number(item.allocation) || 0), 0);
  return {
    title: typeof scope.title === 'string' && scope.title.trim() ? scope.title : 'Untitled Contract',
    stage: stage(contract.status),
    meta: `${contract.counterparty || 'Counterparty'} · ${milestones.length} milestone${milestones.length === 1 ? '' : 's'} · Started ${date(scope.projectStartDateUtc)}`,
    milestones,
    activity: contract.activity ?? [],
    completed,
    current,
    next,
    payment: {
      total: amount(total, token),
      label: contract.paymentAuthority === 'chain' ? 'Chain-authoritative settlement status' : 'Contract terms · settlement is not chain verified',
      progress: contract.status === 'complete' ? `${completed} of ${milestones.length} milestones complete` : 'No payment has been verified from this page',
      percent: milestones.length && contract.status === 'complete' ? 100 : 0
    }
  };
}

export function sectionLabel(type: string): string {
  return type.replaceAll('_', ' ').replace(/\b\w/g, character => character.toUpperCase());
}

export function formatReviewTerm(value: unknown): string {
  if (typeof value === 'string') return value || 'Not specified';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(item => formatReviewTerm(item)).join(', ') || 'Not specified';
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.length ? entries.map(([key, item]) => `${sectionLabel(key)}: ${formatReviewTerm(item)}`).join(' · ') : 'Not specified';
  }
  return 'Not specified';
}
