export type ProfileIdentity = { displayName?: string | null; email?: string | null; avatarSeed?: string | null };
type AvatarAppearance = { background: string; foreground: string; contrastRatio: number };
export type ResolvedProfileIdentity = { status: 'resolved'; label: string; initials: string; imageUrl: string | null; appearance: AvatarAppearance };

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
  return channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
}

function avatarAppearance(seed: string | null | undefined): AvatarAppearance {
  const appearance = { ...(appearances[seed ?? ''] ?? appearances.indigo) };
  const [lighter, darker] = [luminance(appearance.foreground), luminance(appearance.background)].sort((left, right) => right - left);
  appearance.contrastRatio = (lighter + 0.05) / (darker + 0.05);
  return appearance;
}

function profileLabel(profile: ProfileIdentity): string { return profile.displayName?.trim() || profile.email?.trim() || 'NEXUM Profile'; }
function profileInitials(profile: ProfileIdentity): string { return profileLabel(profile).split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'NX'; }

export function loadingProfileIdentity() { return { status: 'loading' as const, accessibleLabel: 'Loading profile' }; }

export async function resolveProfileIdentity(profile: ProfileIdentity, resolvePrivateAvatar: (profile: ProfileIdentity) => Promise<string | null>, isUsableAvatar: (url: string) => Promise<boolean> = async url => Boolean(url)) : Promise<ResolvedProfileIdentity> {
  let imageUrl: string | null = null;
  try {
    const resolvedUrl = await resolvePrivateAvatar(profile);
    imageUrl = resolvedUrl && await isUsableAvatar(resolvedUrl) ? resolvedUrl : null;
  } catch {
    // A private image is optional; use the deterministic fallback when it cannot be resolved.
  }
  return { status: 'resolved', label: profileLabel(profile as any), initials: profileInitials(profile as any), imageUrl: imageUrl || null, appearance: avatarAppearance(profile?.avatarSeed) };
}
