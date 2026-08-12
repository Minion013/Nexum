import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { build } from 'esbuild';
import { createServer as createTcpServer } from 'node:net';
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
import { fileURLToPath } from 'node:url';
import { createApp, localTestProfileFromEnvironment } from '../../backend/src/server.mjs';

const frontendRoot = fileURLToPath(new URL('..', import.meta.url));
const nextBin = fileURLToPath(new URL('../../node_modules/next/dist/bin/next', import.meta.url));
const require = createRequire(import.meta.url);

async function loadNotificationPresentation() {
  const result = await build({ entryPoints: ['./src/notifications/presentation.tsx'], absWorkingDir: frontendRoot, bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic', write: false, external: ['react', 'react/jsx-runtime'] });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports);
  return module.exports;
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
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (process.exitCode !== null) throw new Error(`Next exited before becoming ready (code ${process.exitCode}).`);
    try {
      const response = await fetch(`${origin}/`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
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
    const settings = await fetch(origin + '/settings');
    assert.equal(settings.status, 200);
    assert.match(await settings.text(), /Profile Settings/);
    const notifications = await fetch(origin + '/notifications');
    assert.equal(notifications.status, 200);
    const notificationsMarkup = await notifications.text();
    assert.match(notificationsMarkup, /Private inbox/);
    assert.match(notificationsMarkup, /Loading your private inbox/);
    assert.match(notificationsMarkup, /notification-inbox/);
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
