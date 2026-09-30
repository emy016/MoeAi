/**
 * Small building blocks for tutor mode, made from the app's own pieces
 * (Card surfaces, ElasticPressable, the theme's colours and type scale) so
 * staff screens look and move like the student app.
 */
import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XMarkIcon } from 'react-native-heroicons/outline';
import ElasticPressable from '../components/ElasticPressable';
import { colorWithAlpha } from '../constants/colors';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';

export const TONES = (colors) => ({
  accent: colors.accent,
  good: '#48B679',
  warn: '#E0A43A',
  bad: colors.danger,
  muted: colors.textMuted,
});

export function Chip({ label, tone = 'muted', solid = false }) {
  const { colors, type } = usePreferences();
  const c = TONES(colors)[tone] || colors.textMuted;
  return (
    <View style={[ui.chip, { backgroundColor: solid ? c : colorWithAlpha(c, 0.16) }]}>
      <Text numberOfLines={1} style={[{ color: solid ? '#fff' : tone === 'muted' ? colors.textSecondary : colors.textPrimary }, type(10.5, 'bold', 14)]}>{label}</Text>
    </View>
  );
}

export function Btn({ label, icon: Icon, onPress, tone = 'accent', busy = false, disabled = false, small = false, style }) {
  const { colors, type } = usePreferences();
  const bg = tone === 'accent' ? colors.accent : tone === 'danger' ? colorWithAlpha(colors.danger, 0.16) : colors.cardButton;
  const fg = tone === 'accent' ? '#fff' : tone === 'danger' ? colors.danger : colors.textPrimary;
  const off = disabled || busy;
  return (
    <ElasticPressable shape="pill" onPress={off ? undefined : onPress} accessibilityRole="button" accessibilityState={{ disabled: off, busy }} style={style}>
      <View style={[ui.btn, small && ui.btnSmall, { backgroundColor: bg, opacity: off && !busy ? 0.5 : 1 }]}>
        {busy ? <ActivityIndicator size="small" color={fg} /> : Icon ? <Icon size={small ? 15 : 17} color={fg} /> : null}
        {label ? <Text numberOfLines={1} style={[{ color: fg }, type(small ? 12 : 13, 'bold', small ? 16 : 17)]}>{label}</Text> : null}
      </View>
    </ElasticPressable>
  );
}

export function IconBtn({ icon: Icon, onPress, label, tone }) {
  const { colors } = usePreferences();
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => [ui.iconBtn, { backgroundColor: pressed ? colors.cardButtonPressed : colors.cardButton }]}>
      <Icon size={18} color={tone === 'danger' ? colors.danger : colors.textPrimary} />
    </Pressable>
  );
}

export function SectionTitle({ title, right }) {
  const { colors, type } = usePreferences();
  return (
    <View style={ui.sectionTitle}>
      <Text style={[{ color: colors.textMuted, flex: 1, textTransform: 'uppercase', letterSpacing: 0.7 }, type(11.5, 'bold', 15)]}>{title}</Text>
      {right}
    </View>
  );
}

