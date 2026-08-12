import test from 'node:test';
import assert from 'node:assert/strict';
import { contractDetailPresentation } from '../../frontend/public/contract-detail-presentation.bundle.js';

function activeContract() {
  return {
    id: 'active-contract-id', status: 'active', versionNumber: 1, counterparty: 'Northstar Studio', paymentAuthority: 'not_configured',
    sections: {
      scope: { title: 'Northstar product site', projectStartDateUtc: '2026-08-03T09:00:00.000Z' }, payment: { settlementToken: 'MockEUSD', totalAllocation: 24000 },
      milestones: [
        { title: 'Discovery and direction', allocation: 4000, deliveryDeadlineUtc: '2026-08-14T09:00:00.000Z' },
        { title: 'Interface design', allocation: 6000, deliveryDeadlineUtc: '2026-08-28T09:00:00.000Z' },
        { title: 'Front-end build', allocation: 9000, deliveryDeadlineUtc: '2026-09-18T09:00:00.000Z' },
        { title: 'Launch support', allocation: 5000, deliveryDeadlineUtc: '2026-09-30T09:00:00.000Z' }
      ]
    },
    activity: [{ title: 'Interface design submitted for review', detail: 'Evidence submitted for review.', at: '2026-08-27T08:30:00.000Z' }]
  };
}

test('the active Contract detail separates contract terms from chain-authoritative settlement', () => {
  const presentation = contractDetailPresentation(activeContract());

  assert.equal(presentation.title, 'Northstar product site');
  assert.deepEqual(presentation.milestones.map(item => item.state), ['complete', 'review', 'pending', 'pending']);
  assert.equal(presentation.current.title, 'Interface design');
  assert.equal(presentation.next.title, 'Front-end build');
  assert.equal(presentation.payment.total, '24,000 MockEUSD');
  assert.match(presentation.payment.label, /not chain verified/);
  assert.equal(presentation.activity[0].title, 'Interface design submitted for review');
});

test('a completed Contract has no pending milestone and presents all milestones as complete', () => {
  const detail = activeContract();
  detail.status = 'complete';
  const presentation = contractDetailPresentation(detail);

  assert.equal(presentation.completed, 4);
  assert.equal(presentation.next, null);
  assert.deepEqual(presentation.milestones.map(item => item.state), ['complete', 'complete', 'complete', 'complete']);
});
