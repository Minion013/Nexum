import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { access, readFile, readdir } from 'node:fs/promises';
import { createServer as createTcpServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createApp, localTestProfileFromEnvironment } from '../src/server.mjs';

const frontendRoot = new URL('../../frontend/', import.meta.url);
const localEmail = 'pactflow-wallet-test@local.invalid';
const sampleContractId = '00000000-0000-4000-8000-000000000300';
const sampleInvitationId = '11111111-1111-4111-8111-111111111111';
const nextBin = fileURLToPath(new URL('../../node_modules/next/dist/bin/next', import.meta.url));

const routeInventory = [
  { url: '/', route: 'app/page.tsx', client: 'app/page.tsx', api: [], primary: 'href="/login"', rendered: 'Make every creative' },
  { url: '/login', route: 'app/login/page.tsx', client: 'app/login/page.tsx', support: ['src/auth/client.ts'], api: ['/api/auth/config', '/api/session', '/api/onboarding/complete'], primary: 'Send sign-in code', rendered: 'Sign in or create your account' },
  { url: '/home', route: 'app/home/page.tsx', client: 'src/dashboard/dashboard.tsx', api: ['/api/home'], primary: 'View Contracts', rendered: 'Your work, with the next step clear' },
  { url: '/contracts', route: 'app/contracts/page.tsx', client: 'src/contracts/contracts.tsx', api: ['/api/contracts'], primary: 'Create a Contract Draft', rendered: 'Your Contract work, in one place' },
  { url: '/contracts/new/choose-person', route: 'app/contracts/new/choose-person/page.tsx', client: 'src/contracts/authoring-entry.tsx', api: ['/api/people', '/api/contracts'], primary: 'Continue to Project details', rendered: 'counterparty choices' },
  { url: '/contracts/new/project-details', route: 'app/contracts/new/project-details/page.tsx', client: 'src/contracts/project-details-handoff.tsx', api: ['/api/contracts/'], primary: 'Project details', rendered: 'Open a saved draft' },
  { url: '/contracts/new/review-terms', route: 'app/contracts/new/review-terms/page.tsx', client: 'src/contracts/review-terms.tsx', api: ['/api/contracts/'], primary: 'Review terms', rendered: 'Open a saved draft' },
  { url: '/contracts/new/send', route: 'app/contracts/new/send/page.tsx', client: 'src/contracts/send.tsx', api: ['/api/contracts/', '/invitations'], primary: 'Open Contracts', rendered: 'Contract Send' },
  { url: '/contracts/:contractId/choose-person', route: 'app/contracts/[contractId]/choose-person/page.tsx', client: 'src/contracts/authoring-entry.tsx', api: ['/api/people', '/api/contracts/'], primary: 'Continue to Project details', rendered: 'counterparty choices' },
  { url: '/contracts/:contractId/project-details', route: 'app/contracts/[contractId]/project-details/page.tsx', client: 'src/contracts/project-details-handoff.tsx', api: ['/api/contracts/'], primary: 'Save and review terms', rendered: 'persisted draft' },
  { url: '/contracts/:contractId/review-terms', route: 'app/contracts/[contractId]/review-terms/page.tsx', client: 'src/contracts/review-terms.tsx', api: ['/api/contracts/'], primary: 'Save exact terms', rendered: 'Review terms' },
  { url: '/contracts/:contractId/send', route: 'app/contracts/[contractId]/send/page.tsx', client: 'src/contracts/send.tsx', api: ['/api/contracts/', '/invitations'], primary: 'Send invitation', rendered: 'Loading Contract Send' },
  { url: '/contracts/:contractId', route: 'app/contracts/[contractId]/page.tsx', client: 'src/contracts/detail.tsx', api: ['/api/contracts/', '/detail', '/review'], primary: 'Sign and accept exact Version', rendered: 'Loading Contract detail' },
  { url: '/contracts/:contractId/milestones/:milestoneKey', route: 'app/contracts/[contractId]/milestones/[milestoneKey]/page.tsx', client: 'src/contracts/milestone-review.tsx', support: ['src/contracts/milestone-review-presentation.ts'], api: ['/api/contracts/', '/milestones/', '/review', '/evidence'], primary: 'Submit final evidence', rendered: 'Loading Milestone Review' },
  { url: '/contracts/:contractId/accept', route: 'app/contracts/[contractId]/accept/page.tsx', client: 'src/contracts/acceptance.tsx', support: ['src/contracts/wallet-acceptance.tsx'], api: ['/api/contracts/', '/review', '/acceptances'], primary: 'Sign and accept exact Version', rendered: 'Loading Version review' },
  { url: '/wallet', route: 'app/wallet/page.tsx', client: 'src/wallet/wallet.tsx', support: ['src/auth/client.ts'], api: ['/api/auth/config'], primary: 'Connect external wallet', rendered: 'Personal test funds, kept separate' },
  { url: '/people', route: 'app/people/page.tsx', client: 'src/people/people.tsx', api: ['/api/people', '/api/people/connections'], primary: 'Discover People', rendered: 'Professional connections, kept separate from access' },
  { url: '/contacts', route: 'app/contacts/page.tsx', client: 'src/people/people.tsx', api: ['/api/people'], primary: 'Discover People', rendered: 'Professional connections, kept separate from access' },
  { url: '/notifications', route: 'app/notifications/page.tsx', client: 'src/notifications/notifications.tsx', api: ['/api/notifications'], primary: 'markRead', rendered: 'Private inbox' },
  { url: '/settings', route: 'app/settings/page.tsx', client: 'src/settings/settings.tsx', support: ['src/signed-in/app-shell.tsx'], api: ['/api/session', '/api/profile/settings'], primary: 'Save changes', rendered: 'Profile Settings' },
  { url: '/authorities', route: 'app/authorities/page.tsx', client: 'src/authorities/authorities.tsx', api: ['/api/authorities'], primary: 'Resolution Authorities', rendered: 'Resolution Authorities' },
  { url: '/invitations/:invitationId', route: 'app/invitations/[invitationId]/page.tsx', client: 'src/invitations/acceptance.tsx', api: ['/api/invitations'], primary: 'Accept Contract invitation', rendered: 'Accept Contract invitation' }
];

