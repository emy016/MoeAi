/**
 * PracticeScreen.js
 * ---------------------------------------------------------------------
 * Practice is a quiz you actually sit, not a list of decks.
 *
 * Pick a course and MoeAI asks one question at a time, marks the answer,
 * and moves on — the same endpoint and the same voice as the lecture
 * chat, with a different instruction in front of it. A session is
 * deliberately not persisted: practice is a thing you do, and a stale
 * half-finished quiz waiting for you on launch is worse than nothing.
 * ---------------------------------------------------------------------
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { PaperAirplaneIcon, SparklesIcon, XMarkIcon } from 'react-native-heroicons/solid';
import Card from '../components/Card';
import ElasticPressable from '../components/ElasticPressable';
import MarkdownText from '../chat/MarkdownText';
import ScreenContainer from '../components/ScreenContainer';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import { streamReply } from '../ai/moeai';
import { subjectStats, useSubjectStore } from '../subjects/subjectStore';

const makeId = () => `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** What the tutor is told before a practice session. Never shown to the student. */
function opening(subject, stats) {
  if (!subject) {
    return 'Quiz me across everything I am studying. Ask exactly one question, wait for my answer, mark it, then ask the next. Keep each question short.';
  }
  const done = subject.lectures.filter((l) => (l.completedOverride ? 1 : l.progress) >= 1).map((l) => l.title);
  return [
    `Quiz me on ${subject.name}. Ask exactly one question, wait for my answer, mark it honestly, then ask the next one.`,
    done.length ? `I have finished these lectures: ${done.join(', ')}. Start there.` : 'I am early in this course, so start with the basics.',
    `I am about ${Math.round(stats.progress * 100)}% through it. Keep each question short enough to answer on a phone.`,
  ].join(' ');
}

