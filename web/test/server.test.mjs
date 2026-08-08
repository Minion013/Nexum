import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp, runtimeConfigurationFromEnvironment } from '../src/server.mjs';

async function request(server, path) {
  return fetch(`http://127.0.0.1:${server.address().port}${path}`);
}

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
    assert.match(await entry.text(), /PactFlow/);
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
      '/workspace',
      '/people',
      '/settings',
      '/authorities'
    ]) {
      const response = await request(server, path);
      assert.equal(response.status, 200, path);
      assert.match(await response.text(), /PactFlow/, path);
    }
    const home = await request(server, '/home');
    const homeMarkup = await home.text();
    for (const href of ['/home', '/contracts', '/workspace', '/people', '/settings']) {
      assert.match(homeMarkup, new RegExp(`href="${href}"`), href);
    }
    assert.match(homeMarkup, /id="wallet-capability"/);
    assert.match(homeMarkup, /wallet\.bundle\.js/);
    const detail = await request(server, '/contracts/not-a-contract');
    assert.equal(detail.status, 200);
    assert.match(await detail.text(), /Contract draft/);
    assert.match(await (await request(server, '/contracts/not-a-contract')).text(), /Review the exact shared Version/);
    assert.match(await (await request(server, '/contracts/not-a-contract')).text(), /contract\.bundle\.js/);
    assert.equal((await request(server, '/contracts/not-a-contract/extra')).status, 404);
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
    assert.match(people, /Discover/);
    assert.match(people, /My network/);
    assert.match(people, /Requests/);
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
