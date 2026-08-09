const appearances = {
  indigo: { background: '#4f46e5', foreground: '#ffffff' },
  teal: { background: '#0f766e', foreground: '#ffffff' },
  amber: { background: '#8a5700', foreground: '#ffffff' },
  rose: { background: '#9f1239', foreground: '#ffffff' },
  slate: { background: '#475569', foreground: '#ffffff' },
  violet: { background: '#6d28d9', foreground: '#ffffff' }
};

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map(value => Number.parseInt(value, 16) / 255);
  return channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrastRatio(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
  return (lighter + 0.05) / (darker + 0.05);
}

export function avatarAppearance(seed) {
  const appearance = appearances[seed] ?? appearances.indigo;
  return { ...appearance, contrastRatio: contrastRatio(appearance.foreground, appearance.background) };
}

export function profileLabel(profile = {}) {
  return profile.displayName?.trim() || profile.email?.trim() || 'PactFlow Profile';
}

export function profileInitials(profile = {}) {
  return profileLabel(profile).split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'PF';
}
