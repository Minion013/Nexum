import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer as createTcpServer } from 'node:net';
import { renderToStaticMarkup } from 'react-dom/server';
import { fileURLToPath } from 'node:url';
import { createApp, localTestProfileFromEnvironment } from '../../backend/src/server.mjs';
import { loadFrontendModule } from './load-frontend-module.mjs';

const frontendRoot = fileURLToPath(new URL('..', import.meta.url));
const nextBin = fileURLToPath(new URL('../../node_modules/next/dist/bin/next', import.meta.url));
async function loadNotificationPresentation() {
  return loadFrontendModule('src/notifications/presentation.tsx', { jsx: true, external: ['react', 'react/jsx-runtime'] });
}

async function loadAuthorityPresentation() {
  return loadFrontendModule('src/authorities/presentation.tsx', { jsx: true, external: ['react', 'react/jsx-runtime'] });
}

async function loadContractsPresentation() {
  return loadFrontendModule('src/contracts/presentation.ts');
}

async function loadAuthoringEntryPresentation() {
  return loadFrontendModule('src/contracts/authoring-entry-presentation.ts');
}

async function loadContractDetailPresentation() {
  return loadFrontendModule('src/contracts/detail-presentation.ts');
}

async function loadWalletPresentation() {
  return loadFrontendModule('src/wallet/presentation.tsx', { jsx: true, external: ['react', 'react/jsx-runtime'] });
}

async function loadWalletProvider() {
  return loadFrontendModule('src/wallet/provider.ts');
}

async function unusedPort() {
  const listener = createTcpServer();
  await new Promise(resolve => listener.listen(0, resolve));
  const { port } = listener.address();
  await new Promise(resolve => listener.close(resolve));
  return port;
}

