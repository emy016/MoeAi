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
  pink: { dark: '#EE72B8', light: '#C23A88' },
  teal: { dark: '#4FC8C0', light: '#17877F' },
  amber: { dark: '#F0B44C', light: '#B77708' },
  indigo: { dark: '#7C83F2', light: '#4B50C8' },
  lime: { dark: '#A6D35A', light: '#5E8E17' },
  sky: { dark: '#52B6F0', light: '#1478B5' },
  coral: { dark: '#F2856D', light: '#C4492D' },
  crimson: { dark: '#E0506A', light: '#A8213D' },
};

/** The five in the animated row, then the rest of the palette. */
export const MAIN_ACCENTS = ['orange', 'green', 'blue', 'red', 'purple'];
export const MORE_ACCENTS = ['pink', 'teal', 'amber', 'indigo', 'lime', 'sky', 'coral', 'crimson'];

/**
 * Background styles. Each replaces the surfaces of one mode and keeps the
 * text contrast of the default palette.
 */
export const Surfaces = {
  default: { label: 'surfaceDefault' },
  midnight: {
    label: 'surfaceMidnight',
    dark: { background: '#0E1424', card: '#172036', cardButton: '#212C45', cardButtonPressed: '#2C3957', navbar: '#34405C', border: '#26314A', track: '#46526E' },
    light: { background: '#EEF2FA', card: '#FFFFFF', cardButton: '#E2E8F4', cardButtonPressed: '#D2DBEC', navbar: '#DDE4F1', border: '#D2DBEC', track: '#BCC7DC' },
  },
  amoled: {
    label: 'surfaceAmoled',
    dark: { background: '#000000', card: '#111113', cardButton: '#1C1C1F', cardButtonPressed: '#28282C', navbar: '#2A2A2E', border: '#232326', track: '#3E3E43' },
    light: { background: '#FFFFFF', card: '#F6F6F8', cardButton: '#ECECF0', cardButtonPressed: '#DFDFE5', navbar: '#E6E6EB', border: '#E2E2E8', track: '#C8C8D0' },
  },
  warm: {
    label: 'surfaceWarm',
    dark: { background: '#1C1814', card: '#28221C', cardButton: '#342C25', cardButtonPressed: '#40372E', navbar: '#473D33', border: '#3A3129', track: '#5C5146' },
    light: { background: '#F8F2E8', card: '#FFFCF6', cardButton: '#F0E7D8', cardButtonPressed: '#E4D8C4', navbar: '#EDE2CF', border: '#E4D8C4', track: '#CDBFA8' },
  },
  forest: {
    label: 'surfaceForest',
    dark: { background: '#101A16', card: '#182620', cardButton: '#21322A', cardButtonPressed: '#2B3F35', navbar: '#33483D', border: '#243730', track: '#44594E' },
    light: { background: '#EEF5F0', card: '#FFFFFF', cardButton: '#E1EDE5', cardButtonPressed: '#D0E2D6', navbar: '#DAE8DE', border: '#D0E2D6', track: '#B7CDBF' },
  },
};

const hexToRgb = (hex) => { const c = hex.replace('#', ''); return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16)); };
/** Mixes `amount` of `over` into `base` (both #rrggbb). */
export function mixColor(base, over, amount) {
  if (!/^#[0-9a-f]{6}$/i.test(base) || !/^#[0-9a-f]{6}$/i.test(over)) return base;
  const a = hexToRgb(base); const b = hexToRgb(over);
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, '0')).join('')}`;
}

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

export function makeColors(mode = 'dark', accentName = 'purple', surface = 'default', tint = false) {
  const base = { ...(mode === 'light' ? LightColors : DarkColors), ...(Surfaces[surface]?.[mode] || {}) };
  const accent = (AccentPresets[accentName] || AccentPresets.purple)[mode];
  // "Tinted": the accent washes lightly into every surface, so the whole app takes the color.
  if (tint) {
    const strength = mode === 'light' ? 0.07 : 0.09;
    for (const key of ['background', 'card', 'cardButton', 'cardButtonPressed', 'navbar', 'border']) base[key] = mixColor(base[key], accent, key === 'background' ? strength * 0.8 : strength);
  }
  return { ...base, accent, accentSoft: colorWithAlpha(accent, mode === 'light' ? 0.12 : 0.18), accentPressed: accent, tabActive: accent, tabInactive: base.textMuted };
}

export const Colors = makeColors('dark', 'purple');
export default Colors;
