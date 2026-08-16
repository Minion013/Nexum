export type MilestoneEvidence = {
  id: string;
  milestoneKey?: string;
  submittedByProfileId?: string;
  submittedAt?: string;
  resource: { name?: string; kind?: string; mediaType?: string; sizeBytes?: number; protectedLocator?: string };
  integrityReference?: string | null;
};

export type MilestoneReview = {
  id: string;
  status: string;
  version: { id: string; number: number };
  milestone: {
    key: string;
    number: number;
    title?: string;
    deliveryOutcome?: string;
    evidenceRequirement?: string;
    acceptanceCriteria?: Array<{ id?: number; description?: string; required?: boolean; checked?: boolean }>;
    deliveryDeadlineUtc?: string;
    reviewWindowHours?: number;
  };
  responsibility: 'Buyer' | 'Service Provider' | string;
  canSubmitEvidence: boolean;
  evidence: MilestoneEvidence[];
  activity: Array<{ id: string | number; type?: string; occurredAt?: string; detail?: string | null }>;
  criteria?: Array<{ id: number; description?: string; required?: boolean; checked?: boolean }>;
  reviewWindow: { submittedAt: string; expiresAt: string; state: 'open' | 'expired'; durationHours?: number } | null;
  releaseEligible?: boolean;
  settlement?: {
    status: 'proposed' | 'not_available' | 'secured' | 'paid' | 'released';
    source: 'draft_contract_version' | 'accepted_contract_version' | 'chain';
    chainAuthoritative: boolean;
    proposedAllocation?: number;
    proposedToken?: string;
    vaultAddress?: string;
    securedAmount?: number | string;
    paidAmount?: number | string;
    releasedAmount?: number | string;
    detail: string;
  };
  decisionState?: { accepted?: boolean; revisionRequested?: boolean; disputeOpen?: boolean };
  canCheckCriteria?: boolean;
  canAccept?: boolean;
  canRequestRevision?: boolean;
  canRaiseDispute?: boolean;
  canRelease?: boolean;
};

const dateFormatter = new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
const numberFormatter = new Intl.NumberFormat('en-US');

function date(value: unknown): string {
  if (typeof value !== 'string') return 'Not recorded';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not recorded' : `${dateFormatter.format(parsed)} UTC`;
}

function size(value: unknown): string {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 1) return 'Size not recorded';
  if (bytes < 1_000) return `${numberFormatter.format(bytes)} bytes`;
  if (bytes < 1_000_000) return `${numberFormatter.format(Math.round(bytes / 1_000))} KB`;
  return `${numberFormatter.format(Math.round(bytes / 1_000_000))} MB`;
}

function eventLabel(type: string | undefined): string {
  return (type || 'activity').replaceAll('_', ' ').replace(/\b\w/g, character => character.toUpperCase());
}

