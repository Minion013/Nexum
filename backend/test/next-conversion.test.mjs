import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createApp, localTestProfileFromEnvironment } from '../src/server.mjs';

async function start(options) {
  const server = createApp(options);
  await new Promise(resolve => server.listen(0, resolve));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function request(origin, path, { token, headers = {} } = {}) {
  return fetch(`${origin}${path}`, {
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }
  });
}

test('landing and login are typed App Router pages without public-page rewrites', async () => {
  const landing = await readFile(new URL('../../frontend/app/page.tsx', import.meta.url), 'utf8');
  const login = await readFile(new URL('../../frontend/app/login/page.tsx', import.meta.url), 'utf8');
  const nextConfig = await readFile(new URL('../../frontend/next.config.ts', import.meta.url), 'utf8');

  assert.match(landing, /export default function LandingPage/);
  assert.match(landing, /href="\/login"/);
  assert.doesNotMatch(landing, /<script/);
  assert.match(login, /'use client'/);
  assert.match(login, /signInWithOtp/);
  assert.match(login, /verifyOtp/);
  assert.match(login, /\/api\/session/);
  assert.match(login, /\/api\/onboarding\/complete/);
  assert.doesNotMatch(nextConfig, /source: '\/'/);
  assert.doesNotMatch(nextConfig, /source: '\/login'/);
});

test('signed-in Dashboard uses typed shell and Home workflow without a static rewrite', async () => {
  const home = await readFile(new URL('../../frontend/app/home/page.tsx', import.meta.url), 'utf8');
  const shell = await readFile(new URL('../../frontend/src/signed-in/app-shell.tsx', import.meta.url), 'utf8');
  const dashboard = await readFile(new URL('../../frontend/src/dashboard/dashboard.tsx', import.meta.url), 'utf8');
  const nextConfig = await readFile(new URL('../../frontend/next.config.ts', import.meta.url), 'utf8');

  assert.match(home, /SignedInShell/);
  assert.match(home, /DashboardPage/);
  assert.match(shell, /\/api\/session/);
  assert.match(shell, /\/api\/notifications/);
  assert.match(shell, /aria-label="Open navigation"/);
  assert.match(shell, /aria-expanded/);
  assert.match(shell, /resolvePrivateAvatar/);
  assert.match(shell, /Notifications unavailable/);
  assert.match(shell, /Profile Settings/);
  assert.match(dashboard, /\/api\/home/);
  assert.match(dashboard, /Loading your Contract actions/);
  assert.match(dashboard, /Dashboard could not be loaded/);
  assert.doesNotMatch(nextConfig, /source: '\/home'/);
});

test('People and Contacts use typed routes and the authenticated connection workflow', async () => {
  const peopleRoute = await readFile(new URL('../../frontend/app/people/page.tsx', import.meta.url), 'utf8');
  const contactsRoute = await readFile(new URL('../../frontend/app/contacts/page.tsx', import.meta.url), 'utf8');
  const peopleClient = await readFile(new URL('../../frontend/src/people/people.tsx', import.meta.url), 'utf8');
  const nextConfig = await readFile(new URL('../../frontend/next.config.ts', import.meta.url), 'utf8');

  assert.match(peopleRoute, /SignedInShell/);
  assert.match(peopleRoute, /PeoplePage/);
  assert.match(contactsRoute, /people\/page/);
  assert.match(peopleClient, /\/api\/people/);
  assert.match(peopleClient, /\/api\/people\/connections/);
  assert.match(peopleClient, /people-search/);
  assert.match(peopleClient, /people-access-note/);
  assert.match(peopleClient, /accept/);
  assert.match(peopleClient, /decline/);
  assert.match(peopleClient, /withdraw/);
  assert.match(peopleClient, /remove/);
  assert.match(peopleClient, /block/);
  assert.doesNotMatch(nextConfig, /source: '\/people'/);
  assert.doesNotMatch(nextConfig, /source: '\/contacts'/);
});

