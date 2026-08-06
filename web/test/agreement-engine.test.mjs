import test from 'node:test';
import assert from 'node:assert/strict';
import { AgreementEngine, RuleError } from '../src/agreement-engine.mjs';

const buyer = 'buyer-wallet';
const seller = 'seller-wallet';
const resolver = 'resolver-wallet';
const outsider = 'outsider-wallet';
const baseTerms = (now = 1_000) => ({
  buyer, seller, resolver, scope: 'Redesign the checkout experience', feeBps: 250, fundingDeadline: now + 48 * 60 * 60,
  milestones: [
    { title: 'Wireframes', amount: 300_000_000, deadline: now + 60, reviewSeconds: 86_400, evidenceRequirement: 'Figma link' },
    { title: 'Handoff', amount: 700_000_000, deadline: now + 200, reviewSeconds: 86_400, evidenceRequirement: 'Repository tag' }
  ]
});

test('only jointly approved terms can be funded by the buyer', () => {
  const engine = new AgreementEngine(baseTerms());
  assert.throws(() => engine.fund(seller, 1_000_000_000, 1_001), RuleError);
  engine.approve(buyer); engine.approve(seller);
  assert.throws(() => engine.fund(outsider, 1_000_000_000, 1_001), /Only the buyer/);
  engine.fund(buyer, 1_000_000_000, 1_001);
  assert.equal(engine.snapshot().state, 'Funded');
  assert.equal(engine.snapshot().milestones[0].status, 'Active');
});

test('editing terms creates a new version and removes stale approvals', () => {
  const engine = new AgreementEngine(baseTerms());
  engine.approve(buyer); engine.approve(seller);
  engine.amend(buyer, { milestoneIndex: 1, deadline: 2_000 });
  const state = engine.snapshot();
  assert.equal(state.version, 2);
  assert.deepEqual(state.approvals, []);
  assert.equal(state.milestones[1].deadline, 2_000);
});

test('draft edits retain an immutable approval history and a readable field difference', () => {
  const engine = new AgreementEngine(baseTerms());
  engine.approve(buyer); engine.approve(seller);
  engine.replaceDraft(buyer, { ...baseTerms(), scope: 'Redesign checkout and document the component library' });
  const state = engine.snapshot();
  assert.equal(state.version, 2);
  assert.equal(state.approvals.length, 0);
  assert.deepEqual(state.history[0].approvals, [buyer, seller]);
  assert.equal(state.history[0].status, 'superseded');
  assert.equal(state.history[1].changes[0].field, 'scope');
  assert.match(state.history[1].changes[0].after, /component library/);
});

test('a funded future-work amendment remains inert until both participants approve and conserves remaining allocation', () => {
  const engine = new AgreementEngine(baseTerms());
  engine.approve(buyer); engine.approve(seller); engine.fund(buyer, 1_000_000_000, 1_001);
  engine.amend(buyer, { milestoneIndex: 1, deadline: 2_000, amount: 700_000_000 });
  assert.equal(engine.snapshot().milestones[1].deadline, 1_200);
  engine.approve(buyer);
  assert.equal(engine.snapshot().milestones[1].deadline, 1_200);
  engine.approve(seller);
  assert.equal(engine.snapshot().milestones[1].deadline, 2_000);
  assert.throws(() => engine.amend(buyer, { milestoneIndex: 1, amount: 700_000_001 }), /preserve the remaining allocation/);
});

test('seller evidence opens review and accepted release pays seller less a fee', () => {
  const engine = new AgreementEngine(baseTerms());
  engine.approve(buyer); engine.approve(seller); engine.fund(buyer, 1_000_000_000, 1_001);
  engine.submitEvidence(seller, 'evidence-hash', 1_020);
  engine.accept(buyer, 1_021);
  const settlement = engine.release(outsider, 1_022);
  assert.deepEqual(settlement, { sellerAmount: 292_500_000, feeAmount: 7_500_000 });
  assert.equal(engine.snapshot().milestones[1].status, 'Active');
});

test('expired review can be released by any caller, but cannot release early', () => {
  const engine = new AgreementEngine(baseTerms());
  engine.approve(buyer); engine.approve(seller); engine.fund(buyer, 1_000_000_000, 1_001);
  engine.submitEvidence(seller, 'evidence-hash', 1_020);
  assert.throws(() => engine.release(seller, 1_021), /not eligible/);
  const settlement = engine.release(seller, 87_420);
  assert.equal(settlement.sellerAmount, 292_500_000);
});

test('only the buyer can refund a milestone missed without evidence', () => {
  const engine = new AgreementEngine(baseTerms());
  engine.approve(buyer); engine.approve(seller); engine.fund(buyer, 1_000_000_000, 1_001);
  assert.throws(() => engine.cancelMissed(seller, 1_061), /Only the buyer/);
  assert.equal(engine.cancelMissed(buyer, 1_061).buyerAmount, 300_000_000);
  assert.equal(engine.snapshot().milestones[0].status, 'Refunded');
});

test('a dispute freezes only its milestone and the bound resolver may split its allocation', () => {
  const engine = new AgreementEngine(baseTerms());
  engine.approve(buyer); engine.approve(seller); engine.fund(buyer, 1_000_000_000, 1_001);
  engine.submitEvidence(seller, 'evidence-hash', 1_020);
  engine.dispute(buyer, 'dispute-hash', 1_021);
  assert.throws(() => engine.resolve(outsider, 150_000_000, 1_022), /bound resolver/);
  assert.deepEqual(engine.resolve(resolver, 150_000_000, 1_022), { buyerAmount: 150_000_000, sellerAmount: 146_250_000, feeAmount: 3_750_000 });
  assert.equal(engine.snapshot().milestones[0].status, 'Split');
});
