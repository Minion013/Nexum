import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer as createTcpServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createApp, localTestProfileFromEnvironment } from '../../backend/src/server.mjs';

const frontendRoot = fileURLToPath(new URL('..', import.meta.url));
const nextBin = fileURLToPath(new URL('../../node_modules/next/dist/bin/next', import.meta.url));

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
