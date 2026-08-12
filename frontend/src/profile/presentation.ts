import type { Profile } from '../auth/client';

export type AvatarAppearance = { background: string; foreground: string };

const appearances: Record<string, AvatarAppearance> = {
  indigo: { background: '#4f46e5', foreground: '#ffffff' },
  teal: { background: '#0f766e', foreground: '#ffffff' },
  amber: { background: '#8a5700', foreground: '#ffffff' },
  rose: { background: '#9f1239', foreground: '#ffffff' },
  slate: { background: '#475569', foreground: '#ffffff' },
  violet: { background: '#6d28d9', foreground: '#ffffff' }
};

export function profileLabel(profile: Pick<Profile, 'displayName' | 'email'>): string {
  return profile.displayName?.trim() || profile.email?.trim() || 'PactFlow Profile';
}

export function profileInitials(profile: Pick<Profile, 'displayName' | 'email'>): string {
  return profileLabel(profile).split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'PF';
}

export function avatarAppearance(seed: string | null | undefined): AvatarAppearance {
  return appearances[seed ?? ''] ?? appearances.indigo;
}
