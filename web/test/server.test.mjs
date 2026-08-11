import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer as createTcpServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createApp, runtimeConfigurationFromEnvironment } from '../src/server.mjs';
import { signedInNavigation } from '../public/signed-in-navigation.js';
import { authoringRoutes, contractDraftUpdate, reviewDefaults } from '../public/contract-authoring-flow.js';

async function request(server, path) {
  return fetch(`http://127.0.0.1:${server.address().port}${path}`);
}

const webRoot = fileURLToPath(new URL('..', import.meta.url));

async function unusedPort() {
  const listener = createTcpServer();
  await new Promise(resolve => listener.listen(0, resolve));
  const { port } = listener.address();
  await new Promise(resolve => listener.close(resolve));
  return port;
}

async function waitForHealth(url, process) {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (process.exitCode !== null) throw new Error(`PactFlow exited before becoming healthy (code ${process.exitCode}).`);
    try { return await fetch(url); } catch (error) { lastError = error; }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw lastError;
}

async function stop(process) {
  if (process.exitCode === null) {
    process.kill();
    await once(process, 'exit');
  }
}

test('production startup validates public configuration and renders a safe public entry', async () => {
  const port = await unusedPort();
  const serverProcess = spawn(process.execPath, ['src/server.mjs'], {
    cwd: webRoot,
    env: {
      ...process.env,
      PORT: String(port),
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_smoke_test',
      SUPABASE_SERVICE_ROLE_KEY: 'must-not-reach-the-browser'
    },
    stdio: 'ignore'
  });

  try {
    const health = await waitForHealth(`http://127.0.0.1:${port}/health`, serverProcess);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok', mode: 'supabase-auth', paymentAuthority: 'not configured' });

    const entry = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(entry.status, 200);
    assert.match(await entry.text(), /Testnet only\. No real funds\./);

    const browserConfig = await (await fetch(`http://127.0.0.1:${port}/api/auth/config`)).json();
    assert.equal('serviceRoleKey' in browserConfig, false);
  } finally {
    await stop(serverProcess);
  }
});

