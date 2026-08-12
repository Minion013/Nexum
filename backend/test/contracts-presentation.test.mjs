import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFrontendModule } from '../../frontend/test/load-frontend-module.mjs';

const { filterContracts } = await loadFrontendModule('src/contracts/presentation.ts');

test('the Contracts list presents scan-ready Contract actions without an unverified monetary value', () => {
  const contracts = [
      { id: 'review', title: 'Checkout redesign', status: 'negotiation', counterparty: 'Lee', responsibility: 'Buyer', latestVersionNumber: 2, milestoneCount: 2, lastActivityAt: '2030-09-01T09:00:00.000Z' },
      { id: 'delivery', title: 'Identity design', status: 'active', counterparty: 'Maya', responsibility: 'Service Provider', latestVersionNumber: 1, milestoneCount: 3, nextMilestone: { title: 'Deliver identity kit', deadlineUtc: '2030-09-04T09:00:00.000Z' }, lastActivityAt: '2030-09-02T09:00:00.000Z' }
  ];
  const presentation = filterContracts(contracts, '', '');

  assert.deepEqual(presentation.map(({ id, counterparty, stage, action, nextMilestoneLabel }) => ({ id, counterparty, stage, action, nextMilestone: nextMilestoneLabel })), [
    { id: 'review', counterparty: 'Lee', stage: 'Awaiting review', action: { href: '/contracts/review', label: 'Review terms' }, nextMilestone: '2 milestones · No upcoming deadline' },
    { id: 'delivery', counterparty: 'Maya', stage: 'In progress', action: { href: '/contracts/delivery', label: 'Open Contract' }, nextMilestone: '3 milestones · Next Deliver identity kit · Sep 4' }
  ]);
  assert.equal(JSON.stringify(presentation).includes('MockEUSD'), false);
});

test('the Contracts list filters the same Contract access records for desktop and narrow screens', () => {
  const home = [
      { id: 'draft', title: 'Landing page', status: 'private_draft', counterparty: 'Sam', responsibility: 'Buyer', latestVersionNumber: 1 },
      { id: 'active', title: 'Identity design', status: 'active', counterparty: 'Maya', responsibility: 'Service Provider', latestVersionNumber: 1 }
  ];

  assert.deepEqual(filterContracts(home, 'active', '').map(contract => contract.id), ['active']);
  assert.deepEqual(filterContracts(home, '', 'Buyer').map(contract => contract.id), ['draft']);
  assert.equal(filterContracts(home, 'complete', '').length, 0);
  assert.equal(filterContracts(home, '', '').find(contract => contract.id === 'draft').action.href, '/contracts/draft/choose-person');
});
