import test from 'node:test';
import assert from 'node:assert/strict';
import { contractsPresentation } from '../public/contracts-presentation.js';

test('the Contracts list presents scan-ready Contract actions without an unverified monetary value', () => {
  const presentation = contractsPresentation({
    contracts: [
      { id: 'review', title: 'Checkout redesign', status: 'negotiation', counterparty: 'Lee', responsibility: 'Buyer', latestVersionNumber: 2, milestoneCount: 2, lastActivityAt: '2030-09-01T09:00:00.000Z' },
      { id: 'delivery', title: 'Identity design', status: 'active', counterparty: 'Maya', responsibility: 'Service Provider', latestVersionNumber: 1, milestoneCount: 3, nextMilestone: { title: 'Deliver identity kit', deadlineUtc: '2030-09-04T09:00:00.000Z' }, lastActivityAt: '2030-09-02T09:00:00.000Z' }
    ]
  });

  assert.deepEqual(presentation.contracts.map(({ id, counterparty, stage, action, nextMilestone }) => ({ id, counterparty, stage, action, nextMilestone })), [
    { id: 'review', counterparty: 'Lee', stage: 'Awaiting review', action: { href: '/contracts/review', label: 'Review terms' }, nextMilestone: '2 milestones · No upcoming deadline' },
    { id: 'delivery', counterparty: 'Maya', stage: 'In progress', action: { href: '/contracts/delivery', label: 'Open Contract' }, nextMilestone: '3 milestones · Next Deliver identity kit · Sep 4' }
  ]);
  assert.equal(JSON.stringify(presentation).includes('MockEUSD'), false);
});

test('the Contracts list filters the same Contract access records for desktop and narrow screens', () => {
  const home = {
    contracts: [
      { id: 'draft', title: 'Landing page', status: 'private_draft', counterparty: 'Sam', responsibility: 'Buyer', latestVersionNumber: 1 },
      { id: 'active', title: 'Identity design', status: 'active', counterparty: 'Maya', responsibility: 'Service Provider', latestVersionNumber: 1 }
    ]
  };

  assert.deepEqual(contractsPresentation(home, { stage: 'active' }).contracts.map(contract => contract.id), ['active']);
  assert.deepEqual(contractsPresentation(home, { responsibility: 'Buyer' }).contracts.map(contract => contract.id), ['draft']);
  assert.equal(contractsPresentation(home, { stage: 'complete' }).emptyMessage, 'No Contracts match these filters.');
  assert.equal(contractsPresentation(home).contracts.find(contract => contract.id === 'draft').action.href, '/contracts/draft/choose-person');
});