export function Segmented({ options, value, onChange }) {
  const { colors, type } = usePreferences();
  return (
    <View style={[ui.segment, { backgroundColor: colors.cardButton }]}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[ui.segmentItem, on && { backgroundColor: colors.accent }]}>
            <Text numberOfLines={1} style={[{ color: on ? '#fff' : colors.textSecondary }, type(12.5, 'bold', 16)]}>{o.label}{o.count != null ? `  ${o.count}` : ''}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({ label, style, inputStyle, multiline, ...props }) {
  const { colors, type } = usePreferences();
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? <Text style={[{ color: colors.textSecondary }, type(12, 'bold', 16)]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        style={[ui.input, multiline && ui.inputMulti, { backgroundColor: colors.cardButton, color: colors.textPrimary }, type(14, 'regular', 20), inputStyle]}
        {...props}
      />
    </View>
  );
}

export function Stat({ value, label, tone }) {
  const { colors, type } = usePreferences();
  return (
    <View style={[ui.stat, { backgroundColor: colors.cardButton }]}>
      <Text style={[{ color: tone ? TONES(colors)[tone] : colors.textPrimary, fontVariant: ['tabular-nums'] }, type(20, 'bold', 25)]}>{value}</Text>
      <Text numberOfLines={1} style={[{ color: colors.textMuted }, type(11, 'bold', 14)]}>{label}</Text>
    </View>
  );
}

export function Empty({ title, body, children }) {
  const { colors, type } = usePreferences();
  return (
    <View style={[ui.empty, { backgroundColor: colors.card }]}>
      <Text style={[{ color: colors.textPrimary, textAlign: 'center' }, type(15, 'bold', 20)]}>{title}</Text>
      {body ? <Text style={[{ color: colors.textMuted, textAlign: 'center' }, type(13, 'regular', 19)]}>{body}</Text> : null}
      {children}
    </View>
  );
}

export function Banner({ message, tone = 'bad', onClose }) {
  const { colors, type } = usePreferences();
  if (!message) return null;
  const c = TONES(colors)[tone];
  return (
    <Pressable onPress={onClose} style={[ui.banner, { backgroundColor: colorWithAlpha(c, 0.14) }]} accessibilityRole="alert">
      <Text style={[{ color: colors.textPrimary, flex: 1 }, type(13, 'semiBold', 18)]}>{message}</Text>
      {onClose ? <XMarkIcon size={16} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

/** A full-screen page over the tabs, like the simulators' full view. */
export function FullPage({ visible, title, subtitle, onClose, right, children, scroll = true }) {
  const { colors, type } = usePreferences();
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  const Body = scroll ? ScrollView : View;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={[ui.full, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[ui.fullHeader, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={[{ color: colors.textPrimary }, type(17, 'bold', 22)]}>{title}</Text>
            {subtitle ? <Text numberOfLines={1} style={[{ color: colors.textMuted }, type(12, 'semiBold', 16)]}>{subtitle}</Text> : null}
          </View>
          {right}
          <IconBtn icon={XMarkIcon} onPress={onClose} label="Close" />
        </View>
        <Body style={{ flex: 1 }} contentContainerStyle={scroll ? { padding: Spacing.md, paddingBottom: insets.bottom + 40, gap: Spacing.md } : undefined} keyboardShouldPersistTaps="handled">
          {children}
        </Body>
      </View>
    </Modal>
  );
}

export function Row({ title, subtitle, left, right, onPress, onLongPress }) {
  const { colors, type } = usePreferences();
  const inner = (
    <View style={[ui.row, { backgroundColor: colors.card }]}>
      {left}
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text numberOfLines={2} style={[{ color: colors.textPrimary }, type(14, 'bold', 19)]}>{title}</Text>
        {typeof subtitle === 'string' ? <Text numberOfLines={2} style={[{ color: colors.textMuted }, type(12, 'regular', 17)]}>{subtitle}</Text> : subtitle}
      </View>
      {right}
    </View>
  );
  if (!onPress && !onLongPress) return inner;
  return <ElasticPressable shape="pill" onPress={onPress} onLongPress={onLongPress} delayLongPress={330} accessibilityRole="button">{inner}</ElasticPressable>;
}

export const relTime = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
};

export const ui = StyleSheet.create({
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill, alignSelf: 'flex-start' },
  btn: { minHeight: 42, borderRadius: Radius.pill, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  btnSmall: { minHeight: 32, paddingHorizontal: 12, gap: 5 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, marginTop: 4 },
  segment: { flexDirection: 'row', borderRadius: Radius.pill, padding: 4, gap: 4 },
  segmentItem: { flex: 1, minHeight: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  input: { borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 11 },
  inputMulti: { minHeight: 110, textAlignVertical: 'top' },
  stat: { flex: 1, minWidth: 72, borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: 12, gap: 2 },
  empty: { borderRadius: Radius.md, padding: Spacing.lg, gap: 8, alignItems: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10 },
  full: { flex: 1 },
  fullHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12 },
});
