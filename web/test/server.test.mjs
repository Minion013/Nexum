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
    assert.deepEqual(Object.keys(await authConfig.json()).sort(), ['mode', 'publishableKey', 'url']);
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
      '/contacts',
      '/authorities'
    ]) {
      const response = await request(server, path);
      assert.equal(response.status, 200, path);
      assert.match(await response.text(), /PactFlow/, path);
    }
    const home = await request(server, '/home');
    const homeMarkup = await home.text();
    for (const href of ['/home', '/contracts', '/workspace', '/contacts', '/authorities']) {
      assert.match(homeMarkup, new RegExp(`href="${href}"`), href);
    }
    assert.equal((await request(server, '/contracts/not-a-contract')).status, 404);
    assert.equal((await request(server, '/contracts/local-demo-agreement')).status, 404);
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
