import { createBrowserSupabase, getAuthConfig, type AuthHeaders } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';

const localFixtureStorageKey = 'pactflow-local-test-email';
let browserClient: SupabaseClient | null = null;

export async function getBrowserSupabase(): Promise<SupabaseClient> {
  if (browserClient) return browserClient;
  browserClient = createBrowserSupabase(await getAuthConfig());
  return browserClient;
}

export async function getBrowserAuth(): Promise<AuthHeaders> {
  if (typeof window === 'undefined') throw new Error('Authentication is only available in a browser.');

  const localTestEmail = window.sessionStorage.getItem(localFixtureStorageKey);
  if (localTestEmail) return { localTestEmail };

  const client = await getBrowserSupabase();
  const { data: { session } } = await client.auth.getSession();
  if (!session?.access_token) throw new Error('Your sign-in session has expired. Please sign in again.');
  return { accessToken: session.access_token };
}

export async function signOutBrowser(auth: AuthHeaders): Promise<void> {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(localFixtureStorageKey);
  if (auth.accessToken) {
    await (await getBrowserSupabase()).auth.signOut();
  }
}

export async function resolvePrivateAvatar(profile: { avatarPath?: string | null }, auth: AuthHeaders): Promise<string | null> {
  if (!profile.avatarPath || auth.localTestEmail) return null;
  try {
    const { data, error } = await (await getBrowserSupabase()).storage.from('profile-images').createSignedUrl(profile.avatarPath, 60 * 60);
    return error || !data?.signedUrl ? null : data.signedUrl;
  } catch {
    return null;
  }
}

export async function uploadPrivateAvatar(file: File, profileId: string, auth: AuthHeaders): Promise<string> {
  if (auth.localTestEmail) throw new Error('Private image upload is unavailable in the local test fixture; your existing avatar remains unchanged.');
  const allowedTypes = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]);
  const extension = allowedTypes.get(file.type);
  if (!extension || file.size > 5 * 1024 * 1024) throw new Error('Choose a JPEG, PNG, or WebP image no larger than 5 MB.');
  const path = `${profileId}/avatar.${extension}`;
  const { error } = await (await getBrowserSupabase()).storage.from('profile-images').upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error('Your profile image was not uploaded. Your existing avatar remains unchanged.');
  return path;
}
