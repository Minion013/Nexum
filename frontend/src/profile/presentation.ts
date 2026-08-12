import type { Profile } from '../auth/client';
export type AvatarAppearance = { background: string; foreground: string; contrastRatio: number };

const appearances: Record<string, AvatarAppearance> = {
  indigo: { background: '#4f46e5', foreground: '#ffffff', contrastRatio: 0 },
  teal: { background: '#0f766e', foreground: '#ffffff', contrastRatio: 0 },
  amber: { background: '#8a5700', foreground: '#ffffff', contrastRatio: 0 },
  rose: { background: '#9f1239', foreground: '#ffffff', contrastRatio: 0 },
  slate: { background: '#475569', foreground: '#ffffff', contrastRatio: 0 },
  violet: { background: '#6d28d9', foreground: '#ffffff', contrastRatio: 0 }
};

function luminance(hex: string): number {
  const channels = hex.match(/[a-f\d]{2}/gi)?.map(value => Number.parseInt(value, 16) / 255) ?? [];
  return channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
  return (lighter + 0.05) / (darker + 0.05);
}

for (const appearance of Object.values(appearances)) appearance.contrastRatio = contrastRatio(appearance.foreground, appearance.background);

export function profileLabel(profile: Pick<Profile, 'displayName' | 'email'>): string {
  return profile.displayName?.trim() || profile.email?.trim() || 'PactFlow Profile';
}

export function profileInitials(profile: Pick<Profile, 'displayName' | 'email'>): string {
  return profileLabel(profile).split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'PF';
}

export function avatarAppearance(seed: string | null | undefined): AvatarAppearance {
  return appearances[seed ?? ''] ?? appearances.indigo;
}
