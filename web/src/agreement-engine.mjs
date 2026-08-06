import { createHash } from 'node:crypto';

export class RuleError extends Error {}

const terminal = new Set(['Released', 'Refunded', 'Split']);
const copy = value => structuredClone(value);
const changedFields = (before, after) => {
  const changes = [];
  for (const field of ['scope', 'feeBps', 'fundingDeadline']) {
    if (before[field] !== after[field]) changes.push({ field, before: String(before[field] ?? ''), after: String(after[field] ?? '') });
  }
  const milestoneFields = ['title', 'amount', 'deadline', 'reviewSeconds', 'evidenceRequirement'];
  for (let index = 0; index < Math.max(before.milestones.length, after.milestones.length); index += 1) {
    for (const field of milestoneFields) {
      if (before.milestones[index]?.[field] !== after.milestones[index]?.[field]) changes.push({ field: `Milestone ${index + 1}: ${field}`, before: String(before.milestones[index]?.[field] ?? ''), after: String(after.milestones[index]?.[field] ?? '') });
    }
  }
  return changes;
};

export class AgreementEngine {
  constructor(terms) {
    this.terms = this.#validateTerms(copy(terms));
    this.version = 1;
    this.approvals = new Set();
    this.amendmentApprovals = new Set();
    this.pendingTerms = null;
    this.state = 'Unfunded';
    this.events = [];
    this.history = [];
    this.milestones = this.terms.milestones.map((milestone, index) => ({ ...milestone, index, status: 'Pending', evidenceHash: null, submittedAt: null, reviewEndsAt: null, acceptedAt: null, disputeHash: null }));
    this.#record('AgreementDrafted', { version: this.version, versionHash: this.versionHash });
    this.#appendVersion('draft', []);
  }

  get versionHash() {
    return createHash('sha256').update(JSON.stringify({ terms: this.terms, version: this.version })).digest('hex');
  }

  approve(caller) {
    this.#participant(caller);
    if (this.pendingTerms) {
      this.amendmentApprovals.add(caller);
      this.#record('AmendmentApproved', { participant: caller, version: this.version });
      this.#updateCurrentVersion({ approvals: [...this.amendmentApprovals], status: this.amendmentApprovals.size === 2 ? 'binding' : 'pending amendment approval' });
      if (this.amendmentApprovals.size === 2) {
        this.terms = this.pendingTerms;
        this.milestones = this.milestones.map((milestone, index) => milestone.status === 'Pending' ? { ...milestone, ...this.terms.milestones[index] } : milestone);
        this.pendingTerms = null;
        this.amendmentApprovals.clear();
        this.#record('AgreementAmended', { version: this.version, versionHash: this.versionHash });
      }
      return;
    }
    if (this.state !== 'Unfunded') throw new RuleError('Only an unfunded agreement version can be approved.');
    this.approvals.add(caller);
    this.#record('AgreementApproved', { participant: caller, version: this.version, versionHash: this.versionHash });
    this.#updateCurrentVersion({ approvals: [...this.approvals], status: this.approvals.size === 2 ? 'approved' : 'pending approval' });
  }

  replaceDraft(caller, nextTerms) {
    this.#participant(caller);
    if (this.state !== 'Unfunded' || this.pendingTerms) throw new RuleError('Only an unfunded draft without a pending amendment can be edited.');
    const validatedTerms = this.#validateTerms(copy(nextTerms));
    if (validatedTerms.buyer !== this.terms.buyer || validatedTerms.seller !== this.terms.seller || validatedTerms.resolver !== this.terms.resolver) throw new RuleError('Draft participants and bound resolver cannot be changed in this local agreement.');
    const changes = changedFields(this.terms, validatedTerms);
    if (changes.length === 0) throw new RuleError('Change at least one agreement field before saving the draft.');
    this.#updateCurrentVersion({ status: 'superseded' });
    this.terms = validatedTerms;
    this.version += 1;
    this.approvals.clear();
    this.milestones = this.terms.milestones.map((milestone, index) => ({ ...milestone, index, status: 'Pending', evidenceHash: null, submittedAt: null, reviewEndsAt: null, acceptedAt: null, disputeHash: null }));
    this.#record('AgreementAmended', { version: this.version, versionHash: this.versionHash });
    this.#appendVersion('draft', changes);
  }

