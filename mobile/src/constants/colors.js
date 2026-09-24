/** Central palette definitions. Runtime selection lives in AppPreferences. */
export const DarkColors = {
  background: '#181920', card: '#23252c', cardButton: '#2e3036', cardButtonPressed: '#3a3d44', navbar: '#42434a',
  textPrimary: '#F5F4F2', textSecondary: '#B9B9BE', textMuted: '#8d8f95', white: '#FFFFFF', black: '#000000',
  border: '#35373e', overlay: 'rgba(0,0,0,0.55)', danger: '#EB6674', track: '#55575f',
};

// Warm, low-glare surfaces keep the same visual hierarchy as dark mode.
export const LightColors = {
  background: '#F4F1F8', card: '#FFFFFF', cardButton: '#ECE8F1', cardButtonPressed: '#DED8E7', navbar: '#E7E1EC',
  textPrimary: '#24212A', textSecondary: '#595461', textMuted: '#817A89', white: '#FFFFFF', black: '#000000',
  border: '#DED8E7', overlay: 'rgba(28,22,34,0.38)', danger: '#B84252', track: '#C9C2D0',
};

export const AccentPresets = {
  purple: { dark: '#8766EB', light: '#6841C6' },
  orange: { dark: '#EB8A66', light: '#C65F3B' },
  green: { dark: '#66C98D', light: '#31985B' },
  blue: { dark: '#668CEB', light: '#3D68C7' },
  red: { dark: '#EB6674', light: '#C53F51' },
};

export const DifficultyColors = { easy: '#39B977', medium: '#D6A938', hard: '#E56670' };

export function colorWithAlpha(hex, alpha) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  return `rgba(${parseInt(clean.slice(0, 2), 16)},${parseInt(clean.slice(2, 4), 16)},${parseInt(clean.slice(4, 6), 16)},${alpha})`;
}

export function brightenColor(hex, amount = 0.25) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const brighten = (channel) => Math.round(channel + (255 - channel) * amount).toString(16).padStart(2, '0');
  return `#${brighten(parseInt(clean.slice(0, 2), 16))}${brighten(parseInt(clean.slice(2, 4), 16))}${brighten(parseInt(clean.slice(4, 6), 16))}`;
}

export function makeColors(mode = 'dark', accentName = 'purple') {
  const base = mode === 'light' ? LightColors : DarkColors;
  const accent = (AccentPresets[accentName] || AccentPresets.purple)[mode];
  return { ...base, accent, accentPressed: accent, tabActive: accent, tabInactive: base.textMuted };
}

export const Colors = makeColors('dark', 'purple');
export default Colors;
