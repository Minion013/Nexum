import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp, createContractWorkflow, createHomeLoader, createProfileLoader, runtimeConfigurationFromEnvironment } from '../src/server.mjs';

async function start(options) {
  const server = createApp(options);
  await new Promise(resolve => server.listen(0, resolve));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function request(origin, path, { token, method = 'GET', body } = {}) {
  return fetch(`${origin}${path}`, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
}

function validServiceEngagementDraft(overrides = {}) {
  const draft = {
    authorityId: '00000000-0000-4000-8000-000000000201',
    parties: {
      buyer: { partyRef: 'initiating_party', responsibility: 'Funds the agreed gross allocation.' },
      serviceProvider: { partyRef: 'counterparty', responsibility: 'Delivers the agreed service outcomes.' }
    },
    scope: {
      title: 'Checkout redesign',
      description: 'Redesign the checkout flow.',
      outcome: 'A production-ready checkout experience with a documented handoff.',
      includedDeliverables: ['Research findings', 'Production-ready handoff'],
      excludedWork: ['Ongoing operations'],
      projectStartDateUtc: '2030-09-01T00:00:00.000Z',
      clientDependencies: ['Existing checkout analytics access']
    },
    milestones: [
      { title: 'Research', deliveryOutcome: 'Annotated research findings', allocation: 400, evidenceRequirement: 'Annotated findings', deliveryDeadlineUtc: '2030-09-10T09:00:00.000Z', reviewWindowHours: 72 },
      { title: 'Delivery', deliveryOutcome: 'Production-ready handoff', allocation: 600, evidenceRequirement: 'Repository handoff notes', deliveryDeadlineUtc: '2030-09-24T09:00:00.000Z', reviewWindowHours: 72 }
    ],
    payment: { settlementToken: 'eUSD testnet demonstration token', network: 'Base Sepolia', totalAllocation: 1000, fundingDeadlineUtc: '2030-09-05T09:00:00.000Z', successFeeBps: 250, feeRecipient: 'PactFlow demonstration fee recipient' },
    evidence: { reviewDecision: 'Buyer records acceptance or a specific change request within the review window.', dependencyAcknowledgementRequired: true },
    intellectualProperty: { outcome: 'provider_retains_ownership_with_client_license', licenseScope: 'Project delivery use', confidentiality: 'mutual_confidentiality', confidentialityDuration: 'Two years' },
    changeControl: { proposalProcess: 'Either Contract Party may propose a written change request.', bilateralAmendmentOnly: true },
    notices: { buyerContact: 'buyer@example.test', serviceProviderContact: 'provider@example.test', exactVersionAcknowledgement: true }
  };
  return { ...draft, ...overrides };
}

test('a verified Supabase session exposes the durable profile and protects application routes', async () => {
  const calls = [];
  const profileCalls = [];
  const { server, origin } = await start({
    verifySupabaseSession: async token => {
      calls.push(token);
      if (token !== 'current-supabase-jwt') throw new Error('invalid token');
      return { id: '11111111-1111-4111-8111-111111111111', email: 'buyer@example.com' };
    },
    loadProfile: async ({ userId, accessToken }) => {
      profileCalls.push({ userId, accessToken });
      return { id: userId, displayName: 'Buyer', email: 'buyer@example.com' };
    }
  });
  try {
    const session = await request(origin, '/api/session', { token: 'current-supabase-jwt' });
    assert.equal(session.status, 200);
    assert.deepEqual(await session.json(), {
      user: {
        id: '11111111-1111-4111-8111-111111111111',
        email: 'buyer@example.com',
        profile: {
          id: '11111111-1111-4111-8111-111111111111',
          displayName: 'Buyer',
          email: 'buyer@example.com'
        }
      },
      mode: 'supabase-auth'
    });
    assert.deepEqual(calls, ['current-supabase-jwt']);
    assert.deepEqual(profileCalls, [{ userId: '11111111-1111-4111-8111-111111111111', accessToken: 'current-supabase-jwt' }]);
    assert.equal((await request(origin, '/api/home', { token: 'expired-supabase-jwt' })).status, 401);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('runtime configuration exposes the Privy app identifier without exposing privileged wallet credentials', () => {
  assert.deepEqual(runtimeConfigurationFromEnvironment({
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
    PRIVY_APP_ID: 'privy-app-id',
    PRIVY_APP_SECRET: 'must-not-reach-the-browser'
  }).publicSupabaseConfig, {
    url: 'https://project.supabase.co',
    publishableKey: 'sb_publishable_example',
    privyAppId: 'privy-app-id'
  });
});

test('the public browser configuration exposes the Privy app identifier without exposing privileged wallet credentials', async () => {
  const { server, origin } = await start({
    publicSupabaseConfig: {
      url: 'https://project.supabase.co',
      publishableKey: 'sb_publishable_example',
      privyAppId: 'privy-app-id'
    }
  });
  try {
    const response = await request(origin, '/api/auth/config');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      url: 'https://project.supabase.co',
      publishableKey: 'sb_publishable_example',
      privyAppId: 'privy-app-id',
      mode: 'supabase-auth'
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('an authenticated user can view only their provisioned workspaces', async () => {
  const workspaceCalls = [];
  const { server, origin } = await start({
    verifySupabaseSession: async token => {
      if (token !== 'workspace-jwt') throw new Error('invalid token');
      return { id: '33333333-3333-4333-8333-333333333333', email: 'case.officer@example.com' };
    },
    loadWorkspaces: async input => {
      workspaceCalls.push(input);
      return [{ id: '44444444-4444-4444-8444-444444444444', name: 'Case Officer', kind: 'personal', membershipRole: 'owner' }];
    }
  });
  try {
    const response = await request(origin, '/api/workspaces', { token: 'workspace-jwt' });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      workspaces: [{ id: '44444444-4444-4444-8444-444444444444', name: 'Case Officer', kind: 'personal', membershipRole: 'owner' }]
    });
    assert.deepEqual(workspaceCalls, [{
      userId: '33333333-3333-4333-8333-333333333333',
      accessToken: 'workspace-jwt'
    }]);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('an authenticated user receives only their durable Home data', async () => {
  const homeCalls = [];
  const { server, origin } = await start({
    verifySupabaseSession: async token => {
      if (token !== 'home-jwt') throw new Error('invalid token');
      return { id: '55555555-5555-4555-8555-555555555555', email: 'member@example.com' };
    },
    loadHome: async input => {
      homeCalls.push(input);
      return {
        workspaces: [{ id: '66666666-6666-4666-8666-666666666666', name: 'Member', kind: 'personal', membershipRole: 'owner' }],
        contracts: [{ id: '77777777-7777-4777-8777-777777777777', status: 'negotiation', latestVersionNumber: 2, workspaceName: 'Member' }]
      };
    }
  });
  try {
    assert.equal((await request(origin, '/api/home', { token: 'wrong' })).status, 401);
    const response = await request(origin, '/api/home', { token: 'home-jwt' });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      home: {
        workspaces: [{ id: '66666666-6666-4666-8666-666666666666', name: 'Member', kind: 'personal', membershipRole: 'owner' }],
        contracts: [{ id: '77777777-7777-4777-8777-777777777777', status: 'negotiation', latestVersionNumber: 2, workspaceName: 'Member' }]
      }
    });
    assert.deepEqual(homeCalls, [{
      userId: '55555555-5555-4555-8555-555555555555',
      accessToken: 'home-jwt'
    }]);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('the Home loader queries the caller workspace membership and RLS-visible Contracts', async () => {
  const calls = [];
  const loadHome = createHomeLoader(
    { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_example' },
    () => ({
      rpc: async name => { calls.push({ operation: 'rpc', name }); return { error: null }; },
      from: table => {
        calls.push({ operation: 'from', table });
        if (table === 'workspace_memberships') return {
          select: fields => ({
            eq: async (column, value) => {
              calls.push({ operation: 'workspace-query', fields, column, value });
              return { data: [{ membership_role: 'owner', workspaces: { id: 'workspace-id', name: 'Member', kind: 'personal' } }], error: null };
            }
          })
        };
        return {
          select: fields => ({
            order: async (column, options) => {
              calls.push({ operation: 'contract-query', fields, column, options });
              return { data: [{ id: 'contract-id', status: 'active', contract_versions: [{ version_number: 1 }, { version_number: 3 }], contract_parties: [{ workspace_id: 'workspace-id' }] }], error: null };
            }
          })
        };
      }
    })
  );

  assert.deepEqual(await loadHome({ userId: 'profile-id', accessToken: 'access-token' }), {
    workspaces: [{ id: 'workspace-id', name: 'Member', kind: 'personal', membershipRole: 'owner' }],
    contracts: [{ id: 'contract-id', status: 'active', latestVersionNumber: 3, workspaceName: 'Member' }]
  });
  assert.deepEqual(calls[0], { operation: 'rpc', name: 'ensure_profile' });
  assert.ok(calls.some(call => call.operation === 'workspace-query' && call.fields === 'membership_role, workspaces!inner(id, name, kind)' && call.column === 'profile_id' && call.value === 'profile-id'));
  assert.ok(calls.some(call => call.operation === 'contract-query' && call.fields === 'id, status, contract_versions(version_number), contract_parties(workspace_id)' && call.column === 'updated_at' && call.options.ascending === false));
});

test('the browser receives only Supabase public configuration', async () => {
  const { server, origin } = await start({
    publicSupabaseConfig: { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_example' }
  });
  try {
    const config = await request(origin, '/api/auth/config');
    assert.equal(config.status, 200);
    assert.deepEqual(await config.json(), {
      url: 'https://project.supabase.co',
      publishableKey: 'sb_publishable_example',
      mode: 'supabase-auth'
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('a verified user without a profile is provisioned into incomplete setup before profile access is checked', async () => {
  const calls = [];
  const loadProfile = createProfileLoader(
    { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_example' },
    () => ({
      rpc: async name => {
        calls.push({ operation: 'rpc', name });
        return { error: null };
      },
      from: table => ({
        select: fields => ({
          eq: (column, value) => ({
            single: async () => {
              calls.push({ operation: 'select', table, fields, column, value });
              return { data: { id: value, email: 'new@example.com', display_name: 'New participant', onboarding_completed_at: null }, error: null };
            }
          })
        })
      })
    })
  );

  assert.deepEqual(
    await loadProfile({ userId: '22222222-2222-4222-8222-222222222222', accessToken: 'new-participant-jwt' }),
    { id: '22222222-2222-4222-8222-222222222222', email: 'new@example.com', displayName: 'New participant', onboardingCompletedAt: null }
  );
  assert.deepEqual(calls, [
    { operation: 'rpc', name: 'ensure_profile' },
    { operation: 'select', table: 'profiles', fields: 'id, email, display_name, onboarding_completed_at', column: 'id', value: '22222222-2222-4222-8222-222222222222' }
  ]);
});

test('a verified user can complete first-time setup without choosing a local demo role', async () => {
  const completed = [];
  const { server, origin } = await start({
    verifySupabaseSession: async token => {
      if (token !== 'new-participant-jwt') throw new Error('invalid token');
      return { id: '22222222-2222-4222-8222-222222222222', email: 'new@example.com' };
    },
    loadProfile: async ({ userId }) => ({ id: userId, displayName: 'New participant', email: 'new@example.com', onboardingCompletedAt: null }),
    completeProfileOnboarding: async input => {
      completed.push(input);
      return { id: input.userId, displayName: 'New participant', email: 'new@example.com', onboardingCompletedAt: '2026-08-06T00:00:00.000Z' };
    }
  });
  try {
    assert.equal((await request(origin, '/api/onboarding/complete', { method: 'POST' })).status, 401);
    const completedResponse = await request(origin, '/api/onboarding/complete', { method: 'POST', token: 'new-participant-jwt' });
    assert.equal(completedResponse.status, 200);
    assert.equal((await completedResponse.json()).profile.onboardingCompletedAt, '2026-08-06T00:00:00.000Z');
    assert.deepEqual(completed, [{ userId: '22222222-2222-4222-8222-222222222222', accessToken: 'new-participant-jwt' }]);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('a verified Contract Party can create a durable private Contract and invite an exact email address', async () => {
  const calls = [];
  const workflow = createContractWorkflow(
    { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_example' },
    () => ({
      rpc: async (name, args) => {
        calls.push({ name, args });
        if (name === 'create_private_contract') return { data: 'contract-id', error: null };
        if (name === 'create_contract_invitation') return { data: 'invitation-id', error: null };
        return { data: null, error: { message: 'unexpected call' } };
      }
    })
  );

  const contract = await workflow.create({
    userId: 'profile-id',
    accessToken: 'access-token',
    name: 'Checkout redesign',
    scope: 'Redesign the checkout flow.',
    counterpartyEmail: 'seller@example.com'
  });
  assert.deepEqual(contract, { id: 'contract-id' });
  const invitation = await workflow.invite({
    userId: 'profile-id',
    accessToken: 'access-token',
    contractId: 'contract-id',
    email: 'seller@example.com'
  });
  assert.deepEqual(invitation, { id: 'invitation-id' });
  assert.deepEqual(calls, [
    { name: 'create_private_contract', args: { contract_name: 'Checkout redesign', contract_scope: 'Redesign the checkout flow.', counterparty_email: 'seller@example.com' } },
    { name: 'create_contract_invitation', args: { target_contract_id: 'contract-id', invitee_email: 'seller@example.com' } }
  ]);
});

test('the authenticated API does not create a durable Contract without a Supabase session', async () => {
  const calls = [];
  const { server, origin } = await start({
    verifySupabaseSession: async token => {
      if (token !== 'durable-jwt') throw new Error('invalid token');
      return { id: 'profile-id', email: 'buyer@example.com' };
    },
    contractWorkflow: {
      create: async input => { calls.push({ operation: 'create', input }); return { id: 'contract-id' }; },
      invite: async input => { calls.push({ operation: 'invite', input }); return { id: 'invitation-id' }; }
    }
  });
  try {
    const body = { name: 'Checkout redesign', scope: 'Redesign the checkout flow.', counterpartyEmail: 'seller@example.com' };
    assert.equal((await request(origin, '/api/contracts', { method: 'POST', body })).status, 401);
    const created = await request(origin, '/api/contracts', { method: 'POST', token: 'durable-jwt', body });
    assert.equal(created.status, 201);
    assert.deepEqual(await created.json(), { contract: { id: 'contract-id' }, invitation: { id: 'invitation-id' } });
    assert.deepEqual(calls, [
      { operation: 'create', input: { ...body, userId: 'profile-id', accessToken: 'durable-jwt' } },
      { operation: 'invite', input: { userId: 'profile-id', accessToken: 'durable-jwt', contractId: 'contract-id', email: 'seller@example.com' } }
    ]);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('only a verified signed-in Profile can submit an invitation acceptance to the durable workflow', async () => {
  const calls = [];
  const { server, origin } = await start({
    verifySupabaseSession: async token => {
      if (token !== 'invited-profile-jwt') throw new Error('invalid token');
      return { id: 'invited-profile-id', email: 'seller@example.com' };
    },
    contractWorkflow: {
      accept: async input => { calls.push(input); return { id: 'invitation-id' }; }
    }
  });
  try {
    assert.equal((await request(origin, '/api/invitations/invitation-id/accept', { method: 'POST' })).status, 401);
    const accepted = await request(origin, '/api/invitations/invitation-id/accept', { method: 'POST', token: 'invited-profile-jwt' });
    assert.equal(accepted.status, 200);
    assert.deepEqual(await accepted.json(), { invitation: { id: 'invitation-id' } });
    assert.deepEqual(calls, [{ userId: 'invited-profile-id', accessToken: 'invited-profile-jwt', invitationId: 'invitation-id' }]);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('a verified Contract Party can read and save a validated durable Contract draft', async () => {
  const calls = [];
  const draft = {
    id: 'contract-id',
    status: 'negotiation',
    versionNumber: 1,
    scope: { title: 'Checkout redesign', description: 'Redesign the checkout flow.' },
    milestones: [
      { title: 'Research', allocation: 400, evidenceRequirement: 'Annotated findings', deliveryDeadlineUtc: '2026-09-10T09:00:00.000Z', reviewWindowHours: 48 },
      { title: 'Delivery', allocation: 600, evidenceRequirement: 'Production-ready handoff', deliveryDeadlineUtc: '2026-09-24T09:00:00.000Z', reviewWindowHours: 72 }
    ],
    totalAllocation: 1000,
    successFeeBps: 250,
    authority: { name: 'PactFlow Simulation Authority', jurisdictionLabel: 'Testnet simulation', rulesetVersion: 'v1' },
    paymentAuthority: 'not configured'
  };
  const { server, origin } = await start({
    verifySupabaseSession: async token => {
      if (token !== 'party-jwt') throw new Error('invalid token');
      return { id: 'party-id', email: 'party@example.com' };
    },
    contractWorkflow: {
      getDraft: async input => { calls.push({ operation: 'getDraft', input }); return draft; },
      saveDraft: async input => { calls.push({ operation: 'saveDraft', input }); return draft; }
    }
  });
  try {
    assert.equal((await request(origin, '/api/contracts/contract-id')).status, 401);
    const loaded = await request(origin, '/api/contracts/contract-id', { token: 'party-jwt' });
    assert.equal(loaded.status, 200);
    assert.deepEqual(await loaded.json(), { contract: draft });

    const changes = {
      scope: draft.scope,
      milestones: draft.milestones,
      totalAllocation: 1000,
      successFeeBps: 250
    };
    const saved = await request(origin, '/api/contracts/contract-id', { token: 'party-jwt', method: 'PUT', body: changes });
    assert.equal(saved.status, 200);
    assert.deepEqual(await saved.json(), { contract: draft });
    assert.deepEqual(calls, [
      { operation: 'getDraft', input: { userId: 'party-id', accessToken: 'party-jwt', contractId: 'contract-id' } },
      { operation: 'saveDraft', input: { userId: 'party-id', accessToken: 'party-jwt', contractId: 'contract-id', ...changes } }
    ]);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('a verified Contract Party reviews and accepts one exact durable Contract Version', async () => {
  const calls = [];
  const review = {
    id: 'contract-id',
    status: 'negotiation',
    version: {
      id: 'version-id',
      number: 2,
      hash: 'version-hash',
      sections: [{ type: 'scope', terms: { title: 'Checkout redesign', description: 'Redesign the checkout flow.' } }]
    },
    acceptances: [{ contractPartyId: 'buyer-party-id', acceptedAt: '2026-08-07T00:00:00.000Z' }],
    requiredPartyCount: 2,
    paymentAuthority: 'not configured'
  };
  const { server, origin } = await start({
    verifySupabaseSession: async token => {
      if (token !== 'party-jwt') throw new Error('invalid token');
      return { id: 'party-id', email: 'party@example.com' };
    },
    contractWorkflow: {
      getReview: async input => { calls.push({ operation: 'getReview', input }); return review; },
      acceptVersion: async input => { calls.push({ operation: 'acceptVersion', input }); return review; }
    }
  });
  try {
    assert.equal((await request(origin, '/api/contracts/contract-id/review')).status, 401);
    const loaded = await request(origin, '/api/contracts/contract-id/review', { token: 'party-jwt' });
    assert.equal(loaded.status, 200);
    assert.deepEqual(await loaded.json(), { review });

    assert.equal((await request(origin, '/api/contracts/contract-id/versions/version-id/acceptances', { method: 'POST' })).status, 401);
    const accepted = await request(origin, '/api/contracts/contract-id/versions/version-id/acceptances', { method: 'POST', token: 'party-jwt' });
    assert.equal(accepted.status, 200);
    assert.deepEqual(await accepted.json(), { review });
    assert.deepEqual(calls, [
      { operation: 'getReview', input: { userId: 'party-id', accessToken: 'party-jwt', contractId: 'contract-id' } },
      { operation: 'acceptVersion', input: { userId: 'party-id', accessToken: 'party-jwt', contractId: 'contract-id', versionId: 'version-id' } }
    ]);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('the review workflow reads RLS-visible Version terms and accepts only its returned Version ID', async () => {
  const calls = [];
  const workflow = createContractWorkflow(
    { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_example' },
    () => ({
      rpc: async (name, args) => {
        calls.push({ operation: 'rpc', name, args });
        return { data: 'acceptance-id', error: null };
      },
      from: table => ({
        select: fields => ({
          eq: (column, value) => ({
            single: async () => {
              calls.push({ operation: 'review-query', table, fields, column, value });
              return {
                data: {
                  id: 'contract-id',
                  status: 'negotiation',
                  contract_parties: [
                    { id: 'buyer-party-id', profiles: { display_name: 'Buyer' } },
                    { id: 'seller-party-id', profiles: { display_name: 'Seller' } }
                  ],
                  contract_versions: [{
                    id: 'version-id', version_number: 2, version_hash: 'version-hash', authority_snapshot: { authority_name: 'PactFlow Simulation Authority' },
                    contract_sections: [{ section_type: 'scope', position: 0, terms: { title: 'Checkout redesign' } }],
                    contract_acceptances: [{ contract_party_id: 'buyer-party-id', accepted_at: '2026-08-07T00:00:00.000Z' }]
                  }]
                },
                error: null
              };
            }
          })
        })
      })
    })
  );

  const review = await workflow.acceptVersion({ accessToken: 'party-jwt', contractId: 'contract-id', versionId: 'version-id' });
  assert.deepEqual(review, {
    id: 'contract-id', status: 'negotiation',
    version: {
      id: 'version-id', number: 2, hash: 'version-hash', acceptanceReadyAt: undefined, authority: { authority_name: 'PactFlow Simulation Authority' },
      sections: [{ type: 'scope', terms: { title: 'Checkout redesign' } }]
    },
    parties: [
      { id: 'buyer-party-id', label: 'Buyer', acceptedAt: '2026-08-07T00:00:00.000Z' },
      { id: 'seller-party-id', label: 'Seller', acceptedAt: null }
    ],
    requiredSections: [
      { type: 'parties', complete: false }, { type: 'scope', complete: true }, { type: 'milestones', complete: false },
      { type: 'payment', complete: false }, { type: 'evidence', complete: false }, { type: 'intellectual_property', complete: false },
      { type: 'change_control', complete: false }, { type: 'dispute_resolution', complete: false }, { type: 'notices', complete: false }
    ],
    canAccept: false,
    paymentAuthority: 'not configured'
  });
  assert.ok(calls.some(call => call.operation === 'rpc' && call.name === 'accept_contract_version' && call.args.target_contract_id === 'contract-id' && call.args.target_version_id === 'version-id'));
  assert.ok(calls.some(call => call.operation === 'review-query' && call.table === 'contracts' && call.column === 'id' && call.value === 'contract-id'));
});

test('the durable draft workflow rejects a non-conserving milestone allocation before it reaches Supabase', async () => {
  const calls = [];
  const workflow = createContractWorkflow(
    { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_example' },
    () => ({ rpc: async (name, args) => { calls.push({ name, args }); return { data: 'version-id', error: null }; } })
  );
  await assert.rejects(
    workflow.saveDraft({
      accessToken: 'party-jwt',
      contractId: 'contract-id',
      ...validServiceEngagementDraft({ payment: { ...validServiceEngagementDraft().payment, totalAllocation: 999 } })
    }),
    /Milestone allocations must equal the Contract total allocation/
  );
  assert.deepEqual(calls, []);
});

test('the durable draft workflow refuses to share an incomplete Service Engagement template', async () => {
  const calls = [];
  const workflow = createContractWorkflow(
    { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_example' },
    () => ({ rpc: async (name, args) => { calls.push({ name, args }); return { data: 'version-id', error: null }; } })
  );

  await assert.rejects(
    workflow.saveDraft({
      accessToken: 'party-jwt',
      contractId: 'contract-id',
      ...validServiceEngagementDraft({ scope: { ...validServiceEngagementDraft().scope, outcome: '' } })
    }),
    /Scope outcome is required/
  );
  assert.deepEqual(calls, []);
});

test('the durable draft workflow submits every validated Service Engagement section to the protected RPC', async () => {
  const calls = [];
  const workflow = createContractWorkflow(
    { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_example' },
    () => ({
      rpc: async (name, args) => { calls.push({ name, args }); return { data: 'version-id', error: null }; },
      from: table => ({
        select: () => ({
          eq: () => table === 'resolution_authorities'
            ? Promise.resolve({ data: [{ id: 'authority-id', display_name: 'PactFlow Simulation Authority', jurisdiction_label: 'Testnet simulation', ruleset_version: 'v1' }], error: null })
            : ({ single: async () => ({
              data: {
                id: 'contract-id', status: 'negotiation',
                contract_versions: [{ id: 'version-id', version_number: 2, selected_authority_id: 'authority-id', authority_snapshot: { authority_name: 'PactFlow Simulation Authority' }, acceptance_ready_at: '2030-09-01T00:00:00.000Z', contract_sections: [] }]
              }, error: null
            }) })
        })
      })
    })
  );

  const draft = validServiceEngagementDraft();
  await workflow.saveDraft({ accessToken: 'party-jwt', contractId: 'contract-id', ...draft });
  assert.deepEqual(calls[0], {
    name: 'update_contract_draft',
    args: {
      target_contract_id: 'contract-id',
      draft_sections: {
        parties: draft.parties,
        scope: draft.scope,
        milestones: { items: draft.milestones },
        payment: { ...draft.payment, fundingWindowHours: 48, paymentAuthority: 'not_configured' },
        evidence: draft.evidence,
        intellectual_property: draft.intellectualProperty,
        change_control: draft.changeControl,
        notices: draft.notices
      },
      selected_authority_id: '00000000-0000-4000-8000-000000000201'
    }
  });
});