  amend(caller, change) {
    this.#participant(caller);
    const index = change.milestoneIndex;
    if (!Number.isInteger(index) || !this.milestones[index]) throw new RuleError('A valid milestone index is required.');
    if (this.pendingTerms) throw new RuleError('The current amendment awaits both participants.');
    if (this.state === 'Funded' && this.milestones[index].status !== 'Pending') throw new RuleError('Only an unstarted milestone can be amended.');
    const beforeTerms = copy(this.terms);
    const nextTerms = copy(this.terms);
    Object.entries(change).forEach(([key, value]) => { if (key !== 'milestoneIndex') nextTerms.milestones[index][key] = value; });
    const validatedTerms = this.#validateTerms(nextTerms);
    if (this.state === 'Funded') {
      const remainingBefore = this.milestones.filter(milestone => milestone.status === 'Pending').reduce((sum, milestone) => sum + milestone.amount, 0);
      const remainingAfter = validatedTerms.milestones.filter((_, milestoneIndex) => this.milestones[milestoneIndex].status === 'Pending').reduce((sum, milestone) => sum + milestone.amount, 0);
      if (remainingBefore !== remainingAfter) throw new RuleError('Amendments must preserve the remaining allocation.');
      this.version += 1;
      this.pendingTerms = validatedTerms;
      this.amendmentApprovals.clear();
      this.#record('AmendmentProposed', { affectedMilestone: index, version: this.version, versionHash: this.#hash(validatedTerms) });
      this.#appendVersion('pending amendment approval', changedFields(beforeTerms, validatedTerms), validatedTerms);
      return;
    }
    this.#updateCurrentVersion({ status: 'superseded' });
    this.terms = validatedTerms;
    this.milestones[index] = { ...this.milestones[index], ...this.terms.milestones[index] };
    this.version += 1;
    this.approvals.clear();
    this.#record('AgreementAmended', { affectedMilestone: index, version: this.version, versionHash: this.versionHash });
    this.#appendVersion('draft', changedFields(beforeTerms, validatedTerms));
  }

  fund(caller, amount, now) {
    if (caller !== this.terms.buyer) throw new RuleError('Only the buyer can fund the vault.');
    if (this.state !== 'Unfunded') throw new RuleError('The vault has already been funded or expired.');
    if (this.approvals.size !== 2) throw new RuleError('Both participants must approve this exact version.');
    if (now > this.terms.fundingDeadline || now >= this.milestones[0].deadline) {
      this.state = 'Expired'; this.#record('FundingExpired', {}); throw new RuleError('The funding window has expired.');
    }
    if (amount !== this.total) throw new RuleError('Funding must equal the exact milestone allocation.');
    this.state = 'Funded';
    this.milestones[0].status = 'Active';
    this.#record('VaultFunded', { amount });
  }

  submitEvidence(caller, evidenceHash, now) {
    const milestone = this.#active();
    if (caller !== this.terms.seller) throw new RuleError('Only the seller can submit evidence.');
    if (now > milestone.deadline) throw new RuleError('Evidence must be submitted by the UTC delivery deadline.');
    if (!evidenceHash || milestone.evidenceHash) throw new RuleError('One final evidence hash is required.');
    milestone.evidenceHash = evidenceHash; milestone.submittedAt = now; milestone.reviewEndsAt = now + milestone.reviewSeconds; milestone.status = 'InReview';
    this.#record('EvidenceSubmitted', { milestone: milestone.index, evidenceHash, submittedAt: now });
  }

  accept(caller, now) {
    const milestone = this.#reviewing();
    if (caller !== this.terms.buyer) throw new RuleError('Only the buyer can accept evidence.');
    if (now > milestone.reviewEndsAt) throw new RuleError('The review window has ended.');
    milestone.acceptedAt = now; this.#record('MilestoneAccepted', { milestone: milestone.index, acceptedAt: now });
  }

  release(_caller, now) {
    const milestone = this.#reviewing();
    if (!milestone.acceptedAt && now < milestone.reviewEndsAt) throw new RuleError('Milestone is not eligible for release.');
    const settlement = this.#sellerSettlement(milestone.amount);
    milestone.status = 'Released'; this.#record('MilestoneReleased', { milestone: milestone.index, ...settlement }); this.#advance();
    return settlement;
  }

  cancelMissed(caller, now) {
    const milestone = this.#active();
    if (caller !== this.terms.buyer) throw new RuleError('Only the buyer can cancel a missed milestone.');
    if (now <= milestone.deadline) throw new RuleError('Delivery is not yet missed.');
    milestone.status = 'Refunded'; const settlement = { buyerAmount: milestone.amount }; this.#record('MilestoneRefunded', { milestone: milestone.index, ...settlement }); this.#advance();
    return settlement;
  }

  dispute(caller, disputeHash, now) {
    const milestone = this.#reviewing();
    if (caller !== this.terms.buyer) throw new RuleError('Only the buyer can open a dispute.');
    if (now > milestone.reviewEndsAt) throw new RuleError('The review window has ended.');
    if (!disputeHash) throw new RuleError('A dispute record hash is required.');
    milestone.disputeHash = disputeHash; milestone.status = 'Disputed'; this.#record('DisputeOpened', { milestone: milestone.index, disputeHash, openedAt: now });
  }

  resolve(caller, sellerGrossAmount, now) {
    const milestone = this.milestones.find(item => item.status === 'Disputed');
    if (!milestone) throw new RuleError('No disputed milestone exists.');
    if (caller !== this.terms.resolver) throw new RuleError('Only the bound resolver can resolve this dispute.');
    if (!Number.isInteger(sellerGrossAmount) || sellerGrossAmount < 0 || sellerGrossAmount > milestone.amount) throw new RuleError('Split must preserve the milestone allocation.');
    const seller = this.#sellerSettlement(sellerGrossAmount);
    const settlement = { buyerAmount: milestone.amount - sellerGrossAmount, ...seller };
    milestone.status = sellerGrossAmount === 0 ? 'Refunded' : sellerGrossAmount === milestone.amount ? 'Released' : 'Split';
    this.#record('DisputeResolved', { milestone: milestone.index, resolvedAt: now, ...settlement }); this.#advance();
    return settlement;
  }

