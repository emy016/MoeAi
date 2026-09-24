/**
 * A PhET simulation in a MoeAI reply, and the conversation around it.
 *
 * MoeAI picks the sim and writes tasks for this student; the student works
 * through them in the real simulation, ticks them off, and sends what they
 * saw back to MoeAI in one tap, which is where the teaching happens.
 */
import React, { useMemo, useState } from 'react';
import { Linking, Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowsPointingOutIcon, ArrowTopRightOnSquareIcon, BeakerIcon, CheckIcon, ChatBubbleLeftRightIcon, XMarkIcon } from 'react-native-heroicons/outline';
import { usePreferences } from '../../context/AppPreferences';
import { Radius } from '../../constants/layout';
import PhetFrame from './PhetFrame';
import { PHET_CREDIT, parsePhet, phetUrl } from '../../simulators/phet';

export default React.memo(function PhetCard({ block, onAsk }) {
  const { colors, t, type, language, isRTL } = usePreferences();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const spec = useMemo(() => (block.closed ? parsePhet(block.code) : null), [block.closed, block.code]);
  const url = spec ? phetUrl(spec.sim, language) : null;
  const [done, setDone] = useState(() => new Set());
  const [expanded, setExpanded] = useState(false);
  const height = Math.round(Math.min(520, Math.max(260, Math.min(width - 32, 760) * 0.62)));

  if (!block.closed || !spec || !url) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 14 }]}>
        <Text style={[{ color: colors.textMuted }, type(11, 'semiBold', 15)]}>{block.closed ? t('phetUnknown') : t('blockBuilding', { what: t('blockPhet').toLowerCase() })}</Text>
      </View>
    );
  }

  const toggle = (i) => setDone((current) => { const next = new Set(current); if (next.has(i)) next.delete(i); else next.add(i); return next; });
  const ask = () => {
    const finished = spec.tasks.filter((_, i) => done.has(i));
    onAsk?.(t('phetAsk', { title: spec.title, done: finished.length ? finished.join('; ') : t('phetExplored') }));
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <BeakerIcon size={16} color={colors.accent} />
          <Text style={[{ color: colors.textPrimary, flexShrink: 1 }, type(12, 'bold', 16)]} numberOfLines={1}>{spec.title}</Text>
        </View>
        <View style={styles.actions}>
          <Pressable onPress={() => setExpanded(true)} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('blockExpand')} style={styles.action}>
            <ArrowsPointingOutIcon size={16} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => (Platform.OS === 'web' ? window.open(url, '_blank', 'noopener') : Linking.openURL(url))} hitSlop={6} accessibilityRole="link" accessibilityLabel={t('phetOpen')} style={styles.action}>
            <ArrowTopRightOnSquareIcon size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
      {spec.tasks.length ? (
        <View style={styles.tasks}>
          {spec.tasks.map((task, i) => (
            <Pressable key={i} onPress={() => toggle(i)} accessibilityRole="checkbox" accessibilityState={{ checked: done.has(i) }}
              style={[styles.task, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.check, { borderColor: done.has(i) ? colors.accent : colors.border, backgroundColor: done.has(i) ? colors.accent : 'transparent' }]}>
                {done.has(i) ? <CheckIcon size={12} color="#fff" /> : <Text style={[{ color: colors.textMuted }, type(10, 'bold', 12)]}>{i + 1}</Text>}
              </View>
              <Text style={[{ color: colors.textSecondary, flex: 1, opacity: done.has(i) ? 0.6 : 1, textAlign: isRTL ? 'right' : 'left' }, type(12, 'regular', 17)]}>{task}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <PhetFrame url={url} height={height} title={spec.title} />
      <View style={[styles.footer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={[{ color: colors.textMuted, flex: 1 }, type(10, 'regular', 13)]} numberOfLines={2}>{PHET_CREDIT}</Text>
        {onAsk ? (
          <Pressable onPress={ask} accessibilityRole="button" style={[styles.askButton, { backgroundColor: colors.cardButton }]}>
            <ChatBubbleLeftRightIcon size={14} color={colors.accent} />
            <Text style={[{ color: colors.textPrimary }, type(11, 'bold', 15)]}>{t('phetTell')}</Text>
          </Pressable>
        ) : null}
      </View>
      {expanded && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setExpanded(false)}>
          <View style={[styles.full, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <View style={[styles.fullHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.titleRow}><BeakerIcon size={18} color={colors.accent} /><Text style={[{ color: colors.textPrimary }, type(14, 'bold', 18)]}>{spec.title}</Text></View>
              <Pressable onPress={() => setExpanded(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('close')}
                style={[styles.close, { backgroundColor: colors.cardButton }]}><XMarkIcon size={20} color={colors.textPrimary} /></Pressable>
            </View>
            <View style={[styles.fullBody, { paddingBottom: insets.bottom }]}><PhetFrame url={url} height="100%" title={spec.title} style={{ flex: 1 }} /></View>
          </View>
        </Modal>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: { width: '100%', borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginVertical: 6 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  action: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 999 },
  tasks: { paddingHorizontal: 10, paddingVertical: 6, gap: 2 },
  task: { alignItems: 'flex-start', gap: 9, paddingVertical: 5 },
  check: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  footer: { alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 8 },
  askButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
  full: { flex: 1 },
  fullHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  fullBody: { flex: 1 },
});
