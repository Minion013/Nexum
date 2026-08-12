import assert from 'node:assert/strict';
import test from 'node:test';
import { privateAvatarUrl } from '../../frontend/public/private-avatar.bundle.js';

test('a saved private avatar is resolved through a short-lived owner URL', async () => {
  const calls = [];
  const url = await privateAvatarUrl(
    { avatarPath: '66666666-6666-4666-8666-666666666666/avatar.webp' },
    { storage: { from: bucket => ({ createSignedUrl: async (path, lifetime) => { calls.push({ bucket, path, lifetime }); return { data: { signedUrl: 'https://storage.example/avatar' }, error: null }; } }) } }
  );

  assert.equal(url, 'https://storage.example/avatar');
  assert.deepEqual(calls, [{ bucket: 'profile-images', path: '66666666-6666-4666-8666-666666666666/avatar.webp', lifetime: 3600 }]);
});

test('missing or inaccessible private avatars retain the initials fallback', async () => {
  assert.equal(await privateAvatarUrl({ avatarPath: null }, {}), null);
  const url = await privateAvatarUrl(
    { avatarPath: '66666666-6666-4666-8666-666666666666/avatar.png' },
    { storage: { from: () => ({ createSignedUrl: async () => ({ data: null, error: new Error('denied') }) }) } }
  );
  assert.equal(url, null);
  assert.equal(await privateAvatarUrl({ avatarPath: 'avatar.png' }, { storage: { from: () => ({ createSignedUrl: async () => { throw new Error('offline'); } }) } }), null);
});
