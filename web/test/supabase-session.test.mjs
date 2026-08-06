import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp, createContractWorkflow, createHomeLoader, createProfileLoader } from '../src/server.mjs';

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
