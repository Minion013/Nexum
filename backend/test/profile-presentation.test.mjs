import assert from 'node:assert/strict';
import test from 'node:test';
import { avatarAppearance, profileInitials, profileLabel } from '../../frontend/public/profile-presentation.bundle.js';

test('every deterministic avatar colour provides accessible initials contrast', () => {
  for (const seed of ['indigo', 'teal', 'amber', 'rose', 'slate', 'violet', undefined]) {
    const appearance = avatarAppearance(seed);
    assert.ok(appearance.contrastRatio >= 4.5, `${seed ?? 'base'} avatar contrast`);
  }
});

test('a signed-in profile has concise initials and preserves its full accessible name', () => {
  const profile = { displayName: 'Alexandria Very Long Professional Name', email: 'alex@example.com' };
  assert.equal(profileInitials(profile), 'AV');
  assert.equal(profileLabel(profile), 'Alexandria Very Long Professional Name');
});
