import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthorizationError, createApp, createContractWorkflow, localTestProfileFromEnvironment } from '../src/server.mjs';

async function start(options) {
  const server = createApp(options);
  await new Promise(resolve => server.listen(0, resolve));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function request(origin, path, { token, method = 'GET', body, headers = {} } = {}) {
  return fetch(`${origin}${path}`, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
}

const review = {
  id: 'contract-id',
  status: 'active',
  milestone: {
    key: 'milestone-1',
    number: 1,
    title: 'Research',
    deliveryOutcome: 'Annotated research findings',
    evidenceRequirement: 'Annotated findings',
    acceptanceCriteria: [{ description: 'Research findings are documented.', required: true }],
    deliveryDeadlineUtc: '2030-09-10T09:00:00.000Z',
    reviewWindowHours: 72
  },
  responsibility: 'Service Provider',
  canSubmitEvidence: true,
  evidence: [],
  activity: [{ id: 'activity-1', type: 'contract_activated', occurredAt: '2030-09-01T09:00:00.000Z', detail: 'Contract milestone review is available.' }]
};

test('Milestone Review API preserves Contract Party access and rejects non-parties and unsafe evidence', async () => {
  const calls = [];
  const { server, origin } = await start({
    verifySupabaseSession: async token => {
      if (token === 'party-jwt') return { id: 'provider-id', email: 'provider@example.test' };
      if (token === 'non-party-jwt') return { id: 'outsider-id', email: 'outsider@example.test' };
      throw new Error('invalid token');
    },
    contractWorkflow: {
      getMilestoneReview: async input => {
        calls.push({ operation: 'review', input });
        if (input.userId !== 'provider-id') throw new AuthorizationError('Only an authorised Contract Party can view this Milestone Review.');
        return review;
      },
      submitMilestoneEvidence: async input => {
        calls.push({ operation: 'submit', input });
        if (input.userId !== 'provider-id') throw new AuthorizationError('Only the authorised Service Provider can submit milestone evidence.');
        return { ...review, evidence: [{ id: 'evidence-1', submittedByProfileId: 'provider-id', submittedAt: '2030-09-02T09:00:00.000Z', resource: input.resource, integrityReference: input.integrityReference }], canSubmitEvidence: false };
      },
      recordMilestoneReviewDecision: async input => {
        calls.push({ operation: 'decision', input });
        throw new AuthorizationError('Only the authorised Buyer can make milestone review decisions.');
      }
    }
  });
  try {
    assert.equal((await request(origin, '/api/contracts/contract-id/milestones/milestone-1/review')).status, 401);
    assert.equal((await request(origin, '/api/contracts/contract-id/milestones/milestone-1/review', { token: 'non-party-jwt' })).status, 403);

    const loaded = await request(origin, '/api/contracts/contract-id/milestones/milestone-1/review', { token: 'party-jwt' });
    assert.equal(loaded.status, 200);
    assert.deepEqual((await loaded.json()).review, review);

    const unsafe = await request(origin, '/api/contracts/contract-id/milestones/milestone-1/evidence', {
      token: 'party-jwt',
      method: 'POST',
      body: { resource: { name: 'private.zip', kind: 'document', mediaType: 'application/zip', sizeBytes: 120, protectedLocator: 'https://private.example.test/file' }, integrityReference: 'sha256:' + '0'.repeat(64) }
    });
    assert.equal(unsafe.status, 422);
    assert.match((await unsafe.json()).error, /private URL|protected resource/i);

    const submitted = await request(origin, '/api/contracts/contract-id/milestones/milestone-1/evidence', {
      token: 'party-jwt',
      method: 'POST',
      body: { resource: { name: 'private.zip', kind: 'document', mediaType: 'application/zip', sizeBytes: 120, protectedLocator: 'contracts/contract-id/milestone-1/private.zip' }, integrityReference: 'sha256:' + '0'.repeat(64) }
    });
    assert.equal(submitted.status, 201);
    assert.equal((await submitted.json()).review.evidence[0].resource.protectedLocator, 'contracts/contract-id/milestone-1/private.zip');
    const decision = await request(origin, '/api/contracts/contract-id/milestones/milestone-1/decisions', {
      token: 'party-jwt',
      method: 'POST',
      body: { action: 'accept' }
    });
    assert.equal(decision.status, 403);
    assert.deepEqual(calls.map(call => call.operation), ['review', 'review', 'submit', 'decision']);
    assert.equal(calls[1].input.milestoneKey, 'milestone-1');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('the tracker local test email can record buyer review decisions with criteria gating', async () => {
  const localTestProfile = localTestProfileFromEnvironment({ PACTFLOW_LOCAL_TEST_EMAIL: 'pactflow-wallet-test@local.invalid' });
  const { server, origin } = await start({ localTestProfile });
  const headers = { 'x-pactflow-local-test-email': localTestProfile.email };
  const reviewUrl = '/api/contracts/00000000-0000-0000-0000-000000000902/milestones/milestone-1/review';
  const decisionsUrl = '/api/contracts/00000000-0000-0000-0000-000000000902/milestones/milestone-1/decisions';
  try {
    const initial = await request(origin, reviewUrl, { headers });
    assert.equal(initial.status, 200);
    const initialReview = (await initial.json()).review;
    assert.equal(initialReview.responsibility, 'Buyer');
    assert.deepEqual(initialReview.criteria, [{ id: 1, description: 'Research findings are documented.', required: true, checked: false }]);
    assert.equal(initialReview.canAccept, false);
    assert.equal(initialReview.canRequestRevision, true);
    assert.equal(initialReview.canRaiseDispute, true);

    const prematureAcceptance = await request(origin, decisionsUrl, { method: 'POST', headers, body: { action: 'accept' } });
    assert.equal(prematureAcceptance.status, 422);
    assert.match((await prematureAcceptance.json()).error, /every required Acceptance Criterion/i);

    const revision = await request(origin, decisionsUrl, { method: 'POST', headers, body: { action: 'request_revision', reason: 'Please add the missing source notes.' } });
    assert.equal(revision.status, 201);
    const afterRevision = (await revision.json()).review;
    assert.equal(afterRevision.activity.at(-1).type, 'revision_requested');
    assert.equal(afterRevision.activity.at(-1).detail, 'Please add the missing source notes.');
    assert.equal(afterRevision.canAccept, false);

    const checked = await request(origin, decisionsUrl, { method: 'POST', headers, body: { action: 'check_criterion', criterionId: 1, checked: true } });
    assert.equal(checked.status, 201);
    const afterCheck = (await checked.json()).review;
    assert.equal(afterCheck.criteria[0].checked, true);
    assert.equal(afterCheck.activity.at(-1).type, 'criterion_checked');
    assert.equal(afterCheck.canAccept, true);

    const accepted = await request(origin, decisionsUrl, { method: 'POST', headers, body: { action: 'accept' } });
    assert.equal(accepted.status, 201);
    const afterAcceptance = (await accepted.json()).review;
    assert.equal(afterAcceptance.activity.at(-1).type, 'accepted');
    assert.equal(afterAcceptance.decisionState.accepted, true);
    assert.equal(afterAcceptance.canAccept, false);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('a Buyer can open a dispute without completing criteria, and the activity is protected', async () => {
  const localTestProfile = localTestProfileFromEnvironment({ PACTFLOW_LOCAL_TEST_EMAIL: 'pactflow-wallet-test@local.invalid' });
  const { server, origin } = await start({ localTestProfile });
  const headers = { 'x-pactflow-local-test-email': localTestProfile.email };
  const decisionsUrl = '/api/contracts/00000000-0000-0000-0000-000000000902/milestones/milestone-1/decisions';
  try {
    const dispute = await request(origin, decisionsUrl, { method: 'POST', headers, body: { action: 'open_dispute', reason: 'The submitted outcome does not match the agreed scope.' } });
    assert.equal(dispute.status, 201);
    const review = (await dispute.json()).review;
    assert.equal(review.criteria[0].checked, false);
    assert.equal(review.activity.at(-1).type, 'dispute_opened');
    assert.equal(review.activity.at(-1).detail, 'The submitted outcome does not match the agreed scope.');
    assert.equal(review.decisionState.disputeOpen, true);
    assert.equal(review.canAccept, false);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('the tracker local test email can open an active Milestone Review and submit private evidence', async () => {
  const localTestProfile = localTestProfileFromEnvironment({ PACTFLOW_LOCAL_TEST_EMAIL: 'pactflow-wallet-test@local.invalid' });
  const { server, origin } = await start({ localTestProfile });
  const headers = { 'x-pactflow-local-test-email': localTestProfile.email };
  const reviewUrl = '/api/contracts/00000000-0000-4000-8000-000000000901/milestones/milestone-1/review';
  const evidenceUrl = '/api/contracts/00000000-0000-4000-8000-000000000901/milestones/milestone-1/evidence';
  try {
    const loaded = await request(origin, reviewUrl, { headers });
    assert.equal(loaded.status, 200);
    const initial = (await loaded.json()).review;
    assert.equal(initial.responsibility, 'Service Provider');
    assert.equal(initial.canSubmitEvidence, true);
    assert.deepEqual(initial.evidence, []);
    assert.equal(initial.activity[0].type, 'contract_activated');

    const submitted = await request(origin, evidenceUrl, {
      method: 'POST',
      headers,
      body: { resource: { name: 'research-notes.pdf', kind: 'document', mediaType: 'application/pdf', sizeBytes: 4096, protectedLocator: 'contracts/00000000-0000-4000-8000-000000000901/milestone-1/research-notes.pdf' }, integrityReference: 'sha256:' + '1'.repeat(64) }
    });
    assert.equal(submitted.status, 201);
    const afterSubmit = (await submitted.json()).review;
    assert.equal(afterSubmit.canSubmitEvidence, false);
    assert.equal(afterSubmit.evidence[0].submittedByProfileId, localTestProfile.id);
    assert.equal(afterSubmit.activity.at(-1).type, 'evidence_submitted');
    assert.equal(afterSubmit.activity.length, 2);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('the durable workflow reads the protected review model and submits through the server RPC boundary', async () => {
  const calls = [];
  const contract = {
    id: 'contract-id',
    status: 'active',
    created_by_profile_id: 'buyer-id',
    contract_parties: [{ id: 'buyer-party', profile_id: 'buyer-id' }, { id: 'provider-party', profile_id: 'provider-id' }],
    contract_versions: [{ id: 'version-id', version_number: 2, contract_sections: [{ section_type: 'parties', position: 0, terms: { buyer: { partyRef: 'initiating_party' }, serviceProvider: { partyRef: 'counterparty' } } }, { section_type: 'milestones', position: 1, terms: { items: [{ title: 'Research', deliveryOutcome: 'Findings', evidenceRequirement: 'Private findings', acceptanceCriteria: [{ description: 'Findings are complete.', required: true }], deliveryDeadlineUtc: '2030-09-10T09:00:00.000Z', reviewWindowHours: 72 }] } }] }]
  };
  const evidence = [];
  const activity = [{ id: 1, contract_id: 'contract-id', contract_version_id: 'version-id', milestone_key: 'milestone-1', event_type: 'contract_activated', actor_profile_id: 'buyer-id', occurred_at: '2030-09-01T09:00:00.000Z', payload: { detail: 'Review is available.' } }];
  const chain = (table, result) => {
    const query = { eq: () => query, order: () => query, single: async () => result, then: (resolve, reject) => Promise.resolve(result).then(resolve, reject) };
    return { select: fields => { calls.push({ operation: 'select', table, fields }); return query; } };
  };
  const client = {
    from: table => chain(table, table === 'contracts' ? { data: contract, error: null } : table === 'milestone_evidence_submissions' ? { data: evidence, error: null } : { data: activity, error: null }),
    rpc: async (name, args) => { calls.push({ operation: 'rpc', name, args }); return { data: 'evidence-id', error: null }; }
  };
  const workflow = createContractWorkflow({ url: 'https://project.supabase.co', publishableKey: 'sb_publishable_example' }, () => client);
  const loaded = await workflow.getMilestoneReview({ userId: 'provider-id', accessToken: 'provider-jwt', contractId: 'contract-id', milestoneKey: 'milestone-1' });
  assert.equal(loaded.responsibility, 'Service Provider');
  assert.equal(loaded.canSubmitEvidence, true);
  assert.equal(loaded.activity[0].type, 'contract_activated');

  const submitted = await workflow.submitMilestoneEvidence({ userId: 'provider-id', accessToken: 'provider-jwt', contractId: 'contract-id', milestoneKey: 'milestone-1', resource: { name: 'findings.pdf', kind: 'document', mediaType: 'application/pdf', sizeBytes: 100, protectedLocator: 'contracts/contract-id/milestone-1/findings.pdf' }, integrityReference: 'sha256:' + '2'.repeat(64) });
  assert.equal(submitted.id, 'contract-id');
  assert.deepEqual(calls.find(call => call.operation === 'rpc'), { operation: 'rpc', name: 'submit_milestone_evidence', args: { target_contract_id: 'contract-id', target_milestone_key: 'milestone-1', resource_metadata: { name: 'findings.pdf', kind: 'document', mediaType: 'application/pdf', sizeBytes: 100, protectedLocator: 'contracts/contract-id/milestone-1/findings.pdf' }, integrity_reference: 'sha256:' + '2'.repeat(64) } });
  await workflow.recordMilestoneReviewDecision({ userId: 'buyer-id', accessToken: 'buyer-jwt', contractId: 'contract-id', milestoneKey: 'milestone-1', action: 'check_criterion', criterionId: 1, checked: true });
  assert.deepEqual(calls.find(call => call.operation === 'rpc' && call.name === 'record_milestone_review_decision'), { operation: 'rpc', name: 'record_milestone_review_decision', args: { target_contract_id: 'contract-id', target_milestone_key: 'milestone-1', decision_action: 'check_criterion', criterion_id: 1, criterion_checked: true, decision_reason: null } });
});
