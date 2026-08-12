import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

async function loadPresentation() {
  const source = await readFile(new URL('../src/settings/presentation.ts', import.meta.url), 'utf8');
  const { code } = await transform(source, { loader: 'ts', format: 'esm', platform: 'node', target: 'node20' });
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}

test('typed Profile Settings presentation hydrates fields and rejects malformed values', async () => {
  const { profileSettingsValues, validateSettings } = await loadPresentation();
  const values = profileSettingsValues({ id: 'profile-id', email: 'member@example.com', displayName: 'Avery Stone', professionalHeadline: 'Service designer', bio: 'Making complex work clear.', avatarSeed: 'teal', discoverable: true });
  assert.deepEqual(values, { displayName: 'Avery Stone', professionalHeadline: 'Service designer', bio: 'Making complex work clear.', avatarSeed: 'teal', discoverable: true });
  assert.equal(validateSettings({ ...values, displayName: '' }), 'Enter a display name.');
  assert.equal(validateSettings({ ...values, bio: 'x'.repeat(1_001) }), 'Bio must be 1,000 characters or fewer.');
  assert.equal(validateSettings(values), null);
});

test('typed Profile Settings presentation keeps inaccessible or invalid avatar states on fallback', async () => {
  const { avatarFileError, avatarPresentation } = await loadPresentation();
  assert.equal(avatarPresentation(null, false), 'fallback');
  assert.equal(avatarPresentation('https://storage.example/avatar', true), 'fallback');
  assert.equal(avatarPresentation('https://storage.example/avatar', false), 'image');
  assert.equal(avatarFileError({ type: 'image/gif', size: 10 }), 'Choose a JPEG, PNG, or WebP image no larger than 5 MB.');
  assert.equal(avatarFileError({ type: 'image/png', size: 5 * 1024 * 1024 }), null);
});
