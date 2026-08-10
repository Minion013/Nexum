export function profileSettingsValues(profile = {}) {
  return {
    displayName: profile.displayName ?? '',
    professionalHeadline: profile.professionalHeadline ?? '',
    bio: profile.bio ?? '',
    avatarSeed: profile.avatarSeed ?? 'indigo',
    discoverable: Boolean(profile.discoverable)
  };
}

export async function saveProfileSettings({ profile, values, file, uploadAvatar, saveProfile }) {
  let avatarPath = profile.avatarPath;
  let uploadError = null;

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