async function source(relativePath) {
  return readFile(new URL(relativePath, frontendRoot), 'utf8');
}

async function assertMissing(relativePath) {
  await assert.rejects(access(new URL(relativePath, frontendRoot)));
}

async function unusedPort() {
  const listener = createTcpServer();
  await new Promise(resolve => listener.listen(0, resolve));
  const { port } = listener.address();
  await new Promise(resolve => listener.close(resolve));
  return port;
}

async function waitForNext(origin, process) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (process.exitCode !== null) throw new Error(`Next exited before becoming ready (code ${process.exitCode}).`);
    try {
      if ((await fetch(`${origin}/`)).ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Next did not become ready.');
}

async function stop(process) {
  if (process.exitCode === null) {
    process.kill();
    await once(process, 'exit');
  }
}

function routePath(url) {
  return url.replace(':contractId', sampleContractId).replace(':milestoneKey', 'milestone-1').replace(':invitationId', sampleInvitationId);
}

const apiBoundaryByRoute = new Map([
  ['/login', '/api/session'],
  ['/home', '/api/home'],
  ['/contracts', '/api/contracts'],
  ['/contracts/new/choose-person', '/api/people'],
  ['/contracts/new/project-details', `/api/contracts/${sampleContractId}`],
  ['/contracts/new/review-terms', `/api/contracts/${sampleContractId}`],
  ['/contracts/new/send', `/api/contracts/${sampleContractId}`],
  ['/contracts/:contractId/choose-person', '/api/people'],
  ['/contracts/:contractId/project-details', `/api/contracts/${sampleContractId}`],
  ['/contracts/:contractId/review-terms', `/api/contracts/${sampleContractId}`],
  ['/contracts/:contractId/send', `/api/contracts/${sampleContractId}`],
  ['/contracts/:contractId', `/api/contracts/${sampleContractId}/detail`],
  ['/contracts/:contractId/milestones/:milestoneKey', `/api/contracts/${sampleContractId}/milestones/milestone-1/review`],
  ['/contracts/:contractId/accept', `/api/contracts/${sampleContractId}/review`],
  ['/wallet', '/api/auth/config'],
  ['/people', '/api/people'],
  ['/contacts', '/api/people'],
  ['/notifications', '/api/notifications'],
  ['/settings', '/api/session'],
  ['/authorities', '/api/authorities'],
  ['/invitations/:invitationId', `/api/invitations/${sampleInvitationId}`]
]);

test('every inventory URL has a typed route, an explicit backend seam, and a responsive primary action', async () => {
  const nextConfig = await source('next.config.ts');
  const middleware = await source('middleware.ts');
  const responsiveCss = await source('public/responsive.css');
  assert.doesNotMatch(nextConfig, /\.html|frontend\/public/);
  assert.match(middleware, /NextResponse\.rewrite/);
  assert.match(middleware, /BACKEND_URL/);
  assert.match(responsiveCss, /@media/);
  assert.match(responsiveCss, /overflow-x:hidden/);

  for (const entry of routeInventory) {
    const [route, client, ...support] = await Promise.all([source(entry.route), source(entry.client), ...(entry.support ?? []).map(path => source(path))]);
    const combined = [route, client, ...support].join('\n');
    assert.doesNotMatch(combined, /\.html|src\/legacy|@ts-nocheck|\.bundle\.js/);
    for (const apiPath of entry.api) assert.match(combined, new RegExp(apiPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(combined, new RegExp(entry.primary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), entry.url);
  }
});

test('the conversion removes every interim page, direct-DOM source, generated bundle, and legacy build entrypoint', async () => {
  const publicFiles = await readdir(new URL('public/', frontendRoot));
  assert.deepEqual(publicFiles.filter(file => file.endsWith('.html') || file.endsWith('.bundle.js')), []);
  await assertMissing('src/legacy');
  await assertMissing('scripts/build-legacy-client.mjs');
});

test('inventory API boundaries reject anonymous callers and accept the configured local test email', async () => {
  const localTestProfile = localTestProfileFromEnvironment({ PACTFLOW_LOCAL_TEST_EMAIL: localEmail });
  const server = createApp({ localTestProfile });
  await new Promise(resolve => server.listen(0, resolve));
  const backendOrigin = `http://127.0.0.1:${server.address().port}`;
  const nextPort = await unusedPort();
  const next = spawn(process.execPath, [nextBin, 'start', '-p', String(nextPort)], {
    cwd: fileURLToPath(frontendRoot),
    env: { ...process.env, BACKEND_URL: backendOrigin },
    stdio: 'ignore'
  });
  const origin = `http://127.0.0.1:${nextPort}`;
  const reads = ['/api/session', '/api/home', '/api/contracts', '/api/people', '/api/notifications', '/api/authorities', '/api/contracts/00000000-0000-4000-8000-000000000300/detail', '/api/contracts/00000000-0000-4000-8000-000000000300/review', '/api/contracts/00000000-0000-4000-8000-000000000300/milestones/milestone-1/review', '/api/invitations/11111111-1111-4111-8111-111111111111'];
  try {
    await waitForNext(origin, next);
    for (const entry of routeInventory) {
      const response = await fetch(`${origin}${routePath(entry.url)}`);
      assert.equal(response.status, 200, entry.url);
      const apiPath = apiBoundaryByRoute.get(entry.url);
      if (!apiPath) continue;
      const anonymous = await fetch(`${origin}${apiPath}`);
      if (apiPath === '/api/auth/config') {
        assert.equal(anonymous.status, 200, `${entry.url} public boundary`);
      } else {
        assert.equal(anonymous.status, 401, `${entry.url} anonymous boundary`);
        const fixture = await fetch(`${origin}${apiPath}`, { headers: { 'x-pactflow-local-test-email': localEmail } });
        assert.notEqual(fixture.status, 401, `${entry.url} fixture boundary`);
      }
    }
    for (const path of reads) {
      assert.equal((await fetch(`${origin}${path}`)).status, 401, path);
      assert.notEqual((await fetch(`${origin}${path}`, { headers: { 'x-pactflow-local-test-email': localEmail } })).status, 401, path);
    }
    const invalidDraft = await fetch(`${origin}/api/contracts`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-pactflow-local-test-email': localEmail }, body: JSON.stringify({ name: 'Incomplete draft', scope: 'Scope', counterpartyEmail: 'not-an-email', initiatorResponsibility: 'buyer' }) });
    assert.equal(invalidDraft.status, 422);
    const unauthorizedWrite = await fetch(`${origin}/api/profile/settings`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ displayName: 'No caller' }) });
    assert.equal(unauthorizedWrite.status, 401);
  } finally {
    await stop(next);
    await new Promise(resolve => server.close(resolve));
  }
});
