const AVATAR_BUCKET = 'profile-images';
const SIGNED_URL_LIFETIME_SECONDS = 60 * 60;

type AvatarClient = {
  storage: { from(bucket: string): { createSignedUrl(path: string, lifetime: number): Promise<{ data?: { signedUrl?: string } | null; error?: unknown | null }> } };
};

export async function privateAvatarUrl(profile: { avatarPath?: string | null } | null | undefined, client?: AvatarClient): Promise<string | null> {
  if (!profile?.avatarPath || !client) return null;
  try {
    const { data, error } = await client.storage.from(AVATAR_BUCKET).createSignedUrl(profile.avatarPath, SIGNED_URL_LIFETIME_SECONDS);
    return error || !data?.signedUrl ? null : data.signedUrl;
  } catch {
    return null;
  }
}
