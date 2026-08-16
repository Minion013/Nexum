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
  reviewWindow: { submittedAt: string; expiresAt: string; state: 'open' | 'expired' } | null;
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

export function milestoneReviewPresentation(review: MilestoneReview, now = new Date()) {
  const submitted = review.evidence.length > 0;
  const reviewExpired = review.reviewWindow?.state === 'expired' || (review.reviewWindow ? Date.parse(review.reviewWindow.expiresAt) <= now.getTime() : false);
  const criteria = (review.criteria || review.milestone.acceptanceCriteria || []).map((criterion, index) => ({ id: criterion.id ?? index + 1, description: criterion.description || 'Acceptance Criterion', required: criterion.required !== false, checked: criterion.checked === true }));
  const decisionState = review.decisionState || {};
  return {
    title: review.milestone.title || `Milestone ${review.milestone.number}`,
    responsibility: review.responsibility,
    status: { label: decisionState.accepted ? 'Accepted' : decisionState.disputeOpen ? 'Dispute open' : submitted ? 'Evidence submitted' : 'Awaiting evidence', tone: decisionState.accepted || decisionState.disputeOpen ? 'complete' : submitted ? 'review' : 'active' },
    tabs: [{ id: 'evidence', label: 'Evidence' }, { id: 'criteria', label: 'Criteria' }, { id: 'activity', label: 'Activity' }],
    canSubmitEvidence: review.canSubmitEvidence,
    evidenceRequirement: review.milestone.evidenceRequirement || 'The Contract Version does not include an evidence requirement.',
    deliveryOutcome: review.milestone.deliveryOutcome || 'The agreed milestone outcome is recorded in the Contract Version.',
    deliveryDeadline: date(review.milestone.deliveryDeadlineUtc),
    reviewWindow: review.reviewWindow ? { label: reviewExpired ? 'Review window expired' : 'Review window open', detail: `${date(review.reviewWindow.submittedAt)} → ${date(review.reviewWindow.expiresAt)}` } : { label: 'Not started', detail: `The Buyer review window begins after evidence submission (${review.milestone.reviewWindowHours ?? 'specified'} hours).` },
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
    canCheckCriteria: review.canCheckCriteria === true,
    canAccept: review.canAccept === true,
    canRequestRevision: review.canRequestRevision === true,
    canRaiseDispute: review.canRaiseDispute === true,
    canRelease: review.canRelease === true,
    paymentBoundary: 'This Milestone Review records private evidence and activity. It does not move funds or represent secured payment.'
  };
}
