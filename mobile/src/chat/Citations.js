/**
 * What the answer was built on.
 *
 * MoeAI sends the passages it retrieved before the first token arrives. On the
 * web they sit collapsed under the reply; here they do the same, because the
 * argument is identical: a tutor that says "your week 11 lecture covers this"
 * is only worth trusting if the student can open the passage and check.
 *
 * Each entry holds the text that was actually retrieved, not just a title, so
 * a citation that does not support the claim is visible rather than hidden
 * behind a plausible-looking heading.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BookOpenIcon, ChevronDownIcon, ChevronUpIcon } from 'react-native-heroicons/solid';
import ElasticPressable from '../components/ElasticPressable';
import { Radius } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';

export default function Citations({ items }) {
  const { colors, type, t, isRTL } = usePreferences();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(null);
  if (!items?.length) return null;
  const Chevron = open ? ChevronUpIcon : ChevronDownIcon;

  return (
    <View style={styles.root}>
      <ElasticPressable shape="pill" pressableStyle={styles.toggleHit} onPress={() => setOpen(!open)} accessibilityRole="button">
        <View style={[styles.toggle, { borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <BookOpenIcon size={12} color={colors.textMuted} />
          <Text style={[{ color: colors.textMuted }, type(11, 'regular', 15)]}>
            {t(items.length === 1 ? 'builtOnPassage' : 'builtOnPassages', { count: items.length })}
          </Text>
          <Chevron size={12} color={colors.textMuted} />
        </View>
      </ElasticPressable>

      {open && items.map((item, index) => {
        const id = `${item.ref}-${index}`;
        const expanded = shown === id;
        return (
          <View key={id} style={styles.entry}>
            <ElasticPressable shape="pill" pressableStyle={styles.entryHit} onPress={() => setShown(expanded ? null : id)} accessibilityRole="button">
              <View style={[styles.entryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.index, { backgroundColor: colors.cardButton }]}>
                  <Text style={[{ color: colors.accent }, type(10, 'bold', 13)]}>{index + 1}</Text>
                </View>
                <View style={styles.flex}>
                  <Text numberOfLines={2} style={[{ color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(12, 'semiBold', 16)]}>{item.title}</Text>
                  <Text style={[{ color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }, type(10, 'regular', 14)]}>
                    {item.source === 'library' ? t('yourLibrary') : t('courseMaterial')} · {item.ref}
                  </Text>
                </View>
              </View>
            </ElasticPressable>
            {expanded && (
              <Text style={[styles.excerpt, { color: colors.textSecondary, borderColor: colors.accent, textAlign: isRTL ? 'right' : 'left' }, type(11, 'regular', 17)]}>
                {item.excerpt}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 8, gap: 4 },
  flex: { flex: 1, gap: 1 },
  toggleHit: { alignSelf: 'flex-start', borderRadius: Radius.pill },
  toggle: { alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill, borderWidth: StyleSheet.hairlineWidth },
  entry: { gap: 2 },
  entryHit: { borderRadius: Radius.sm },
  entryRow: { alignItems: 'flex-start', gap: 9, paddingVertical: 5 },
  index: { width: 17, height: 17, borderRadius: 5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  excerpt: { marginLeft: 26, paddingLeft: 9, borderLeftWidth: 2, opacity: 0.92 },
});
