const AVATAR_BUCKET = 'profile-images';
const SIGNED_URL_LIFETIME_SECONDS = 60 * 60;

export async function privateAvatarUrl(profile, client) {
  if (!profile?.avatarPath) return null;
  try {
    const { data, error } = await client.storage.from(AVATAR_BUCKET).createSignedUrl(profile.avatarPath, SIGNED_URL_LIFETIME_SECONDS);
    return error || !data?.signedUrl ? null : data.signedUrl;
  } catch {
    return null;
  }
}
