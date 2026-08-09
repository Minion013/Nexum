import assert from 'node:assert/strict';
import test from 'node:test';
import { saveProfileSettings } from '../public/profile-settings.js';

test('Profile Settings saves text and discoverability when an optional image upload fails', async () => {
  const saved = [];
  const profile = {
    id: '66666666-6666-4666-8666-666666666666',
    displayName: 'Member',
    avatarPath: '66666666-6666-4666-8666-666666666666/avatar.png'
  };

  const result = await saveProfileSettings({
    profile,
    values: { displayName: 'Updated member', professionalHeadline: 'Product designer', bio: 'Building reliable flows.', avatarSeed: 'teal', discoverable: true },
    file: { name: 'avatar.png' },
    uploadAvatar: async () => { throw new Error('Your profile image was not uploaded. Your existing avatar remains unchanged.'); },
    saveProfile: async payload => { saved.push(payload); return { ...profile, ...payload, displayName: payload.displayName }; }
  });

  assert.deepEqual(saved, [{
    displayName: 'Updated member',
    professionalHeadline: 'Product designer',
    bio: 'Building reliable flows.',
    avatarSeed: 'teal',
    discoverable: true,
    avatarPath: profile.avatarPath
  }]);
  assert.equal(result.profile.displayName, 'Updated member');
  assert.match(result.uploadError, /not uploaded/);
});

test('Profile Settings reports an uploaded image only after the protected profile update succeeds', async () => {
  const profile = { id: '66666666-6666-4666-8666-666666666666', displayName: 'Member', avatarPath: null };
  const result = await saveProfileSettings({
    profile,
    values: { displayName: 'Member', professionalHeadline: '', bio: '', avatarSeed: 'indigo', discoverable: false },
    file: { name: 'avatar.webp' },
    uploadAvatar: async () => `${profile.id}/avatar.webp`,
    saveProfile: async payload => ({ ...profile, ...payload })
  });

  assert.equal(result.uploadError, null);
  assert.equal(result.profile.avatarPath, `${profile.id}/avatar.webp`);
});
