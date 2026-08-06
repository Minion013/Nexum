import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/server.mjs';

async function request(server, path) {
  return fetch(`http://127.0.0.1:${server.address().port}${path}`);
}

test('public entry and health check are safe to render', async () => {
  const server = createApp();
  await new Promise(resolve => server.listen(0, resolve));
  try {
    const health = await request(server, '/health');
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok', mode: 'privy-auth-local-simulation', network: 'none', funds: 'no funds or external wallets' });
    const authConfig = await request(server, '/api/auth/config');
    assert.equal(authConfig.status, 200);
    assert.deepEqual(Object.keys(await authConfig.json()).sort(), ['appId', 'mode']);
    const entry = await request(server, '/');
    assert.equal(entry.status, 200);
    assert.match(await entry.text(), /PactFlow/);
    assert.equal((await request(server, '/../.env')).status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
