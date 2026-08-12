import type { Profile } from '../auth/client';
import type { SettingsValues } from './presentation';

export async function saveProfileSettings({ profile, values, file, uploadAvatar, saveProfile }: { profile: Profile; values: SettingsValues; file?: unknown | null; uploadAvatar: (file: unknown, profile: Profile) => Promise<string>; saveProfile: (payload: SettingsValues & { avatarPath: string | null | undefined }) => Promise<Profile> }): Promise<{ profile: Profile; uploadError: string | null }> {
  let avatarPath = profile.avatarPath;
  let uploadError: string | null = null;
  if (file) {
    try {
      avatarPath = await uploadAvatar(file, profile);
    } catch (error) {
      uploadError = error instanceof Error ? error.message : 'Your profile image was not uploaded. Your existing avatar remains unchanged.';
    }
  }
  const savedProfile = await saveProfile({ ...values, avatarPath });
  return { profile: savedProfile, uploadError };
}
