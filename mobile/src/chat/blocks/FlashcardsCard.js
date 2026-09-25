/**
 * A ```flashcards block: [{"front": "...", "back": "..."}] as a deck the
 * student flips through, one card at a time. Fronts and backs may hold math.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, RectangleStackIcon } from 'react-native-heroicons/outline';
import KaTeXMessage from '../KaTeXMessage';
import ElasticPressable from '../../components/ElasticPressable';
import { Radius } from '../../constants/layout';
import { usePreferences } from '../../context/AppPreferences';

export function parseFlashcards(code) {
  try {
    const value = JSON.parse(String(code || '').trim());
    const list = Array.isArray(value) ? value : Array.isArray(value?.cards) ? value.cards : [];
    return list
      .map((c) => ({ front: String(c?.front ?? c?.q ?? c?.term ?? '').slice(0, 400), back: String(c?.back ?? c?.a ?? c?.definition ?? '').slice(0, 800) }))
      .filter((c) => c.front && c.back)
      .slice(0, 30);
  } catch (_) {
    return null;
  }
}

export default function FlashcardsCard({ block, maxWidth }) {
  const { colors, type, t } = usePreferences();
  const cards = useMemo(() => (block.closed ? parseFlashcards(block.code) : null), [block.closed, block.code]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!cards?.length) {
    return (
      <View style={[styles.card, { backgroundColor: colors.cardButton }]}>
        <Text style={[{ color: colors.textMuted }, type(13, 'semiBold', 18)]}>{block.closed ? t('flashcardsBroken') : t('flashcardsWriting')}</Text>
      </View>
    );
  }

  const card = cards[Math.min(index, cards.length - 1)];
  const go = (step) => { setFlipped(false); setIndex((i) => (i + step + cards.length) % cards.length); };
  const width = Math.max(200, (maxWidth || 320) - 28);

  return (
    <View style={[styles.card, { backgroundColor: colors.cardButton }]}>
      <View style={styles.header}>
        <RectangleStackIcon size={16} color={colors.accent} />
        <Text style={[{ color: colors.textPrimary, flex: 1 }, type(13, 'bold', 18)]}>{t('flashcardsTitle')}</Text>
        <Text style={[{ color: colors.textMuted }, type(12, 'semiBold', 16)]}>{index + 1} / {cards.length}</Text>
      </View>
      <Pressable onPress={() => setFlipped((f) => !f)} accessibilityRole="button" accessibilityLabel={flipped ? t('flashcardsShowFront') : t('flashcardsShowBack')}>
        <View style={[styles.face, { backgroundColor: flipped ? colors.accent : colors.card }]}>
          <Text style={[{ color: flipped ? colors.white : colors.textMuted }, type(10, 'bold', 13)]}>{flipped ? t('flashcardsBack') : t('flashcardsFront')}</Text>
          <KaTeXMessage text={flipped ? card.back : card.front} color={flipped ? colors.white : colors.textPrimary} textAlign="center" fontStyle={type(flipped ? 14 : 16, flipped ? 'regular' : 'bold', 22)} maxWidth={width - 24} />
          <View style={styles.flipHint}><ArrowPathIcon size={12} color={flipped ? colors.white : colors.textMuted} /><Text style={[{ color: flipped ? colors.white : colors.textMuted }, type(11, 'semiBold', 14)]}>{t('flashcardsTap')}</Text></View>
        </View>
      </Pressable>
      <View style={styles.nav}>
        <ElasticPressable shape="circle" onPress={() => go(-1)} accessibilityRole="button" accessibilityLabel={t('previous')}>
          <View style={[styles.navButton, { backgroundColor: colors.card }]}><ChevronLeftIcon size={18} color={colors.textPrimary} /></View>
        </ElasticPressable>
        <View style={styles.dots}>
          {cards.slice(0, 12).map((_, i) => <View key={i} style={[styles.dot, { backgroundColor: i === index ? colors.accent : colors.track }]} />)}
        </View>
        <ElasticPressable shape="circle" onPress={() => go(1)} accessibilityRole="button" accessibilityLabel={t('next')}>
          <View style={[styles.navButton, { backgroundColor: colors.card }]}><ChevronRightIcon size={18} color={colors.textPrimary} /></View>
        </ElasticPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.md, padding: 14, gap: 12, marginVertical: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  face: { minHeight: 170, borderRadius: Radius.md, padding: 16, alignItems: 'center', justifyContent: 'center', gap: 10 },
  flipHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', justifyContent: 'center', flex: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