  snapshot() { return copy({ state: this.state, version: this.version, versionHash: this.versionHash, terms: this.terms, approvals: [...this.approvals], amendmentApprovals: [...this.amendmentApprovals], hasPendingAmendment: Boolean(this.pendingTerms), total: this.total, milestones: this.milestones, events: this.events, history: this.history }); }
  get total() { return this.terms.milestones.reduce((sum, milestone) => sum + milestone.amount, 0); }

  #participant(caller) { if (caller !== this.terms.buyer && caller !== this.terms.seller) throw new RuleError('Only an invited participant can perform this action.'); }
  #active() { if (this.state !== 'Funded') throw new RuleError('The vault is not funded.'); const milestone = this.milestones.find(item => item.status === 'Active'); if (!milestone) throw new RuleError('No active milestone exists.'); return milestone; }
  #reviewing() { const milestone = this.milestones.find(item => item.status === 'InReview'); if (!milestone) throw new RuleError('No milestone is in review.'); return milestone; }
  #sellerSettlement(amount) { const feeAmount = Math.floor((amount * this.terms.feeBps) / 10_000); return { sellerAmount: amount - feeAmount, feeAmount }; }
  #advance() { const next = this.milestones.find(item => item.status === 'Pending'); if (next) next.status = 'Active'; }
  #hash(terms = this.terms) { return createHash('sha256').update(JSON.stringify({ terms, version: this.version })).digest('hex'); }
  #appendVersion(status, changes, terms = this.terms) { this.history.push({ version: this.version, versionHash: this.#hash(terms), timestamp: new Date().toISOString(), approvals: [], status, changes: copy(changes), terms: copy(terms) }); }
  #updateCurrentVersion(change) { Object.assign(this.history.at(-1), change); }
  #record(type, data) { this.events.push({ sequence: this.events.length + 1, timestamp: new Date().toISOString(), type, ...data }); }
  #validateTerms(terms) {
    if (!terms.buyer || !terms.seller || !terms.resolver || new Set([terms.buyer, terms.seller, terms.resolver]).size < 3) throw new RuleError('Buyer, seller, and resolver must be distinct.');
    if (typeof terms.scope !== 'string' || !terms.scope.trim()) throw new RuleError('A clear agreement scope is required.');
    if (!Number.isInteger(terms.feeBps) || terms.feeBps < 0 || terms.feeBps > 10_000) throw new RuleError('Fee basis points must be between 0 and 10000.');
    if (!Array.isArray(terms.milestones) || terms.milestones.length < 2 || terms.milestones.length > 3) throw new RuleError('An agreement requires two or three milestones.');
    let priorDeadline = 0;
    for (const milestone of terms.milestones) {
      if (typeof milestone.title !== 'string' || !milestone.title.trim() || typeof milestone.evidenceRequirement !== 'string' || !milestone.evidenceRequirement.trim()) throw new RuleError('Each milestone needs a title and evidence requirement.');
      if (!Number.isInteger(milestone.amount) || milestone.amount <= 0) throw new RuleError('Milestone allocations must be positive integer eUSD units.');
      if (!Number.isInteger(milestone.deadline) || milestone.deadline <= priorDeadline) throw new RuleError('Milestone deadlines must be ascending UTC timestamps.');
      if (!Number.isInteger(milestone.reviewSeconds) || milestone.reviewSeconds < 86_400 || milestone.reviewSeconds > 604_800) throw new RuleError('Review windows must be between 24 hours and 7 days.');
      priorDeadline = milestone.deadline;
    }
    return terms;
  }
}

export function suggestDraft(brief, currentTerms, now) {
  if (typeof brief !== 'string' || brief.trim().length < 12) throw new RuleError('Describe the work in at least 12 characters to receive a draft suggestion.');
  const subject = brief.trim().replace(/\s+/g, ' ').slice(0, 280);
  const total = currentTerms.milestones.reduce((sum, milestone) => sum + milestone.amount, 0);
  const firstAmount = Math.floor(total * 0.4);
  return {
    buyer: currentTerms.buyer,
    seller: currentTerms.seller,
    resolver: currentTerms.resolver,
    scope: subject,
    feeBps: currentTerms.feeBps,
    fundingDeadline: now + 48 * 60 * 60,
    milestones: [
      { title: 'Working draft', amount: firstAmount, deadline: now + 7 * 86_400, reviewSeconds: 72 * 3_600, evidenceRequirement: 'Private draft or progress record hash' },
      { title: 'Final delivery and handoff', amount: total - firstAmount, deadline: now + 14 * 86_400, reviewSeconds: 72 * 3_600, evidenceRequirement: 'Private final-delivery or handoff record hash' }
    ]
  };
}