export default function PracticeScreen({ active }) {
  const { colors, type, t, isRTL, motion } = usePreferences();
  const { subjects } = useSubjectStore();
  const [subjectId, setSubjectId] = useState(null);
  const [turns, setTurns] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);
  const controller = useRef(null);

  const subject = useMemo(() => subjects.find((s) => s.id === subjectId) || null, [subjectId, subjects]);
  const stats = useMemo(() => (subject ? subjectStats(subject) : { progress: 0, total: 0, completed: 0 }), [subject]);

  const ask = useCallback(async (history, promptText) => {
    const id = makeId();
    setTurns((current) => [...current, { id, role: 'assistant', text: '', pending: true }]);
    setBusy(true);
    const messages = [...history, { role: 'user', text: promptText }];
    controller.current = typeof AbortController !== 'undefined' ? new AbortController() : null;
    try {
      const full = await streamReply(
        { messages, context: { mode: 'quiz', course: subject?.name || null, source: 'mobile-practice' }, signal: controller.current?.signal },
        (_delta, sofar) => setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, text: sofar } : turn))),
      );
      setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, text: full, pending: false } : turn)));
    } catch (error) {
      const message = (error?.fromServer && error.message) || t('aiUnreachable');
      setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, text: message, pending: false, failed: true } : turn)));
    } finally {
      setBusy(false);
      controller.current = null;
    }
  }, [subject, t]);

  const start = useCallback((next) => {
    setSubjectId(next ? next.id : null);
    const chosen = next || null;
    const chosenStats = chosen ? subjectStats(chosen) : stats;
    setTurns([]);
    ask([], opening(chosen, chosenStats));
  }, [ask, stats]);

  const answer = useCallback(() => {
    const clean = draft.trim();
    if (!clean || busy) return;
    const history = turns.filter((turn) => turn.text && !turn.failed).map((turn) => ({ role: turn.role, text: turn.text }));
    setTurns((current) => [...current, { id: makeId(), role: 'user', text: clean }]);
    setDraft('');
    ask(history, clean);
  }, [ask, busy, draft, turns]);

  const end = useCallback(() => {
    controller.current?.abort();
    setTurns([]);
    setSubjectId(null);
  }, []);

  if (!turns.length) {
    return (
      <ScreenContainer>
        <Card>
          <Text style={[styles.title, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(16, 'bold')]}>{t('practiceSets')}</Text>
          <Text style={[{ color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }, type(14, 'regular', 20)]}>{t('practiceIntro')}</Text>
          <ElasticPressable shape="pill" style={styles.mixed} pressableStyle={styles.mixedHit} onPress={() => start(null)} accessibilityRole="button">
            <View style={[styles.mixedInner, { backgroundColor: colors.accent, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <SparklesIcon size={17} color={colors.white} />
              <Text style={[{ color: colors.white }, type(14, 'bold')]}>{t('mixedReview')}</Text>
            </View>
          </ElasticPressable>
        </Card>

        <Card>
          <Text style={[styles.title, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(16, 'bold')]}>{t('byCourse')}</Text>
          <View style={styles.chips}>
            {subjects.map((item) => {
              const itemStats = subjectStats(item);
              return (
                <ElasticPressable key={item.id} shape="pill" style={styles.chip} pressableStyle={styles.chipHit} onPress={() => start(item)} accessibilityRole="button">
                  <View style={[styles.chipInner, { backgroundColor: colors.cardButton }]}>
                    <Text numberOfLines={1} style={[{ color: colors.textPrimary }, type(13, 'semiBold')]}>{item.name}</Text>
                    <Text style={[{ color: colors.textMuted }, type(11, 'regular')]}>{itemStats.completed}/{itemStats.total}</Text>
                  </View>
                </ElasticPressable>
              );
            })}
          </View>
        </Card>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.session}>
        <View style={[styles.sessionBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text numberOfLines={1} style={[styles.flex, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(14, 'bold')]}>
            {subject ? subject.name : t('mixedReview')}
          </Text>
          <ElasticPressable shape="circle" onPress={end} accessibilityRole="button" accessibilityLabel={t('endSession')}>
            <View style={[styles.endButton, { backgroundColor: colors.cardButton }]}><XMarkIcon size={16} color={colors.textSecondary} /></View>
          </ElasticPressable>
        </View>

        <FlatList
          ref={listRef}
          data={turns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.transcript}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: motion })}
          renderItem={({ item }) => (
            <View style={[styles.turn, item.role === 'user' ? styles.turnUser : styles.turnMoe]}>
              <View style={[styles.bubble, { backgroundColor: item.role === 'user' ? colors.accent : colors.card }]}>
                {item.role === 'user'
                  ? <Text style={[{ color: colors.white }, type(14, 'regular', 20)]}>{item.text}</Text>
                  : item.text
                    ? <MarkdownText text={item.text} colors={colors} type={type} isRTL={isRTL} baseColor={colors.textPrimary} />
                    : <ActivityIndicator size="small" color={colors.textMuted} />}
              </View>
            </View>
          )}
        />

        <View style={[styles.composer, { backgroundColor: colors.card, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TextInput
            style={[styles.flex, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(14, 'regular', 20)]}
            placeholder={t('yourAnswer')}
            placeholderTextColor={colors.textMuted}
            value={draft}
            onChangeText={setDraft}
            multiline
            editable={!busy}
            onSubmitEditing={answer}
          />
          <ElasticPressable shape="circle" onPress={answer} accessibilityRole="button" accessibilityLabel={t('sendMessage')}>
            <View style={[styles.send, { backgroundColor: draft.trim() && !busy ? colors.accent : colors.cardButton }]}>
              <PaperAirplaneIcon size={16} color={draft.trim() && !busy ? colors.white : colors.textMuted} />
            </View>
          </ElasticPressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 4 },
  flex: { flex: 1 },
  mixed: { marginTop: Spacing.md, alignSelf: 'flex-start' },
  mixedHit: { borderRadius: Radius.pill },
  mixedInner: { alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 11, borderRadius: Radius.pill },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  chip: { marginBottom: 0 },
  chipHit: { borderRadius: Radius.md },
  chipInner: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.md, gap: 2, minWidth: 120 },
  session: { flex: 1, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  sessionBar: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  endButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  transcript: { paddingBottom: Spacing.md, gap: Spacing.sm },
  turn: { width: '100%' },
  turnUser: { alignItems: 'flex-end' },
  turnMoe: { alignItems: 'flex-start' },
  bubble: { maxWidth: '88%', padding: 12, borderRadius: Radius.md },
  composer: { alignItems: 'flex-end', gap: Spacing.sm, padding: Spacing.sm, borderRadius: Radius.md },
  send: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
