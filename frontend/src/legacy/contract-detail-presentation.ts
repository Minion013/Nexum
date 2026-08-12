// @ts-nocheck
const formatter = new Intl.DateTimeFormat('en-SG', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function date(value) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? 'To be confirmed' : formatter.format(parsed); }
function amount(value, token = 'MockEUSD') { return `${new Intl.NumberFormat('en-US').format(Number(value) || 0)} ${token}`; }
function stage(status) { return ({ active: { label: 'In progress', tone: 'active' }, complete: { label: 'Complete', tone: 'complete' }, negotiation: { label: 'Shared · awaiting acceptance', tone: 'review' } })[status] ?? { label: 'Contract update', tone: '' }; }
function milestoneStage(item, index, contractStatus) {
  if (contractStatus === 'complete') return 'complete';
  if (index === 0) return 'complete';
  if (index === 1) return 'review';
  return 'pending';
}

export function contractDetailPresentation(contract) {
  const scope = contract.sections?.scope ?? {};
  const payment = contract.sections?.payment ?? {};
  const milestones = (contract.sections?.milestones ?? []).map((item, index) => ({ ...item, number: index + 1, state: milestoneStage(item, index, contract.status) }));
  const current = milestones.find(item => item.state === 'review') ?? milestones.find(item => item.state === 'pending') ?? milestones.at(-1) ?? null;
  const next = milestones.find(item => item.state === 'pending') ?? null;
  const completed = milestones.filter(item => item.state === 'complete').length;
  const token = payment.settlementToken || 'MockEUSD';
  const total = Number(payment.totalAllocation) || milestones.reduce((sum, item) => sum + (Number(item.allocation) || 0), 0);
  const activity = Array.isArray(contract.activity) && contract.activity.length ? contract.activity : [
    { title: 'Contract Version shared with both Contract Parties', detail: `Version ${contract.versionNumber}`, at: scope.projectStartDateUtc },
    ...milestones.filter(item => item.state === 'complete').map(item => ({ title: `${item.title} marked complete`, detail: 'Milestone progress recorded in this Contract.', at: item.deliveryDeadlineUtc }))
  ];
  return {
    id: contract.id,
    title: scope.title || 'Untitled Contract',
    stage: stage(contract.status),
    meta: `${contract.counterparty || 'Counterparty'} · ${milestones.length} milestones · Started ${date(scope.projectStartDateUtc)}`,
    milestones,
    completed,
    activity,
    current,
    next,
    payment: { total: amount(total, token), progress: `${completed} of ${milestones.length} milestones complete`, percent: milestones.length ? Math.round((completed / milestones.length) * 100) : 0, label: contract.paymentAuthority === 'chain' ? 'Chain-authoritative settlement status' : 'Contract terms — settlement is not chain verified' },
    details: [{ label: 'Client', value: contract.counterparty || 'To be confirmed' }, { label: 'Started', value: date(scope.projectStartDateUtc) }, { label: 'Deadline', value: date(milestones.at(-1)?.deliveryDeadlineUtc) }, { label: 'Total', value: amount(total, token) }]
  };
}