test('Contracts and the initial authoring entry use typed routes, protected choices, and persisted handoff', async () => {
  const contractsRoute = await readFile(new URL('../../frontend/app/contracts/page.tsx', import.meta.url), 'utf8');
  const contractsClient = await readFile(new URL('../../frontend/src/contracts/contracts.tsx', import.meta.url), 'utf8');
  const contractsPresentation = await readFile(new URL('../../frontend/src/contracts/presentation.ts', import.meta.url), 'utf8');
  const newEntryRoute = await readFile(new URL('../../frontend/app/contracts/new/choose-person/page.tsx', import.meta.url), 'utf8');
  const existingEntryRoute = await readFile(new URL('../../frontend/app/contracts/[contractId]/choose-person/page.tsx', import.meta.url), 'utf8');
  const projectDetailsRoute = await readFile(new URL('../../frontend/app/contracts/[contractId]/project-details/page.tsx', import.meta.url), 'utf8');
  const entryClient = await readFile(new URL('../../frontend/src/contracts/authoring-entry.tsx', import.meta.url), 'utf8');
  const nextConfig = await readFile(new URL('../../frontend/next.config.ts', import.meta.url), 'utf8');

  assert.match(contractsRoute, /SignedInShell/);
  assert.match(contractsRoute, /ContractsPage/);
  assert.match(contractsClient, /\/api\/contracts/);
  assert.match(contractsClient, /stage-filter/);
  assert.match(contractsClient, /responsibility-filter/);
  assert.match(contractsPresentation, /No Contracts match these filters/);
  assert.match(newEntryRoute, /AuthoringEntryPage/);
  assert.match(existingEntryRoute, /AuthoringEntryPage/);
  assert.match(projectDetailsRoute, /ProjectDetailsHandoffPage/);
  assert.match(entryClient, /\/api\/people/);
  assert.match(entryClient, /\/api\/contracts/);
  assert.match(entryClient, /exact-email/);
  assert.match(entryClient, /selectedPersonId/);
  assert.match(entryClient, /project-details/);
  assert.doesNotMatch(entryClient, /counterpartyProfileId/);
  assert.doesNotMatch(nextConfig, /source: '\/contracts'/);
});

test('Profile Settings uses a typed route and the protected private-avatar workflow', async () => {
  const settingsRoute = await readFile(new URL('../../frontend/app/settings/page.tsx', import.meta.url), 'utf8');
  const settingsClient = await readFile(new URL('../../frontend/src/settings/settings.tsx', import.meta.url), 'utf8');
  const settingsPresentation = await readFile(new URL('../../frontend/src/settings/presentation.ts', import.meta.url), 'utf8');
  const authBrowser = await readFile(new URL('../../frontend/src/auth/browser.ts', import.meta.url), 'utf8');
  const nextConfig = await readFile(new URL('../../frontend/next.config.ts', import.meta.url), 'utf8');

  assert.match(settingsRoute, /SignedInShell/);
  assert.match(settingsRoute, /SettingsPage/);
  assert.match(settingsClient, /Loading your Profile Settings/);
  assert.match(settingsClient, /api\/profile\/settings/);
  assert.match(settingsClient, /validateSettings/);
  assert.match(settingsClient, /resolvePrivateAvatar/);
  assert.match(settingsClient, /Choose a JPEG, PNG, or WebP/);
  assert.match(settingsClient, /Profile Settings could not be saved/);
  assert.match(settingsClient, /onError/);
  assert.match(settingsPresentation, /avatarPresentation/);
  assert.match(settingsPresentation, /avatarFileError/);
  assert.match(authBrowser, /createSignedUrl/);
  assert.match(authBrowser, /profile-images/);
  assert.doesNotMatch(nextConfig, /source: '\/settings'/);
});

test('Notifications uses a typed route, private API workflow, and explicit state coverage', async () => {
  const route = await readFile(new URL('../../frontend/app/notifications/page.tsx', import.meta.url), 'utf8');
  const notifications = await readFile(new URL('../../frontend/src/notifications/notifications.tsx', import.meta.url), 'utf8');
  const presentation = await readFile(new URL('../../frontend/src/notifications/presentation.tsx', import.meta.url), 'utf8');
  const shell = await readFile(new URL('../../frontend/src/signed-in/app-shell.tsx', import.meta.url), 'utf8');
  const nextConfig = await readFile(new URL('../../frontend/next.config.ts', import.meta.url), 'utf8');
  const layout = await readFile(new URL('../../frontend/app/layout.tsx', import.meta.url), 'utf8');

  assert.match(route, /SignedInShell/);
  assert.match(route, /NotificationsPage/);
  assert.match(notifications, /\/api\/notifications/);
  assert.match(notifications, /markNotificationRead/);
  for (const stateText of ['Loading your private inbox', 'You have no notifications yet', 'Notifications could not be loaded', 'Mark read']) assert.match(presentation, new RegExp(stateText));
  assert.match(shell, /markNotificationRead/);
  assert.match(layout, /notifications\.css/);
  assert.doesNotMatch(nextConfig, /source: '\/notifications'/);
});