async function waitForNext(origin, process) {
  let lastError;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (process.exitCode !== null) throw new Error(`Next exited before becoming ready (code ${process.exitCode}).`);
    try {
      const response = await fetch(`${origin}/`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw lastError ?? new Error('Next did not become ready.');
}

async function stop(process) {
  if (process.exitCode === null) {
    process.kill();
    await once(process, 'exit');
  }
}

test('built Next routes render public landing/login and truthful invalid-route states', async () => {
  const backend = createApp({
    publicSupabaseConfig: { url: null, publishableKey: null },
    localTestProfile: localTestProfileFromEnvironment({ PACTFLOW_LOCAL_TEST_EMAIL: 'pactflow-wallet-test@local.invalid' })
  });
  await new Promise(resolve => backend.listen(0, resolve));
  const nextPort = await unusedPort();
  const next = spawn(process.execPath, [nextBin, 'start', '-p', String(nextPort)], {
    cwd: frontendRoot,
    env: { ...process.env, BACKEND_URL: `http://127.0.0.1:${backend.address().port}` },
    stdio: 'ignore'
  });
  const origin = `http://127.0.0.1:${nextPort}`;
  const backendOrigin = `http://127.0.0.1:${backend.address().port}`;
  try {
    await waitForNext(origin, next);
    const landing = await fetch(`${origin}/`);
    assert.equal(landing.status, 200);
    assert.match(await landing.text(), /Make every creative/);
    const login = await fetch(`${origin}/login`);
    assert.equal(login.status, 200);
    assert.match(await login.text(), /Sign in or create your account/);
    const home = await fetch(`${origin}/home`);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Your work, with the next step clear/);
    const wallet = await fetch(`${origin}/wallet`);
    assert.equal(wallet.status, 200);
    const walletMarkup = await wallet.text();
    assert.match(walletMarkup, /Personal test funds, kept separate/);
    assert.match(walletMarkup, /Contract Escrow Vault funds are separate locked pots/);
    assert.match(walletMarkup, /Preparing the typed wallet connection boundary/);
    const localConfig = await fetch(`${backendOrigin}/api/auth/config`);
    const localConfigBody = await localConfig.text();
    assert.equal(localConfig.status, 200, localConfigBody);
    const localConfigPayload = JSON.parse(localConfigBody);
    assert.equal(localConfigPayload.localTestEmail, 'pactflow-wallet-test@local.invalid');
    assert.equal('serviceRoleKey' in localConfigPayload, false);
    const localSession = await fetch(`${backendOrigin}/api/session`, { headers: { 'x-pactflow-local-test-email': 'pactflow-wallet-test@local.invalid' } });
    assert.equal(localSession.status, 200);
    assert.equal((await localSession.json()).mode, 'local-test-auth');
    const proxiedHealth = await fetch(`${origin}/health`);
    assert.equal(proxiedHealth.status, 200);
    assert.deepEqual(await proxiedHealth.json(), { status: 'ok', mode: 'supabase-auth', paymentAuthority: 'not configured' });
    const proxiedSession = await fetch(`${origin}/api/session`, { headers: { 'x-pactflow-local-test-email': 'pactflow-wallet-test@local.invalid' } });
    assert.equal(proxiedSession.status, 200);
    assert.equal((await proxiedSession.json()).mode, 'local-test-auth');
    assert.equal((await fetch(`${backendOrigin}/api/session`, { headers: { 'x-pactflow-local-test-email': 'wrong@local.invalid' } })).status, 401);
    const people = await fetch(`${origin}/people`);
    assert.equal(people.status, 200);
    const peopleMarkup = await people.text();
    assert.match(peopleMarkup, /Professional connections, kept separate from access/);
    assert.match(peopleMarkup, /Discover People/);
    assert.match(peopleMarkup, /people-search/);
    const contacts = await fetch(`${origin}/contacts`);
    assert.equal(contacts.status, 200);
    const contactsMarkup = await contacts.text();
    assert.match(contactsMarkup, /Professional connections, kept separate from access/);
    assert.match(contactsMarkup, /href="\/people"/);
    const contracts = await fetch(`${origin}/contracts`);
    assert.equal(contracts.status, 200);
    assert.match(await contracts.text(), /Your Contract work, in one place/);
    const contractDetail = await fetch(`${origin}/contracts/00000000-0000-4000-8000-000000000300`);
    assert.equal(contractDetail.status, 200);
    assert.match(await contractDetail.text(), /Loading Contract detail/);
    const choosePerson = await fetch(`${origin}/contracts/new/choose-person`);
    assert.equal(choosePerson.status, 200);
    assert.match(await choosePerson.text(), /counterparty choices/);
    const projectDetails = await fetch(`${origin}/contracts/00000000-0000-4000-8000-000000000300/project-details`);
    assert.equal(projectDetails.status, 200);
    assert.match(await projectDetails.text(), /persisted draft/);
    const reviewTerms = await fetch(`${origin}/contracts/00000000-0000-4000-8000-000000000300/review-terms`);
    assert.equal(reviewTerms.status, 200);
    const reviewTermsMarkup = await reviewTerms.text();
    assert.match(reviewTermsMarkup, /Review terms/);
    assert.match(reviewTermsMarkup, /Milestones and payment/);
    const send = await fetch(`${origin}/contracts/00000000-0000-4000-8000-000000000300/send`);
    assert.equal(send.status, 200);
    assert.match(await send.text(), /Loading Contract Send/);
    const newSend = await fetch(`${origin}/contracts/new/send`);
    assert.equal(newSend.status, 200);
    assert.match(await newSend.text(), /Contract Send/);
    const newSendWithDraft = await fetch(`${origin}/contracts/new/send?contractId=00000000-0000-4000-8000-000000000300`);
    assert.equal(newSendWithDraft.status, 200);
    assert.match(await newSendWithDraft.text(), /Loading Contract Send/);
    const newProjectDetails = await fetch(`${origin}/contracts/new/project-details`);
    assert.equal(newProjectDetails.status, 200);
    assert.match(await newProjectDetails.text(), /Open a saved draft/);
    const newReviewTerms = await fetch(`${origin}/contracts/new/review-terms`);
    assert.equal(newReviewTerms.status, 200);
    assert.match(await newReviewTerms.text(), /Open a saved draft/);
    const settings = await fetch(origin + '/settings');
    assert.equal(settings.status, 200);
    assert.match(await settings.text(), /Profile Settings/);
    const notifications = await fetch(origin + '/notifications');
    assert.equal(notifications.status, 200);
    const notificationsMarkup = await notifications.text();
    assert.match(notificationsMarkup, /Private inbox/);
    assert.match(notificationsMarkup, /Loading your private inbox/);
    assert.match(notificationsMarkup, /notification-inbox/);
    const authorities = await fetch(`${origin}/authorities`);
    assert.equal(authorities.status, 200);
    const authoritiesMarkup = await authorities.text();
    assert.match(authoritiesMarkup, /Resolution Authorities/);
    assert.match(authoritiesMarkup, /Loading the Authority Registry/);
    const invitation = await fetch(`${origin}/invitations/11111111-1111-4111-8111-111111111111`);
    assert.equal(invitation.status, 200);
    assert.match(await invitation.text(), /Accept Contract invitation/);
    assert.equal((await fetch(`${origin}/invitations/11111111-1111-4111-8111-111111111111/extra`)).status, 404);
    const invalid = await fetch(`${origin}/not-a-real-route`);
    assert.equal(invalid.status, 404);
    assert.match(await invalid.text(), /This page could not be found/);
  } finally {
    await stop(next);
    await new Promise(resolve => backend.close(resolve));
  }
});

test('Wallet presentation covers connection, local-test, error, and safe-balance states', async () => {
  const route = await import('node:fs/promises').then(fs => fs.readFile(new URL('../app/wallet/page.tsx', import.meta.url), 'utf8'));
  const nextConfig = await import('node:fs/promises').then(fs => fs.readFile(new URL('../next.config.ts', import.meta.url), 'utf8'));

  assert.match(route, /SignedInShell/);
  assert.match(route, /WalletPage/);
  assert.doesNotMatch(nextConfig, /source: '\/wallet'/);

  const { WalletLocalTest, WalletSummary, walletNetworkLabel, walletStateLabel } = await loadWalletPresentation();
  const expectedLabels = { disconnected: 'Disconnected', connecting: 'Connecting', connected: 'Connected', 'local-test': 'Local test', 'safe-balance': 'Safe balance', error: 'Unavailable' };
  for (const state of Object.keys(expectedLabels)) {
    assert.equal(walletStateLabel(state), expectedLabels[state]);
    assert.match(renderToStaticMarkup(WalletSummary({ state, address: '0x1111111111111111111111111111111111111111', balance: '1,250 MockEUSD', message: `${state} wallet state` })), new RegExp(`${state} wallet state`));
  }
  assert.equal(walletNetworkLabel('disconnected'), 'Not connected');
  assert.equal(walletNetworkLabel('connecting'), 'Checking connection');
  assert.equal(walletNetworkLabel('local-test'), 'Local test fixture');
  assert.equal(walletNetworkLabel('error'), 'Not verified');
  assert.match(renderToStaticMarkup(WalletSummary({ state: 'disconnected' })), /<dd>Not connected<\/dd>/);
  assert.match(renderToStaticMarkup(WalletSummary({ state: 'error', message: 'Provider unavailable.' })), /<dd>Not verified<\/dd>/);
  assert.match(renderToStaticMarkup(WalletLocalTest({})), /Real wallet connection is disabled/);
  assert.match(renderToStaticMarkup(WalletLocalTest({ wallet: { address: '0x1111111111111111111111111111111111111111', mockEusdBalance: '1,250 MockEUSD' } })), /fixture data/);
  assert.match(renderToStaticMarkup(WalletSummary({ state: 'safe-balance', address: '0x1111111111111111111111111111111111111111', balance: '1,250 MockEUSD' })), /personal test-token balance/);
  assert.match(renderToStaticMarkup(WalletSummary({ state: 'error', message: 'Provider unavailable.' })), /Provider unavailable/);
  assert.match(renderToStaticMarkup(WalletSummary({ state: 'disconnected' })), /No personal wallet connected/);
});

test('Wallet provider seam enforces Base Sepolia and reads only personal MockEUSD balance', async () => {
  const { readMockEusdBalance, formatMockEusdBalance, baseSepoliaChainId } = await loadWalletProvider();
  assert.equal(formatMockEusdBalance('1250000000'), '1250');
  let switchedTo;
  const wallet = {
    address: '0x1111111111111111111111111111111111111111',
    switchChain: async chainId => { switchedTo = chainId; },
    getEthereumProvider: async () => ({ request: async ({ method }) => method === 'eth_chainId' ? '0x14a34' : '0x4a817c80' })
  };
  assert.equal(await readMockEusdBalance(wallet), '1250 MockEUSD');
  assert.equal(switchedTo, baseSepoliaChainId);
  await assert.rejects(readMockEusdBalance({ ...wallet, getEthereumProvider: async () => ({ request: async ({ method }) => method === 'eth_chainId' ? '0x1' : '0x0' }) }), /Switch to Base Sepolia/);
  await assert.rejects(readMockEusdBalance({ ...wallet, getEthereumProvider: async () => ({ request: async ({ method }) => method === 'eth_chainId' ? '0x14a34' : {} }) }), /invalid MockEUSD balance/);
});

test('Send keeps private draft publishing controls full-width on narrow screens', async () => {
  const { readFile } = await import('node:fs/promises');
  const [contractAuthoringCss, contractsCss] = await Promise.all([
    readFile(new URL('../public/contract-authoring.css', import.meta.url), 'utf8'),
    readFile(new URL('../public/contracts.css', import.meta.url), 'utf8')
  ]);
  assert.match(contractAuthoringCss + contractsCss, /@media\(max-width:560px\).*\.contract-authoring-flow \.action-row>\*\{width:100%\}/s);
});

test('Authority Registry presentation renders loading, empty, populated, unavailable, and forbidden states', async () => {
  const { AuthoritiesContent, AuthoritiesError, AuthoritiesForbidden, AuthoritiesLoading } = await loadAuthorityPresentation();
  assert.match(renderToStaticMarkup(AuthoritiesLoading()), /Loading the Authority Registry/);
  assert.match(renderToStaticMarkup(AuthoritiesContent({ data: { entries: [] } })), /No published Resolution Authorities are available yet/);
  const populated = renderToStaticMarkup(AuthoritiesContent({ data: { entries: [{ id: 'authority-id', name: 'PactFlow Simulation Authority', jurisdictionLabel: 'Testnet simulation', rulesetVersion: 'v1', isSimulated: true }] } }));
  assert.match(populated, /PactFlow Simulation Authority/);
  assert.match(populated, /Ruleset v1/);
  assert.match(renderToStaticMarkup(AuthoritiesError({ message: 'Registry is unavailable.' })), /Authority Registry unavailable/);
  assert.match(renderToStaticMarkup(AuthoritiesForbidden()), /access is restricted/);
});

test('Notifications presentation renders empty, populated, error, and read-transition states', async () => {
  const { NotificationsContent, NotificationsError, NotificationsLoading } = await loadNotificationPresentation();
  const notification = { id: '00000000-0000-4000-8000-000000000120', category: 'connection', title: 'Connection request', body: 'A Profile sent you a request.', href: '/people', createdAt: '2026-08-12T08:00:00.000Z', readAt: null };
  const noop = () => undefined;
  assert.match(renderToStaticMarkup(NotificationsLoading()), /Loading your private inbox/);
  assert.match(renderToStaticMarkup(NotificationsError({ message: 'Inbox unavailable.' })), /Notifications could not be loaded/);
  assert.match(renderToStaticMarkup(NotificationsContent({ data: { unreadCount: 0, entries: [] }, markingId: null, actionError: '', onMarkRead: noop })), /You have no notifications yet/);
  const populated = renderToStaticMarkup(NotificationsContent({ data: { unreadCount: 1, entries: [notification] }, markingId: notification.id, actionError: '', onMarkRead: noop }));
  assert.match(populated, /Connection request/);
  assert.match(populated, /Marking read/);
  assert.match(renderToStaticMarkup(NotificationsContent({ data: { unreadCount: 0, entries: [{ ...notification, readAt: '2026-08-12T08:05:00.000Z' }] }, markingId: null, actionError: '', onMarkRead: noop })), /Read notification/);
});

test('typed Contracts presentation covers empty, populated, and filtered records', async () => {
  const { emptyContractsMessage, filterContracts } = await loadContractsPresentation();
  const contracts = [
    { id: 'draft', title: 'Website refresh', status: 'private_draft', latestVersionNumber: 1, counterparty: 'Lee', responsibility: 'Buyer', milestoneCount: 0, lastActivityAt: '2026-08-12T00:00:00.000Z' },
    { id: 'active', title: 'Identity kit', status: 'active', latestVersionNumber: 2, counterparty: 'Maya', responsibility: 'Service Provider', milestoneCount: 2, lastActivityAt: '2026-08-11T00:00:00.000Z' }
  ];
  assert.deepEqual(filterContracts(contracts, '', '').map(contract => contract.id), ['draft', 'active']);
  assert.deepEqual(filterContracts(contracts, 'active', '').map(contract => contract.id), ['active']);
  assert.deepEqual(filterContracts(contracts, '', 'Buyer').map(contract => contract.id), ['draft']);
  assert.equal(emptyContractsMessage(false), 'No Contracts yet. Create a Contract when you are ready.');
  assert.equal(emptyContractsMessage(true), 'No Contracts match these filters.');
});

test('typed Contract detail presentation keeps lifecycle and payment provenance truthful', async () => {
  const { contractDetailPresentation } = await loadContractDetailPresentation();
  const base = {
    id: 'contract-id', versionNumber: 2, counterparty: 'Counterparty', buyer: 'Buyer', paymentAuthority: 'not configured',
    sections: {
      scope: { title: 'Identity kit', description: 'Deliver the identity kit.', projectStartDateUtc: '2030-09-01T00:00:00.000Z' },
      payment: { settlementToken: 'MockEUSD', totalAllocation: 1000 },
      milestones: [{ title: 'Research', allocation: 400, deliveryDeadlineUtc: '2030-09-10T00:00:00.000Z' }, { title: 'Delivery', allocation: 600, deliveryDeadlineUtc: '2030-09-20T00:00:00.000Z' }]
    }
  };
  const negotiation = contractDetailPresentation({ ...base, status: 'negotiation' });
  assert.deepEqual(negotiation.milestones.map(item => item.state), ['awaiting-acceptance', 'awaiting-acceptance']);
  assert.match(negotiation.payment.label, /not chain verified/);
  const active = contractDetailPresentation({ ...base, status: 'active' });
  assert.deepEqual(active.milestones.map(item => item.state), ['active', 'pending']);
  assert.equal(active.payment.percent, 0);
  const complete = contractDetailPresentation({ ...base, status: 'complete' });
  assert.deepEqual(complete.milestones.map(item => item.state), ['complete', 'complete']);
  assert.equal(complete.payment.percent, 100);
});

test('typed authoring entry exposes only accepted People and validates exact emails', async () => {
  const { acceptedCounterparties, normalizeExactEmail } = await loadAuthoringEntryPresentation();
  assert.equal(normalizeExactEmail(' Person@Example.COM '), 'person@example.com');
  assert.equal(normalizeExactEmail('not-an-email'), null);
  assert.deepEqual(acceptedCounterparties([
    { other_profile_id: 'accepted', display_name: 'Accepted Person', email: 'accepted@example.com', status: 'accepted', direction: 'outgoing' },
    { other_profile_id: 'pending', display_name: 'Pending Person', email: 'pending@example.com', status: 'pending', direction: 'outgoing' },
    { other_profile_id: 'missing-email', display_name: 'No Email', status: 'accepted', direction: 'outgoing' }
  ]).map(connection => connection.other_profile_id), ['accepted']);
});
