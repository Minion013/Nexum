export type PartyReference = 'initiating_party' | 'counterparty';

export type AcceptanceCriterion = { description: string; required: boolean };

export type DraftMilestone = {
  title: string;
  deliveryOutcome: string;
  allocation: number;
  evidenceRequirement: string;
  acceptanceCriteria: AcceptanceCriterion[];
  deliveryDeadlineUtc: string;
  reviewWindowHours: 24 | 72 | 168;
};

export type EditableContractDraft = {
  authorityId: string;
  parties: {
    buyer: { partyRef: PartyReference; responsibility: string };
    serviceProvider: { partyRef: PartyReference; responsibility: string };
    counterparty_email?: string | null;
    initiator_responsibility?: 'buyer' | 'service_provider';
  };
  scope: {
    title: string;
    description: string;
    outcome: string;
    includedDeliverables: string[];
    excludedWork: string[];
    projectStartDateUtc: string;
    clientDependencies: string[];
  };
  milestones: DraftMilestone[];
  payment: {
    settlementToken: string;
    network: 'Base Sepolia';
    totalAllocation: number;
    fundingDeadlineUtc: string;
    successFeeBps: number;
    feeRecipient: string;
  };
  evidence: { reviewDecision: string; dependencyAcknowledgementRequired: boolean };
  intellectualProperty: {
    outcome: 'client_owns_project_deliverables_on_final_settlement' | 'provider_retains_ownership_with_client_license';
    licenseScope: string;
    confidentiality: 'not_requested' | 'mutual_confidentiality';
    confidentialityDuration: string;
  };
  changeControl: { proposalProcess: string; bilateralAmendmentOnly: boolean };
  notices: { buyerContact: string; serviceProviderContact: string; exactVersionAcknowledgement: boolean };
};

export type ContractDraftResponse = {
  id: string;
  status: string;
  versionNumber: number;
  sections: {
    parties?: Partial<EditableContractDraft['parties']> & Record<string, unknown>;
    scope?: Partial<EditableContractDraft['scope']>;
    milestones?: DraftMilestone[];
    payment?: Partial<EditableContractDraft['payment']>;
    evidence?: Partial<EditableContractDraft['evidence']>;
    intellectualProperty?: Partial<EditableContractDraft['intellectualProperty']>;
    changeControl?: Partial<EditableContractDraft['changeControl']>;
    notices?: Partial<EditableContractDraft['notices']>;
  };
  authority?: { id?: string | null; name?: string; jurisdictionLabel?: string; rulesetVersion?: string };
  authorities?: Array<{ id: string; name: string; jurisdictionLabel: string; rulesetVersion: string }>;
  paymentAuthority?: string;
  shareReady?: boolean;
};

export type DraftIssue = { sectionType?: string; fieldPath?: string; code?: string; message: string };

const localAuthorityId = '00000000-0000-4000-8000-000000000201';

function futureUtc(daysFromNow: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  date.setUTCHours(9, 0, 0, 0);
  return date.toISOString();
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function list(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) && value.length ? value.map(item => text(item, '')).filter(Boolean) : fallback;
}

function partyReference(value: unknown, fallback: PartyReference): PartyReference {
  return value === 'initiating_party' || value === 'counterparty' ? value : fallback;
}

function reviewWindow(value: unknown): 24 | 72 | 168 {
  return value === 24 || value === 168 ? value : 72;
}

function positiveNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

function milestoneDefaults(totalAllocation: number): DraftMilestone[] {
  const firstAllocation = Math.floor(totalAllocation / 2);
  return [
    {
      title: 'Discovery',
      deliveryOutcome: 'Document the findings that shape the agreed work.',
      allocation: firstAllocation,
      evidenceRequirement: 'A private summary of the completed discovery work.',
      acceptanceCriteria: [{ description: 'The documented findings address the agreed scope.', required: true }],
      deliveryDeadlineUtc: futureUtc(14),
      reviewWindowHours: 72
    },
    {
      title: 'Delivery',
      deliveryOutcome: 'Deliver the agreed outcome with a documented handoff.',
      allocation: totalAllocation - firstAllocation,
      evidenceRequirement: 'A private delivery summary and handoff record without credentials or secrets.',
      acceptanceCriteria: [{ description: 'The agreed delivery and handoff are complete.', required: true }],
      deliveryDeadlineUtc: futureUtc(28),
      reviewWindowHours: 72
    }
  ];
}