test('the invitation URL is a typed dynamic route with protected state handling', async () => {
  const invitation = await readFile(new URL('../../frontend/app/invitations/[invitationId]/page.tsx', import.meta.url), 'utf8');
  const invitationClient = await readFile(new URL('../../frontend/src/invitations/acceptance.tsx', import.meta.url), 'utf8');
  const nextConfig = await readFile(new URL('../../frontend/next.config.ts', import.meta.url), 'utf8');

  assert.match(invitation, /InvitationAcceptance/);
  assert.match(invitationClient, /\/api\/invitations/);
  assert.match(invitationClient, /eligible/);
  assert.match(invitationClient, /expired/);
  assert.match(invitationClient, /resolved/);
  assert.match(invitationClient, /unauthenticated/);
  assert.doesNotMatch(nextConfig, /source: '\/invitations\/:invitationId'/);
});

test('authentication boundary covers valid, expired, unauthenticated, unavailable, and invalid requests', async () => {
  const calls = [];
  const { server, origin } = await start({
    publicSupabaseConfig: { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_example' },
    verifySupabaseSession: async token => {
      calls.push(token);
      if (token !== 'current-token') throw new Error('expired');
      return { id: 'profile-id', email: 'person@example.test' };
    },
    loadProfile: async ({ userId, accessToken }) => ({ id: userId, email: 'person@example.test', displayName: 'Person', accessToken })
  });
  try {
    const valid = await request(origin, '/api/session', { token: 'current-token' });
    assert.equal(valid.status, 200);
    assert.equal((await valid.json()).user.profile.displayName, 'Person');
    assert.equal((await request(origin, '/api/session', { token: 'expired-token' })).status, 401);
    assert.equal((await request(origin, '/api/session')).status, 401);
    assert.equal((await request(origin, '/api/home')).status, 401);
    assert.deepEqual(calls, ['current-token', 'expired-token', undefined, undefined]);
    assert.equal((await request(origin, '/api/not-a-real-route')).status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  const unavailable = await start({ publicSupabaseConfig: { url: null, publishableKey: null } });
  try {
    const config = await request(unavailable.origin, '/api/auth/config');
    assert.equal(config.status, 200);
    assert.deepEqual(await config.json(), { url: null, publishableKey: null, mode: 'supabase-auth' });
    assert.equal((await request(unavailable.origin, '/api/session')).status, 401);
  } finally {
    await new Promise(resolve => unavailable.server.close(resolve));
  }

  const localTestProfile = localTestProfileFromEnvironment({ PACTFLOW_LOCAL_TEST_EMAIL: 'pactflow-wallet-test@local.invalid' });
  const local = await start({ localTestProfile });
  try {
    const valid = await request(local.origin, '/api/session', { headers: { 'x-pactflow-local-test-email': localTestProfile.email } });
    assert.equal(valid.status, 200);
    assert.equal((await valid.json()).mode, 'local-test-auth');
    assert.equal((await request(local.origin, '/api/session', { headers: { 'x-pactflow-local-test-email': 'wrong@local.invalid' } })).status, 401);
  } finally {
    await new Promise(resolve => local.server.close(resolve));
  }
});

test('the loopback test email can persist a private Contract Draft handoff without granting counterparty access', async () => {
  const localTestProfile = localTestProfileFromEnvironment({ PACTFLOW_LOCAL_TEST_EMAIL: 'pactflow-wallet-test@local.invalid' });
  const { server, origin } = await start({ localTestProfile });
  const headers = { 'x-pactflow-local-test-email': localTestProfile.email };
  try {
    const before = await request(origin, '/api/contracts', { headers });
    assert.deepEqual(await before.json(), { contracts: [] });
    const invalid = await fetch(`${origin}/api/contracts`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Draft', scope: 'Scope', counterpartyEmail: 'not-an-email', initiatorResponsibility: 'buyer' }) });
    assert.equal(invalid.status, 422);
    const created = await fetch(`${origin}/api/contracts`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Identity refresh', scope: 'Refresh the identity system.', counterpartyEmail: 'person@example.com', initiatorResponsibility: 'buyer' }) });
    assert.equal(created.status, 201);
    const contractId = (await created.json()).contract.id;
    const listed = await request(origin, '/api/contracts', { headers });
    assert.equal((await listed.json()).contracts[0].counterparty, 'person@example.com');
    const draft = await request(origin, `/api/contracts/${contractId}`, { headers });
    assert.equal((await draft.json()).contract.sections.parties.counterparty_email, 'person@example.com');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
