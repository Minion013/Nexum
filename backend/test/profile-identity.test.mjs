import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { loadingProfileIdentity, resolveProfileIdentity } from '../../frontend/public/profile-identity.bundle.js';

test('profile identity stays reserved while delayed profile image resolution completes, then reveals the image and name together', async () => {
  let releaseAvatar;
  const avatar = new Promise(resolve => { releaseAvatar = resolve; });
  const profile = { displayName: 'Avery Stone', email: 'avery@example.com', avatarSeed: 'teal' };

  assert.deepEqual(loadingProfileIdentity(), { status: 'loading', accessibleLabel: 'Loading profile' });
  const identity = resolveProfileIdentity(profile, async () => avatar);
  let settled = false;
  void identity.then(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false);

  releaseAvatar('https://storage.example/avery-avatar');
  assert.deepEqual(await identity, {
    status: 'resolved',
    label: 'Avery Stone',
    initials: 'AS',
    imageUrl: 'https://storage.example/avery-avatar',
    appearance: { background: '#0f766e', foreground: '#ffffff', contrastRatio: 5.473250081210842 }
  });
});

test('profile identity reveals the deterministic fallback and name together when the private image is unavailable', async () => {
  const identity = await resolveProfileIdentity(
    { displayName: 'Avery Stone', email: 'avery@example.com', avatarSeed: 'amber' },
    async () => { throw new Error('private image is unavailable'); }
  );

  assert.deepEqual(identity, {
    status: 'resolved',
    label: 'Avery Stone',
    initials: 'AS',
    imageUrl: null,
    appearance: { background: '#8a5700', foreground: '#ffffff', contrastRatio: 6.09768011800454 }
  });
});

test('profile identity retains the deterministic fallback when a signed private image cannot be loaded', async () => {
  const identity = await resolveProfileIdentity(
    { displayName: 'Avery Stone', email: 'avery@example.com', avatarSeed: 'teal' },
    async () => 'https://storage.example/expired-avatar',
    async () => false
  );

  assert.equal(identity.imageUrl, null);
  assert.equal(identity.initials, 'AS');
  assert.equal(identity.label, 'Avery Stone');
});

test('signed-in destinations ship the reserved loading identity instead of a generic Profile placeholder', async () => {
  for (const path of ['home.html', 'contracts.html', 'people.html', 'settings.html']) {
    const markup = await readFile(new URL(`../../frontend/public/${path}`, import.meta.url), 'utf8');
    assert.match(markup, /<summary class="profile-identity-loading" aria-label="Loading profile" aria-busy="true">/);
    assert.doesNotMatch(markup, /<summary[^>]*><span class="avatar">PF<\/span>(?:<span[^>]*>)?Profile/);
  }
});
