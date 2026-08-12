import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFrontendModule } from '../../frontend/test/load-frontend-module.mjs';

const { dashboardPresentation } = await loadFrontendModule('src/dashboard/presentation.ts');

test('the Dashboard gives a first-time Profile a clear Contract creation action', () => {
  assert.deepEqual(dashboardPresentation({ contracts: [] }), {
    state: 'empty',
    headline: 'Start your first Contract.',
    description: 'Create a Contract Draft, then share it with the other Contract Party when it is ready for review.',
    primaryAction: { href: '/contracts#new-contract', label: 'Create Contract' },
    metrics: { attention: 0, active: 0, complete: 0 },
    actions: [],
    timeline: [],
    contracts: []
  });
});

test('the Dashboard separates attention, active work, and completed Contracts without displaying unverified money', () => {
  const presentation = dashboardPresentation({
    contracts: [
      { id: 'review', title: 'Checkout redesign', status: 'negotiation', counterparty: 'Lee', responsibility: 'Buyer', latestVersionNumber: 2 },
      { id: 'delivery', title: 'Identity design', status: 'active', counterparty: 'Maya', responsibility: 'Service Provider', latestVersionNumber: 1, nextMilestone: { title: 'Deliver identity kit', deadlineUtc: '2030-09-04T09:00:00.000Z' } },
      { id: 'complete', title: 'Landing page', status: 'complete', counterparty: 'Sam', responsibility: 'Buyer', latestVersionNumber: 4 }
    ]
  });

  assert.equal(presentation.state, 'attention');
  assert.deepEqual(presentation.metrics, { attention: 1, active: 1, complete: 1 });
  assert.deepEqual(presentation.primaryAction, { href: '/contracts', label: 'View Contracts' });
  assert.deepEqual(presentation.actions, [{
    contractId: 'review', title: 'Review Contract terms', detail: 'Checkout redesign is awaiting your review with Lee.', href: '/contracts/review', label: 'Review'
  }]);
  assert.deepEqual(presentation.timeline, [{
    contractId: 'delivery', title: 'Deliver identity kit', detail: 'Identity design · Due Sep 4', href: '/contracts/delivery', state: 'active'
  }]);
  assert.equal(JSON.stringify(presentation).includes('MockEUSD'), false);
  assert.equal(JSON.stringify(presentation).includes('Activity'), false);
  const draft = dashboardPresentation({ contracts: [{ id: 'draft', title: 'Website refresh', status: 'private_draft', counterparty: 'Person to be confirmed' }] });
  assert.equal(draft.actions[0].href, '/contracts/draft/choose-person');
  assert.equal(draft.contracts[0].href, '/contracts/draft/choose-person');
});