function formatDuration(milliseconds: number): string {
  const totalMinutes = Math.max(1, Math.ceil(milliseconds / 60_000));
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h`;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function formatCountdown(expiresAt: string, now: Date): string {
  const expiry = Date.parse(expiresAt);
  if (!Number.isFinite(expiry)) return 'Countdown unavailable';
  return expiry > now.getTime() ? `${formatDuration(expiry - now.getTime())} remaining` : `Expired ${formatDuration(now.getTime() - expiry)} ago`;
}

function settlementLabel(status: string): string {
  return {
    proposed: 'Proposed Contract terms',
    not_available: 'Chain state unavailable',
    secured: 'Secured in Contract Escrow Vault',
    paid: 'Paid from Contract Escrow Vault',
    released: 'Released from Contract Escrow Vault'
  }[status] || 'Settlement state unavailable';
}

function formatTokenAmount(value: number | string | undefined, token: string | undefined): string | null {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  const formatted = Number.isFinite(numeric) ? numberFormatter.format(numeric) : String(value);
  return token ? `${formatted} ${token}` : formatted;
}

export function milestoneReviewPresentation(review: MilestoneReview, now = new Date()) {
  const submitted = review.evidence.length > 0;
  const reviewExpired = review.reviewWindow?.state === 'expired' || (review.reviewWindow ? Date.parse(review.reviewWindow.expiresAt) <= now.getTime() : false);
  const criteria = (review.criteria || review.milestone.acceptanceCriteria || []).map((criterion, index) => ({ id: criterion.id ?? index + 1, description: criterion.description || 'Acceptance Criterion', required: criterion.required !== false, checked: criterion.checked === true }));
  const decisionState = review.decisionState || {};
  const settlement = review.settlement || { status: 'proposed', source: 'draft_contract_version', chainAuthoritative: false, detail: 'This is a proposed Contract term only; it is not secured, paid, released, or personal wallet funds.' };
  const proposedAllocation = formatTokenAmount(settlement.proposedAllocation, settlement.proposedToken);
  const authoritativeValues = settlement.chainAuthoritative ? [
    ['Secured', formatTokenAmount(settlement.securedAmount, settlement.proposedToken)],
    ['Paid', formatTokenAmount(settlement.paidAmount, settlement.proposedToken)],
    ['Released', formatTokenAmount(settlement.releasedAmount, settlement.proposedToken)]
  ].filter((entry): entry is [string, string] => Boolean(entry[1])).map(([label, value]) => ({ label, value })) : [];
  const releaseEligible = review.releaseEligible === true || reviewExpired;
  const canAccept = review.canAccept === true && !reviewExpired;
  return {
    title: review.milestone.title || `Milestone ${review.milestone.number}`,
    responsibility: review.responsibility,
    status: { label: decisionState.accepted ? 'Accepted' : decisionState.disputeOpen ? 'Dispute open' : submitted ? 'Evidence submitted' : 'Awaiting evidence', tone: decisionState.accepted || decisionState.disputeOpen ? 'complete' : submitted ? 'review' : 'active' },
    tabs: [{ id: 'evidence', label: 'Evidence' }, { id: 'criteria', label: 'Criteria' }, { id: 'activity', label: 'Activity' }],
    canSubmitEvidence: review.canSubmitEvidence,
    evidenceRequirement: review.milestone.evidenceRequirement || 'The Contract Version does not include an evidence requirement.',
    deliveryOutcome: review.milestone.deliveryOutcome || 'The agreed milestone outcome is recorded in the Contract Version.',
    deliveryDeadline: date(review.milestone.deliveryDeadlineUtc),
    reviewWindow: review.reviewWindow ? { label: reviewExpired ? 'Release eligible' : 'Review window open', detail: `${date(review.reviewWindow.submittedAt)} → ${date(review.reviewWindow.expiresAt)}`, countdown: formatCountdown(review.reviewWindow.expiresAt, now), durationHours: review.reviewWindow.durationHours ?? review.milestone.reviewWindowHours ?? null } : { label: 'Not started', detail: `The Buyer review window begins after evidence submission (${review.milestone.reviewWindowHours ?? 'specified'} hours).`, countdown: 'Starts after evidence submission', durationHours: review.milestone.reviewWindowHours ?? null },
    evidence: review.evidence.map(item => ({
      id: item.id,
      resourceLabel: item.resource.name || 'Protected resource',
      metadata: `${item.resource.kind || 'resource'} · ${item.resource.mediaType || 'type not recorded'} · ${size(item.resource.sizeBytes)}`,
      protectedReference: 'Protected resource reference',
      integrityReference: item.integrityReference || 'No integrity reference recorded',
      submittedBy: item.submittedByProfileId || 'Contract Party',
      submittedAt: date(item.submittedAt)
    })),
    activity: [...review.activity].sort((left, right) => Date.parse(left.occurredAt || '') - Date.parse(right.occurredAt || '')).map(item => ({ id: item.id, label: eventLabel(item.type), detail: item.detail || 'Contract-relevant activity was recorded.', occurredAt: date(item.occurredAt) })),
    criteria,
    releaseEligibility: { label: releaseEligible ? 'Release eligible' : 'Not yet release eligible', detail: releaseEligible ? 'The review window has expired. Any supported release remains a participant-triggered settlement action; NEXUM has not scheduled or initiated a payment.' : 'Release eligibility begins only after the evidence-based review window expires.' },
    acceptanceHint: reviewExpired ? 'The review window has expired. Acceptance is closed; release eligibility is shown without a payment action.' : canAccept ? 'Every required criterion is complete and the review window is open.' : 'Complete every required criterion before accepting.',
    settlement: { ...settlement, label: settlementLabel(settlement.status), proposedTerms: proposedAllocation ? `Proposed allocation: ${proposedAllocation}` : 'No proposed allocation is recorded.', authoritativeValues, vaultAddress: settlement.chainAuthoritative ? settlement.vaultAddress || null : null },
    canCheckCriteria: review.canCheckCriteria === true,
    canAccept,
    canRequestRevision: review.canRequestRevision === true,
    canRaiseDispute: review.canRaiseDispute === true,
    canRelease: review.canRelease === true,
    paymentBoundary: settlement.chainAuthoritative ? 'Secured, paid, or released values are shown only from an approved Contract Version and chain-authoritative Contract Escrow Vault state.' : settlement.status === 'proposed' ? 'The proposed allocation is Contract Draft/Version context only. It is not secured, paid, released, or personal wallet funds, and this review does not move funds.' : 'The approved Contract Version is present, but no chain-authoritative Contract Escrow Vault value is available; this review does not move funds.'
  };
}
