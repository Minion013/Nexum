import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { loadFrontendModule } from './load-frontend-module.mjs';

const { milestoneReviewPresentation } = await loadFrontendModule('src/contracts/milestone-review-presentation.ts');
const reviewStyles = await readFile(new URL('../public/contract-detail.css', import.meta.url), 'utf8');

const review = {
  id: 'contract-id',
  status: 'active',
  version: { id: 'version-id', number: 2 },
  milestone: {
    key: 'milestone-1',
    number: 1,
    title: 'Research',
    deliveryOutcome: 'Annotated research findings',
    allocation: 400,
    evidenceRequirement: 'Private annotated findings.',
    acceptanceCriteria: [{ id: 1, description: 'Research findings are documented.', required: true, checked: false }],
    deliveryDeadlineUtc: '2030-09-10T09:00:00.000Z',
    reviewWindowHours: 72
  },
  responsibility: 'Buyer',
  canSubmitEvidence: false,
  evidence: [{ id: 'evidence-1', submittedByProfileId: 'provider-id', submittedAt: '2030-09-02T09:00:00.000Z', resource: { name: 'research-notes.pdf', kind: 'document', mediaType: 'application/pdf', sizeBytes: 4096, protectedLocator: 'contracts/contract-id/milestone-1/research-notes.pdf' }, integrityReference: 'sha256:' + '0'.repeat(64) }],
  activity: [{ id: 'activity-1', type: 'evidence_submitted', occurredAt: '2030-09-02T09:00:00.000Z', detail: 'Private evidence was submitted for review.' }],
  reviewWindow: { submittedAt: '2030-09-02T09:00:00.000Z', expiresAt: '2030-09-05T09:00:00.000Z', state: 'open', durationHours: 72 },
  settlement: { status: 'proposed', source: 'draft_contract_version', chainAuthoritative: false, proposedAllocation: 400, proposedToken: 'MockEUSD', detail: 'This is a proposed Contract term only; it is not secured, paid, released, or personal wallet funds.' }
};

test('Milestone Review presentation exposes Evidence and Activity without implying payment authority', () => {
  const presentation = milestoneReviewPresentation(review, new Date('2030-09-03T09:00:00.000Z'));

  assert.deepEqual(presentation.tabs.map(tab => tab.id), ['evidence', 'criteria', 'activity']);
  assert.equal(presentation.status.label, 'Evidence submitted');
  assert.equal(presentation.reviewWindow.label, 'Review window open');
  assert.equal(presentation.reviewWindow.countdown, '2d 00h remaining');
  assert.equal(presentation.releaseEligibility.label, 'Not yet release eligible');
  assert.equal(presentation.evidence[0].resourceLabel, 'research-notes.pdf');
  assert.equal(presentation.evidence[0].protectedReference, 'Protected resource reference');
  assert.match(presentation.activity[0].detail, /submitted/i);
  assert.match(presentation.paymentBoundary, /does not move funds|not a payment/i);
  assert.equal(presentation.criteria[0].checked, false);
  assert.equal(presentation.canAccept, false);
  assert.equal(presentation.settlement.label, 'Proposed Contract terms');
  assert.equal(presentation.settlement.proposedTerms, 'Proposed allocation: 400 MockEUSD');
  assert.match(presentation.paymentBoundary, /not secured, paid, released, or personal wallet funds/i);
});

test('an unsubmitted Service Provider review keeps the final evidence action available only inside the delivery window', () => {
  const pending = { ...review, responsibility: 'Service Provider', canSubmitEvidence: true, evidence: [], activity: [], reviewWindow: null };
  const presentation = milestoneReviewPresentation(pending, new Date('2030-09-03T09:00:00.000Z'));

  assert.equal(presentation.status.label, 'Awaiting evidence');
  assert.equal(presentation.canSubmitEvidence, true);
  assert.equal(presentation.reviewWindow.label, 'Not started');
});

test('an expired review window is release-eligible without exposing a payment action', () => {
  const presentation = milestoneReviewPresentation({ ...review, canAccept: true }, new Date('2030-09-06T09:00:00.000Z'));

  assert.equal(presentation.reviewWindow.label, 'Release eligible');
  assert.equal(presentation.reviewWindow.countdown, 'Expired 1d 00h ago');
  assert.equal(presentation.releaseEligibility.label, 'Release eligible');
  assert.match(presentation.releaseEligibility.detail, /participant-triggered|not scheduled|initiated/i);
  assert.equal(presentation.canRelease, false);
  assert.equal(presentation.canAccept, false);
  assert.match(presentation.acceptanceHint, /expired|closed/i);
});

test('authoritative settlement values are presented only for a chain-authoritative settlement state', () => {
  const presentation = milestoneReviewPresentation({
    ...review,
    settlement: {
      status: 'secured',
      source: 'chain',
      chainAuthoritative: true,
      proposedAllocation: 400,
      proposedToken: 'MockEUSD',
      vaultAddress: '0xvault',
      securedAmount: 400,
      detail: 'This value is supplied by the approved Contract Version and chain-authoritative Escrow Vault state.'
    }
  }, new Date('2030-09-03T09:00:00.000Z'));

  assert.equal(presentation.settlement.label, 'Secured in Contract Escrow Vault');
  assert.deepEqual(presentation.settlement.authoritativeValues, [{ label: 'Secured', value: '400 MockEUSD' }]);
  assert.equal(presentation.settlement.vaultAddress, '0xvault');
  assert.match(presentation.paymentBoundary, /chain-authoritative Contract Escrow Vault/i);
});

test('wide and narrow review layouts retain the same timing and settlement context', () => {
  assert.match(reviewStyles, /\.milestone-review-grid\{display:grid;grid-template-columns:minmax\(0,1fr\) 285px/);
  assert.match(reviewStyles, /@media\(max-width:980px\).*\.milestone-review \.contract-rail\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(reviewStyles, /@media\(max-width:640px\).*\.milestone-review \.contract-rail\{grid-template-columns:1fr\}/);
  assert.match(reviewStyles, /\.review-countdown/);
  assert.match(reviewStyles, /\.settlement-values/);
});
