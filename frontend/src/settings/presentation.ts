import type { Profile } from '../auth/client';

export const avatarSeeds = ['indigo', 'teal', 'amber', 'rose', 'slate', 'violet'] as const;
export type AvatarSeed = typeof avatarSeeds[number];
export type SettingsValues = { displayName: string; professionalHeadline: string; bio: string; avatarSeed: AvatarSeed; discoverable: boolean };

export function profileSettingsValues(profile: Profile): SettingsValues {
  const avatarSeed = avatarSeeds.includes(profile.avatarSeed as AvatarSeed) ? profile.avatarSeed as AvatarSeed : 'indigo';
  return { displayName: profile.displayName ?? '', professionalHeadline: profile.professionalHeadline ?? '', bio: profile.bio ?? '', avatarSeed, discoverable: Boolean(profile.discoverable) };
}

export function validateSettings(values: SettingsValues): string | null {
  if (!values.displayName.trim()) return 'Enter a display name.';
  if (values.displayName.trim().length > 120) return 'Display name must be 120 characters or fewer.';
  if (values.professionalHeadline.trim().length > 160) return 'Professional headline must be 160 characters or fewer.';
  if (values.bio.trim().length > 1_000) return 'Bio must be 1,000 characters or fewer.';
  return null;
}

export function avatarFileError(file: { type: string; size: number } | null): string | null {
  if (!file) return null;
  return !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024
    ? 'Choose a JPEG, PNG, or WebP image no larger than 5 MB.'
    : null;
}

export function avatarPresentation(imageUrl: string | null, imageLoadFailed: boolean): 'image' | 'fallback' {
  return imageUrl && !imageLoadFailed ? 'image' : 'fallback';
}
