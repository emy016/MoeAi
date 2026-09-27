/**
 * The DM with MoeAI: one permanent conversation, like WhatsApp.
 *
 * Messages live on the server (/api/dm) and load a page at a time; scrolling
 * up fetches older ones (an inverted list, so the newest stays at the bottom).
 * MoeAI's proactive messages arrive here too, and replying to a notification
 * opens this thread with that message quoted. The same memory as every
 * lecture chat backs it.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { ArrowUpIcon, BellAlertIcon, XMarkIcon } from 'react-native-heroicons/solid';
import RichMessage from '../chat/RichMessage';
import ElasticPressable from '../components/ElasticPressable';
import { API_BASE_URL, awarenessForRequest } from '../ai/client';
import { Radius, Spacing, TabBar } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import { enablePush, pushState, refreshPush } from './webPush';

const PAGE = 30;

async function readStream(response, onDelta) {
  const reader = response.body?.getReader ? response.body.getReader() : null;
  let text = '';
  let error = '';
  const handle = (line) => {
    if (!line.trim()) return;
    try {
      const event = JSON.parse(line);
      if (event.delta) { text += event.delta; onDelta(text); }
      if (event.error) error = event.error;
    } catch (_) {}
  };
  if (!reader) {
    (await response.text()).split('\n').forEach(handle);
    return { text, error };
  }
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    lines.forEach(handle);
  }
  handle(buffer);
  return { text, error };
}

const visible = (text) => String(text || '').replace(/```(memory|skill)[\s\S]*?(```|$)/gi, '').trim();

export default function DMThread({ replyTo, onClearReply, bottomInset = 0 }) {
  const { colors, type, isRTL } = usePreferences();
  const { width } = useWindowDimensions();
  const [messages, setMessages] = useState([]); // newest first (inverted list)
  const [more, setMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notify, setNotify] = useState(() => pushState());
  const loadingOlder = useRef(false);
  const bubbleWidth = Math.min(width, 760) * 0.78;

  const load = useCallback(async (before) => {
    const url = `${API_BASE_URL}/api/dm?limit=${PAGE}${before ? `&before=${before}` : ''}`;
    const res = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not load the DM.');
    return res.json();
  }, []);

  useEffect(() => {
    let alive = true;
    load().then((data) => {
      if (!alive) return;
      setMessages([...(data.messages || [])].reverse());
      setMore(Boolean(data.more));
    }).catch((err) => alive && setError(err.message)).finally(() => alive && setLoading(false));
    refreshPush();
    return () => { alive = false; };
  }, [load]);

  const loadOlder = useCallback(async () => {
    if (!more || loadingOlder.current || !messages.length) return;
    const oldest = messages[messages.length - 1]?.id;
    if (typeof oldest !== 'number') return;
    loadingOlder.current = true;
    try {
      const data = await load(oldest);
      setMessages((current) => [...current, ...[...(data.messages || [])].reverse()]);
      setMore(Boolean(data.more));
    } catch (_) {} finally { loadingOlder.current = false; }
  }, [load, messages, more]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    setError('');
    setSending(true);
    const mine = { id: `local-${Date.now()}`, role: 'user', content: text };
    const reply = { id: `reply-${Date.now()}`, role: 'assistant', content: '', pending: true };
    setMessages((current) => [reply, mine, ...current]);
    try {
      const res = await fetch(`${API_BASE_URL}/api/dm`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
        body: JSON.stringify({ text, replyTo: replyTo || undefined, awareness: awarenessForRequest() }),
      });
      if (!res.ok) {
        const message = (await res.json().catch(() => ({}))).error || 'MoeAI could not answer right now.';
        throw new Error(message);
      }
      onClearReply?.();
      const { text: answer, error: streamError } = await readStream(res, (partial) => {
        setMessages((current) => current.map((m) => (m.id === reply.id ? { ...m, content: partial, pending: false } : m)));
      });
      if (!answer) throw new Error(streamError || 'MoeAI sent an empty reply.');
      setMessages((current) => current.map((m) => (m.id === reply.id ? { ...m, content: answer, pending: false } : m)));
    } catch (err) {
      setError(err.message);
      setMessages((current) => current.filter((m) => m.id !== reply.id));
    } finally {
      setSending(false);
    }
  }, [draft, onClearReply, replyTo, sending]);

  const turnOnNotifications = useCallback(async () => {
    try { setNotify(await enablePush()); } catch (_) { setNotify('unavailable'); }
  }, []);

  const renderItem = useCallback(({ item }) => {
    const user = item.role === 'user';
    return (
      <View style={[styles.row, { justifyContent: user ? 'flex-end' : 'flex-start' }]}>
        <View style={[styles.bubble, { maxWidth: bubbleWidth, backgroundColor: user ? colors.accent : colors.cardButton }, user ? { borderBottomRightRadius: 5 } : { borderBottomLeftRadius: 5 }]}>
          {item.pending ? <ActivityIndicator size="small" color={colors.textMuted} /> : user
            ? <Text style={[{ color: colors.white, textAlign: isRTL ? 'right' : 'left' }, type(15, 'regular', 21)]}>{item.content}</Text>
            : <RichMessage text={visible(item.content)} color={colors.textPrimary} textAlign={isRTL ? 'right' : 'left'} fontStyle={type(15, 'regular', 21)} maxWidth={bubbleWidth - 26} />}
        </View>
      </View>
    );
  }, [bubbleWidth, colors, isRTL, type]);

  const composerBottom = (Platform.OS === 'web' ? TabBar.HEIGHT + TabBar.PILL_MARGIN_BOTTOM + Spacing.sm : Spacing.sm) + bottomInset;

  return (
    <View style={styles.root}>
      {notify === 'default' ? (
        <Pressable onPress={turnOnNotifications} style={[styles.notify, { backgroundColor: colors.cardButton }]} accessibilityRole="button">
          <BellAlertIcon size={16} color={colors.accent} />
          <Text style={[{ color: colors.textPrimary, flex: 1 }, type(13, 'semiBold', 18)]}>Get MoeAI's messages as notifications</Text>
          <Text style={[{ color: colors.accent }, type(13, 'bold', 18)]}>Turn on</Text>
        </Pressable>
      ) : null}
      {loading ? <View style={styles.center}><ActivityIndicator color={colors.accent} /></View> : (
        <FlatList
          inverted
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.4}
          contentContainerStyle={styles.list}
          ListFooterComponent={more && messages.length ? <ActivityIndicator style={{ margin: 12 }} color={colors.textMuted} /> : null}
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }, type(14, 'regular', 20)]}>Say hi. MoeAI remembers what you study, here and in every lecture chat.</Text>}
        />
      )}
      {error ? <Text style={[styles.error, { color: colors.danger }, type(12, 'semiBold', 16)]}>{error}</Text> : null}
      <View style={{ marginBottom: composerBottom, paddingHorizontal: Spacing.md, gap: 6 }}>
        {replyTo ? (
          <View style={[styles.quote, { backgroundColor: colors.cardButton, borderLeftColor: colors.accent }]}>
            <Text numberOfLines={2} style={[{ color: colors.textSecondary, flex: 1 }, type(12, 'regular', 17)]}>{replyTo}</Text>
            <Pressable onPress={onClearReply} hitSlop={8} accessibilityLabel="Cancel reply"><XMarkIcon size={16} color={colors.textMuted} /></Pressable>
          </View>
        ) : null}
        <View style={[styles.composer, { backgroundColor: colors.cardButton }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message MoeAI"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.accent}
            multiline
            numberOfLines={1}
            maxLength={4000}
            onKeyPress={Platform.OS === 'web' ? (event) => {
              const e = event?.nativeEvent || {};
              if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { event.preventDefault?.(); send(); }
            } : undefined}
            style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(15, 'regular', 20)]}
          />
          <ElasticPressable shape="circle" onPress={send} disabled={!draft.trim() || sending} accessibilityRole="button" accessibilityLabel="Send">
            <View style={[styles.send, { backgroundColor: colors.accent, opacity: draft.trim() && !sending ? 1 : 0.45 }]}><ArrowUpIcon size={18} color={colors.background} /></View>
          </ElasticPressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: 6 },
  row: { flexDirection: 'row', marginVertical: 3 },
  bubble: { borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9, minWidth: 44 },
  empty: { textAlign: 'center', padding: Spacing.lg, transform: [{ scaleY: -1 }] },
  error: { paddingHorizontal: Spacing.md, paddingBottom: 4 },
  notify: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, paddingHorizontal: 12, paddingVertical: 10, borderRadius: Radius.md },
  quote: { flexDirection: 'row', alignItems: 'center', gap: 8, borderLeftWidth: 3, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', borderRadius: 28, padding: 6, gap: 7, minHeight: 52 },
  input: { flex: 1, minWidth: 0, minHeight: 40, maxHeight: 110, paddingHorizontal: 8, paddingVertical: 9 },
  send: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
