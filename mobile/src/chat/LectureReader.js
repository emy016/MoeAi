/**
 * The lecture itself, page by page, inside the chat: the lecturer's slides as
 * MoeAI read them (text, formulas and figure descriptions), with a way to ask
 * about any page. Served by /api/org/lecture, which only returns material the
 * student's course has published.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatBubbleLeftRightIcon, XMarkIcon } from 'react-native-heroicons/solid';
import RichMessage from './RichMessage';
import { API_BASE_URL } from '../ai/client';
import ElasticPressable from '../components/ElasticPressable';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';

export default function LectureReader({ visible, materialId, title, onClose, onAsk }) {
  const { colors, type, t, isRTL } = usePreferences();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [state, setState] = useState({ status: 'idle', pages: [], summary: '', error: '' });
  const [current, setCurrent] = useState(1);
  const listRef = useRef(null);

  useEffect(() => {
    if (!visible || !materialId || state.status === 'ready') return undefined;
    let alive = true;
    setState((s) => ({ ...s, status: 'loading', error: '' }));
    fetch(`${API_BASE_URL}/api/org/lecture?id=${encodeURIComponent(materialId)}`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) setState({ status: 'error', pages: [], summary: '', error: body.error || t('lectureUnavailable') });
        else setState({ status: 'ready', pages: Array.isArray(body.pages) ? body.pages : [], summary: body.summary || '', error: '' });
      })
      .catch(() => alive && setState({ status: 'error', pages: [], summary: '', error: t('lectureOffline') }));
    return () => { alive = false; };
  }, [materialId, state.status, t, visible]);

  const onViewable = useRef(({ viewableItems }) => {
    const first = viewableItems.find((v) => v.item?.page);
    if (first) setCurrent(first.item.page);
  }).current;

  const jump = useCallback((page) => {
    const index = state.pages.findIndex((p) => p.page === page);
    if (index >= 0) listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
  }, [state.pages]);

  const textWidth = Math.min(760, width - Spacing.md * 2) - 28;
  const renderPage = useCallback(({ item }) => (
    <View style={[styles.page, { backgroundColor: colors.card }]}>
      <View style={[styles.pageHead, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={[{ color: colors.textMuted }, type(11, 'bold', 14)]}>{t('pageN').replace('{n}', String(item.page))}</Text>
        <ElasticPressable shape="pill" onPress={() => onAsk(item)} accessibilityRole="button" accessibilityLabel={t('askAboutPage')}>
          <View style={[styles.ask, { backgroundColor: colors.cardButton }]}>
            <ChatBubbleLeftRightIcon size={13} color={colors.accent} />
            <Text style={[{ color: colors.accent }, type(11, 'bold', 14)]}>{t('askAboutPage')}</Text>
          </View>
        </ElasticPressable>
      </View>
      <RichMessage text={item.content} color={colors.textPrimary} textAlign={isRTL ? 'right' : 'left'} fontStyle={type(14, 'regular', 21)} maxWidth={textWidth} />
    </View>
  ), [colors, isRTL, onAsk, t, textWidth, type]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 6 }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerText}>
            <Text numberOfLines={1} style={[{ color: colors.textPrimary }, type(16, 'bold', 21)]}>{title}</Text>
            <Text numberOfLines={1} style={[{ color: colors.textMuted }, type(11, 'semiBold', 15)]}>
              {state.status === 'ready' ? `${t('pageN').replace('{n}', String(current))} / ${state.pages.length}` : t('readLecture')}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('close')} style={[styles.close, { backgroundColor: colors.cardButton }]}>
            <XMarkIcon size={20} color={colors.textPrimary} />
          </Pressable>
        </View>
        {state.status === 'ready' && state.pages.length > 1 ? (
          <FlatList horizontal data={state.pages} keyExtractor={(p) => `dot-${p.page}`} showsHorizontalScrollIndicator={false} style={styles.dotsList} contentContainerStyle={styles.dots}
            renderItem={({ item }) => (
              <Pressable onPress={() => jump(item.page)} accessibilityRole="button" accessibilityLabel={t('pageN').replace('{n}', String(item.page))}
                style={[styles.dot, { backgroundColor: item.page === current ? colors.accent : colors.cardButton }]}>
                <Text style={[{ color: item.page === current ? colors.white : colors.textSecondary }, type(11, 'bold', 14)]}>{item.page}</Text>
              </Pressable>
            )} />
        ) : null}
        {state.status === 'loading' || state.status === 'idle' ? (
          <View style={styles.center}><ActivityIndicator color={colors.accent} /><Text style={[{ color: colors.textMuted, marginTop: 10 }, type(13, 'regular', 18)]}>{t('loadingLecture')}</Text></View>
        ) : state.status === 'error' ? (
          <View style={styles.center}>
            <Text style={[{ color: colors.textSecondary, textAlign: 'center' }, type(14, 'regular', 20)]}>{state.error}</Text>
            <ElasticPressable shape="pill" onPress={() => setState((s) => ({ ...s, status: 'idle' }))}>
              <View style={[styles.retry, { backgroundColor: colors.cardButton }]}><Text style={[{ color: colors.textPrimary }, type(13, 'bold', 17)]}>{t('tryAgain')}</Text></View>
            </ElasticPressable>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={state.pages}
            keyExtractor={(p) => String(p.page)}
            renderItem={renderPage}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing.lg }]}
            ListHeaderComponent={state.summary ? <Text style={[styles.summary, { color: colors.textSecondary, backgroundColor: colors.cardButton }, type(13, 'regular', 19)]}>{state.summary}</Text> : null}
            onViewableItemsChanged={onViewable}
            viewabilityConfig={{ itemVisiblePercentThreshold: 30 }}
            onScrollToIndexFailed={(info) => setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: true }), 150)}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.md, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  headerText: { flex: 1, minWidth: 0 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dotsList: { flexGrow: 0 },
  dots: { gap: 6, paddingHorizontal: Spacing.md, paddingVertical: 10 },
  dot: { minWidth: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  list: { padding: Spacing.md, gap: 12 },
  page: { alignSelf: 'center', width: '100%', maxWidth: 760, borderRadius: Radius.lg, padding: 14, gap: 8 },
  pageHead: { alignItems: 'center', justifyContent: 'space-between' },
  ask: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.pill },
  summary: { alignSelf: 'center', width: '100%', maxWidth: 760, padding: 12, borderRadius: Radius.md, overflow: 'hidden', marginBottom: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: 12 },
  retry: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.pill },
});
