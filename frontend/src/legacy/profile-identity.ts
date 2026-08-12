// @ts-nocheck
import { avatarAppearance, profileInitials, profileLabel } from './profile-presentation';

export function loadingProfileIdentity() {
  return { status: 'loading', accessibleLabel: 'Loading profile' };
}

export async function resolveProfileIdentity(profile, resolvePrivateAvatar, isUsableAvatar = async url => Boolean(url)) {
  let imageUrl = null;
  try {
    const resolvedUrl = await resolvePrivateAvatar(profile);
    imageUrl = resolvedUrl && await isUsableAvatar(resolvedUrl) ? resolvedUrl : null;
  } catch {
    // A private image is optional; use the deterministic fallback when it cannot be resolved.
  }

  return {
    status: 'resolved',
    label: profileLabel(profile),
    initials: profileInitials(profile),
    imageUrl: imageUrl || null,
    appearance: avatarAppearance(profile?.avatarSeed)
  };
}
