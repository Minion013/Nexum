import assert from 'node:assert/strict';
import test from 'node:test';
import { loadFrontendModule } from './load-frontend-module.mjs';

const { milestoneReviewPresentation } = await loadFrontendModule('src/contracts/milestone-review-presentation.ts');

const review = {
  id: 'contract-id',
  status: 'active',
  version: { id: 'version-id', number: 2 },
  milestone: {
    key: 'milestone-1',
    number: 1,
    title: 'Research',
    deliveryOutcome: 'Annotated research findings',
    evidenceRequirement: 'Private annotated findings.',
    acceptanceCriteria: [{ id: 1, description: 'Research findings are documented.', required: true, checked: false }],
    deliveryDeadlineUtc: '2030-09-10T09:00:00.000Z',
    reviewWindowHours: 72
  },
  responsibility: 'Buyer',
  canSubmitEvidence: false,
  evidence: [{ id: 'evidence-1', submittedByProfileId: 'provider-id', submittedAt: '2030-09-02T09:00:00.000Z', resource: { name: 'research-notes.pdf', kind: 'document', mediaType: 'application/pdf', sizeBytes: 4096, protectedLocator: 'contracts/contract-id/milestone-1/research-notes.pdf' }, integrityReference: 'sha256:' + '0'.repeat(64) }],
  activity: [{ id: 'activity-1', type: 'evidence_submitted', occurredAt: '2030-09-02T09:00:00.000Z', detail: 'Private evidence was submitted for review.' }],
  reviewWindow: { submittedAt: '2030-09-02T09:00:00.000Z', expiresAt: '2030-09-05T09:00:00.000Z', state: 'open' }
};

test('Milestone Review presentation exposes Evidence and Activity without implying payment authority', () => {
  const presentation = milestoneReviewPresentation(review, new Date('2030-09-03T09:00:00.000Z'));

  assert.deepEqual(presentation.tabs.map(tab => tab.id), ['evidence', 'criteria', 'activity']);
  assert.equal(presentation.status.label, 'Evidence submitted');
  assert.equal(presentation.reviewWindow.label, 'Review window open');
  assert.equal(presentation.evidence[0].resourceLabel, 'research-notes.pdf');
  assert.equal(presentation.evidence[0].protectedReference, 'Protected resource reference');
  assert.match(presentation.activity[0].detail, /submitted/i);
  assert.match(presentation.paymentBoundary, /does not move funds|not a payment/i);
  assert.equal(presentation.criteria[0].checked, false);
  assert.equal(presentation.canAccept, false);
});

test('an unsubmitted Service Provider review keeps the final evidence action available only inside the delivery window', () => {
  const pending = { ...review, responsibility: 'Service Provider', canSubmitEvidence: true, evidence: [], activity: [], reviewWindow: null };
  const presentation = milestoneReviewPresentation(pending, new Date('2030-09-03T09:00:00.000Z'));

  assert.equal(presentation.status.label, 'Awaiting evidence');
  assert.equal(presentation.canSubmitEvidence, true);
  assert.equal(presentation.reviewWindow.label, 'Not started');
});