export function editableDraftFromContract(contract: ContractDraftResponse, profileEmail = ''): EditableContractDraft {
  const sections = contract.sections ?? {};
  const rawParties = sections.parties ?? {};
  const initiatorResponsibility = rawParties.initiator_responsibility === 'service_provider' || rawParties.initiatorResponsibility === 'service_provider' ? 'service_provider' : 'buyer';
  const totalAllocation = positiveNumber(sections.payment?.totalAllocation, 1000);
  const defaults = milestoneDefaults(totalAllocation);
  const rawMilestones = Array.isArray(sections.milestones) && sections.milestones.length >= 2 ? sections.milestones : defaults;
  const milestones = rawMilestones.slice(0, 3).map((milestone, index) => ({
    title: text(milestone?.title, defaults[index]?.title ?? `Milestone ${index + 1}`),
    deliveryOutcome: text(milestone?.deliveryOutcome, defaults[index]?.deliveryOutcome ?? 'Deliver the agreed outcome.'),
    allocation: positiveNumber(milestone?.allocation, defaults[index]?.allocation ?? 1),
    evidenceRequirement: text(milestone?.evidenceRequirement, defaults[index]?.evidenceRequirement ?? 'A private delivery record.'),
    acceptanceCriteria: Array.isArray(milestone?.acceptanceCriteria) && milestone.acceptanceCriteria.length
      ? milestone.acceptanceCriteria.map(criterion => ({ description: text(criterion?.description, 'The agreed outcome is complete.'), required: criterion?.required !== false }))
      : defaults[index]?.acceptanceCriteria ?? [{ description: 'The agreed outcome is complete.', required: true }],
    deliveryDeadlineUtc: text(milestone?.deliveryDeadlineUtc, defaults[index]?.deliveryDeadlineUtc ?? futureUtc(14 + index * 14)),
    reviewWindowHours: reviewWindow(milestone?.reviewWindowHours)
  }));
  const counterpartyEmail = text(rawParties.counterparty_email ?? rawParties.counterpartyEmail, '');
  const buyerContact = text(sections.notices?.buyerContact, profileEmail || 'buyer@example.com');
  const serviceProviderContact = text(sections.notices?.serviceProviderContact, counterpartyEmail || 'provider@example.com');
  const resolvedAuthorityId = contract.authority?.id || contract.authorities?.[0]?.id || localAuthorityId;

  return {
    authorityId: resolvedAuthorityId,
    parties: {
      buyer: {
        partyRef: partyReference(rawParties.buyer?.partyRef, initiatorResponsibility === 'buyer' ? 'initiating_party' : 'counterparty'),
        responsibility: text(rawParties.buyer?.responsibility, 'Funds the agreed gross allocation.')
      },
      serviceProvider: {
        partyRef: partyReference(rawParties.serviceProvider?.partyRef, initiatorResponsibility === 'service_provider' ? 'initiating_party' : 'counterparty'),
        responsibility: text(rawParties.serviceProvider?.responsibility, 'Delivers the agreed service outcomes.')
      },
      ...(counterpartyEmail ? { counterparty_email: counterpartyEmail } : {}),
      initiator_responsibility: initiatorResponsibility
    },
    scope: {
      title: text(sections.scope?.title, 'Untitled Contract Draft'),
      description: text(sections.scope?.description, 'Describe the work the Contract Parties are agreeing to complete.'),
      outcome: text(sections.scope?.outcome, 'A documented delivery that meets the agreed scope.'),
      includedDeliverables: list(sections.scope?.includedDeliverables, ['Agreed project deliverables']),
      excludedWork: list(sections.scope?.excludedWork, ['Ongoing work outside the agreed milestones']),
      projectStartDateUtc: text(sections.scope?.projectStartDateUtc, futureUtc(1)),
      clientDependencies: list(sections.scope?.clientDependencies, ['Timely access to the materials needed for the agreed scope'])
    },
    milestones,
    payment: {
      settlementToken: text(sections.payment?.settlementToken, 'eUSD testnet demonstration token'),
      network: 'Base Sepolia',
      totalAllocation,
      fundingDeadlineUtc: text(sections.payment?.fundingDeadlineUtc, futureUtc(7)),
      successFeeBps: Number.isSafeInteger(Number(sections.payment?.successFeeBps)) ? Number(sections.payment?.successFeeBps) : 0,
      feeRecipient: text(sections.payment?.feeRecipient, '')
    },
    evidence: {
      reviewDecision: text(sections.evidence?.reviewDecision, 'Buyer records acceptance or a specific change request within the review window.'),
      dependencyAcknowledgementRequired: sections.evidence?.dependencyAcknowledgementRequired === true
    },
    intellectualProperty: {
      outcome: sections.intellectualProperty?.outcome === 'client_owns_project_deliverables_on_final_settlement' ? 'client_owns_project_deliverables_on_final_settlement' : 'provider_retains_ownership_with_client_license',
      licenseScope: text(sections.intellectualProperty?.licenseScope, 'Project delivery use'),
      confidentiality: sections.intellectualProperty?.confidentiality === 'not_requested' ? 'not_requested' : 'mutual_confidentiality',
      confidentialityDuration: text(sections.intellectualProperty?.confidentialityDuration, 'Two years')
    },
    changeControl: {
      proposalProcess: text(sections.changeControl?.proposalProcess, 'Either Contract Party may propose a written change request.'),
      bilateralAmendmentOnly: sections.changeControl?.bilateralAmendmentOnly !== false
    },
    notices: {
      buyerContact,
      serviceProviderContact,
      exactVersionAcknowledgement: sections.notices?.exactVersionAcknowledgement !== false
    }
  };
}

export function localDateTimeValue(utc: string): string {
  if (!utc) return '';
  const date = new Date(utc);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function utcFromLocalDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function linesToList(value: string): string[] {
  return value.split('\n').map(item => item.trim()).filter(Boolean);
}

export function listToLines(value: string[]): string {
  return value.join('\n');
}
