import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFrontendModule } from './load-frontend-module.mjs';

const { createPromiseCache } = await loadFrontendModule('src/signed-in/promise-cache.ts');

test('signed-in bootstrap shares one promise across route remounts', async () => {
  let calls = 0;
  const cache = createPromiseCache(async () => {
    calls += 1;
    return { profile: 'cached' };
  });

  const [first, second] = await Promise.all([cache.load(), cache.load()]);
  assert.equal(calls, 1);
  assert.deepEqual(first, second);
  assert.deepEqual(await cache.load(), { profile: 'cached' });
  assert.equal(calls, 1);
});