test('public entry and health check are safe to render', async () => {
  const server = createApp();
  await new Promise(resolve => server.listen(0, resolve));
  try {
    const health = await request(server, '/health');
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok', mode: 'supabase-auth', paymentAuthority: 'not configured' });
    const authConfig = await request(server, '/api/auth/config');
    assert.equal(authConfig.status, 200);
    const browserConfig = await authConfig.json();
    assert.deepEqual(Object.keys(browserConfig).filter(key => key !== 'privyAppId').sort(), ['mode', 'publishableKey', 'url']);
    assert.equal('privyAppSecret' in browserConfig, false);
    const entry = await request(server, '/');
    assert.equal(entry.status, 200);
    const entryMarkup = await entry.text();
    assert.match(entryMarkup, /PactFlow/);
    assert.match(entryMarkup, /Testnet only\. No real funds\./);
    assert.equal((await request(server, '/../.env')).status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('authenticated area pages are served from their canonical URLs', async () => {
  const server = createApp();
  await new Promise(resolve => server.listen(0, resolve));
  try {
    for (const path of [
      '/home',
      '/contracts',
      '/wallet',
      '/people',
      '/notifications',
      '/settings',
      '/authorities'
    ]) {
      const response = await request(server, path);
      assert.equal(response.status, 200, path);
      assert.match(await response.text(), /PactFlow/, path);
    }
    const home = await request(server, '/home');
    const homeMarkup = await home.text();
    for (const href of ['/home', '/contracts', '/wallet', '/people']) {
      assert.match(homeMarkup, new RegExp(`href="${href}"`), href);
    }
    assert.doesNotMatch(homeMarkup, /href="\/settings">Settings/);
    assert.match(homeMarkup, /What needs you now/);
    assert.match(homeMarkup, /Next milestones/);
    assert.match(homeMarkup, /Loading Contract actions/);
    assert.match(homeMarkup, /Needs your attention/);
    assert.match(homeMarkup, /dashboard\.bundle\.js/);
    assert.doesNotMatch(homeMarkup, /Recent Activity/);
    assert.ok(homeMarkup.indexOf('class="metric-grid') < homeMarkup.indexOf('id="action-list"'));
    assert.doesNotMatch(homeMarkup, /id="wallet-capability"/);
    const wallet = await request(server, '/wallet');
    const walletMarkup = await wallet.text();
    assert.match(walletMarkup, /Base Sepolia test wallet/);
    assert.match(walletMarkup, /Available MockEUSD/);
    assert.match(walletMarkup, /Contract Escrow Vaults/);
    assert.match(walletMarkup, /No wallet-wide transaction history/);
    assert.match(walletMarkup, /wallet\.bundle\.js/);
    assert.doesNotMatch(homeMarkup, />Workspace Settings</);
    assert.match(homeMarkup, /class="profile-name profile-name-loading"/);
    assert.match(homeMarkup, /aria-label="Loading profile" aria-busy="true"/);
    const contractsMarkup = await (await request(server, '/contracts')).text();
    for (const label of ['Stage', 'Your responsibility', 'Counterparty', 'Next milestone', 'Last activity', 'Action']) {
      assert.match(contractsMarkup, new RegExp(`>${label}<`), label);
    }
    assert.match(contractsMarkup, /<table class="contract-table">/);
    assert.match(contractsMarkup, /id="contract-records" class="mobile-records" aria-live="polite"/);
    assert.match(contractsMarkup, /contracts\.bundle\.js/);
    assert.match(contractsMarkup, /Create a Contract Draft/);
    assert.match(contractsMarkup, /href="\/contracts\/new\/choose-person"/);
    const authoringPages = authoringRoutes;
    for (const route of authoringPages) assert.equal((await request(server, route)).status, 200, route);
    for (const step of ['choose-person', 'project-details', 'review-terms', 'send']) {
      const response = await request(server, `/contracts/not-a-contract/${step}`);
      assert.equal(response.status, 200, step);
      assert.match(await response.text(), /Contract Draft steps/i);
    }
    const choosePersonMarkup = await (await request(server, '/contracts/new/choose-person')).text();
    assert.match(choosePersonMarkup, /Existing Person \(optional\)/);
    assert.match(choosePersonMarkup, /Continue and publish a private Contract Draft/);
    const reviewMarkup = await (await request(server, '/contracts/new/review-terms')).text();
    for (const label of ['Review terms', 'Milestones and payment', 'Required Acceptance Criterion', 'Evidence and change control']) assert.match(reviewMarkup, new RegExp(label, 'i'), label);
    const sendMarkup = await (await request(server, '/contracts/new/send')).text();
    assert.match(sendMarkup, /Publish Contract Draft/);
    assert.match(sendMarkup, /finalised Contract Version/);
    assert.doesNotMatch(contractsMarkup, /Workspace|Proposal|Agreement/);
    assert.doesNotMatch(contractsMarkup, /Private Draft|Private Contract/);
    const notifications = await request(server, '/notifications');
    assert.match(await notifications.text(), /Private inbox/);
    assert.match(await (await request(server, '/notifications')).text(), /notifications\.bundle\.js/);
    const settings = await (await request(server, '/settings')).text();
    assert.match(settings, /Choose profile image/);
    assert.match(settings, /class="discoverability-control"/);
    assert.doesNotMatch(settings, /Workspace Settings/);
    const detail = await request(server, '/contracts/not-a-contract');
    assert.equal(detail.status, 200);
    assert.match(await detail.text(), /Contract Draft/);
    assert.match(await (await request(server, '/contracts/not-a-contract')).text(), /Review the exact shared Version/);
    assert.match(await (await request(server, '/contracts/not-a-contract')).text(), /Escrow Vault/);
    assert.match(await (await request(server, '/contracts/not-a-contract')).text(), /No Escrow Vault has been deployed/);
    assert.match(await (await request(server, '/contracts/not-a-contract')).text(), /contract\.bundle\.js/);
    assert.equal((await request(server, '/contracts/not-a-contract/extra')).status, 404);
    for (const retiredPath of ['/workspace', '/workspace-list.html', '/workspace.js', '/workspace.css', '/workspace.bundle.js', '/contacts.html', '/api/workspaces']) {
      assert.equal((await request(server, retiredPath)).status, 404, retiredPath);
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('Contract Draft authoring composes a complete, ordered two-milestone Version before invitation', () => {
  const draft = { name: 'Website refresh', scope: 'Refresh the marketing site.', outcome: 'A working marketing site.', includedDeliverables: 'Design\nBuild', totalAllocation: '100', projectStartDateUtc: '2026-08-12T09:00', fundingDeadlineUtc: '2026-08-15T09:00', initiatorResponsibility: 'buyer', initiatorEmail: 'initiator@example.test', inviteEmail: 'counterparty@example.test' };
  const defaults = reviewDefaults(draft);
  assert.equal(defaults.milestoneOneReview, 72);
  const update = contractDraftUpdate(draft, '11111111-1111-4111-8111-111111111111');
  assert.deepEqual(update.parties.buyer.partyRef, 'initiating_party');
  assert.equal(update.milestones.length, 2);
  assert.ok(update.milestones.every(milestone => milestone.acceptanceCriteria.some(criterion => criterion.required)));
  assert.ok(update.payment.fundingDeadlineUtc < update.milestones[0].deliveryDeadlineUtc);
  assert.ok(update.milestones[0].deliveryDeadlineUtc < update.milestones[1].deliveryDeadlineUtc);
  assert.deepEqual(update.scope.excludedWork, ['Work not listed in the included deliverables.']);
  assert.equal(update.notices.buyerContact, 'initiator@example.test');
  assert.equal(update.notices.serviceProviderContact, 'counterparty@example.test');

  const unshared = contractDraftUpdate({ ...draft, inviteEmail: '' }, '11111111-1111-4111-8111-111111111111');
  assert.equal(unshared.notices.buyerContact, 'initiator@example.test');
  assert.equal(unshared.notices.serviceProviderContact, 'initiator@example.test');
});

test('every signed-in route keeps the four focused primary and mobile destinations', async () => {
  assert.deepEqual(signedInNavigation, [
    ['/home', 'Dashboard'], ['/contracts', 'Contracts'], ['/wallet', 'Wallet'], ['/people', 'People']
  ]);
  const server = createApp();
  await new Promise(resolve => server.listen(0, resolve));
  try {
    for (const path of ['/home', '/contracts', '/wallet', '/people', '/settings']) {
      const markup = await (await request(server, path)).text();
      const expectedLinks = ['/home', '/contracts', '/wallet', '/people'];
      for (const href of expectedLinks) assert.match(markup, new RegExp(`href="${href}"`), `${path} includes ${href}`);
      assert.doesNotMatch(markup, /href="\/settings">Settings/, `${path} keeps Settings out of primary navigation`);
      assert.doesNotMatch(markup, /bottom-nav[\s\S]*Notifications/, `${path} keeps Notifications out of mobile navigation`);
      assert.match(markup, /href="\/settings">Profile Settings/, `${path} keeps Profile Settings in the avatar menu`);
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('People is the canonical signed-in directory and legacy Contacts links safely reach it', async () => {
  const server = createApp();
  await new Promise(resolve => server.listen(0, resolve));
  try {
    for (const path of ['/people', '/contacts', '/settings']) {
      const response = await request(server, path);
      assert.equal(response.status, 200, path);
      assert.match(await response.text(), /PactFlow/, path);
    }
    const people = await (await request(server, '/people')).text();
    const contacts = await (await request(server, '/contacts')).text();
    assert.match(people, /Discover/);
    assert.match(people, /My network/);
    assert.match(people, /Requests/);
    assert.match(people, /id="people-status"/);
    assert.match(people, /id="people-access-note"/);
    assert.equal(contacts, people);
    assert.match(contacts, /href="\/people">People<\/a>/);
    assert.doesNotMatch(contacts, /Contacts directory/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('the exact invitation route serves the client-authenticated acceptance page', async () => {
  const server = createApp();
  await new Promise(resolve => server.listen(0, resolve));
  try {
    const invitation = await request(server, '/invitations/not-an-invitation');
    assert.equal(invitation.status, 200);
    const markup = await invitation.text();
    assert.match(markup, /Accept Contract invitation/);
    assert.match(markup, /invitation\.bundle\.js/);
    assert.equal((await request(server, '/invitations/not-an-invitation/extra')).status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('runtime configuration requires public Supabase authentication settings and keeps secrets out of it', () => {
  assert.throws(
    () => runtimeConfigurationFromEnvironment({ PORT: '3000' }),
    /SUPABASE_URL/
  );
  assert.throws(
    () => runtimeConfigurationFromEnvironment({ PORT: '3000', SUPABASE_URL: 'not-a-url', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example' }),
    /SUPABASE_URL/
  );

  assert.deepEqual(
    runtimeConfigurationFromEnvironment({
      PORT: '3001',
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
      SUPABASE_SECRET_KEY: 'must-not-be-exposed'
    }),
    {
      port: 3001,
      publicSupabaseConfig: { url: 'https://project.supabase.co', publishableKey: 'sb_publishable_example' }
    }
  );
});
