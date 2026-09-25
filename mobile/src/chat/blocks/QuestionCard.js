/**
 * MoeAI asking before it answers: a ```questions block becomes tappable
 * choices instead of a wall of text. Each question is one of
 *   { "question": "...", "type": "test",     "options": [...] }   one choice
 *   { "question": "...", "type": "checkbox", "options": [...] }   several
 *   { "question": "...", "type": "input" }                         free text
 * with "allowCustom": true adding an "Other…" field to a choice question.
 * Sending posts the answers back as the student's next message.
 */
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { CheckIcon, QuestionMarkCircleIcon } from 'react-native-heroicons/outline';
import ElasticPressable from '../../components/ElasticPressable';
import { Radius } from '../../constants/layout';
import { usePreferences } from '../../context/AppPreferences';

function parse(code) {
  try {
    const value = JSON.parse(String(code || '').trim());
    const list = Array.isArray(value) ? value : Array.isArray(value?.questions) ? value.questions : [value];
    return list
      .filter((q) => q && typeof q.question === 'string')
      .slice(0, 6)
      .map((q, i) => ({
        id: String(q.id || i),
        question: q.question.slice(0, 300),
        type: ['checkbox', 'input'].includes(q.type) ? q.type : (Array.isArray(q.options) && q.options.length ? 'test' : 'input'),
        options: (Array.isArray(q.options) ? q.options : []).slice(0, 8).map((o) => String(typeof o === 'object' ? o.label ?? o.text ?? '' : o).slice(0, 120)).filter(Boolean),
        allowCustom: Boolean(q.allowCustom),
      }));
  } catch (_) {
    return null;
  }
}

export default function QuestionCard({ block, onSend }) {
  const { colors, type, t } = usePreferences();
  const questions = useMemo(() => (block.closed ? parse(block.code) : null), [block.closed, block.code]);
  const [answers, setAnswers] = useState({});
  const [custom, setCustom] = useState({});
  const [sent, setSent] = useState(false);

  if (!questions) {
    return (
      <View style={[styles.card, { backgroundColor: colors.cardButton }]}>
        <Text style={[{ color: colors.textMuted }, type(13, 'semiBold', 18)]}>{block.closed ? t('askBroken') : t('askWriting')}</Text>
      </View>
    );
  }

  const pick = (q, option) => setAnswers((prev) => {
    if (q.type === 'checkbox') {
      const current = new Set(prev[q.id] || []);
      if (current.has(option)) current.delete(option); else current.add(option);
      return { ...prev, [q.id]: [...current] };
    }
    return { ...prev, [q.id]: [option] };
  });

  const answerOf = (q) => {
    const chosen = [...(answers[q.id] || [])];
    const extra = String(custom[q.id] || '').trim();
    if (extra) chosen.push(extra);
    return chosen;
  };
  const ready = questions.every((q) => answerOf(q).length);

  const send = () => {
    if (!ready || sent) return;
    setSent(true);
    const text = questions.length === 1
      ? answerOf(questions[0]).join(', ')
      : questions.map((q) => `${q.question}\n→ ${answerOf(q).join(', ')}`).join('\n\n');
    onSend?.(text);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.cardButton }]}>
      {questions.map((q) => (
        <View key={q.id} style={styles.question}>
          <View style={styles.titleRow}>
            <QuestionMarkCircleIcon size={18} color={colors.accent} />
            <Text style={[styles.flex, { color: colors.textPrimary }, type(14, 'bold', 20)]}>{q.question}</Text>
          </View>
          {q.options.map((option) => {
            const on = (answers[q.id] || []).includes(option);
            return (
              <ElasticPressable key={option} shape="pill" disabled={sent} onPress={() => pick(q, option)} accessibilityRole={q.type === 'checkbox' ? 'checkbox' : 'radio'} accessibilityState={{ checked: on }} accessibilityLabel={option}>
                <View style={[styles.option, { backgroundColor: on ? colors.accent : colors.card, opacity: sent && !on ? 0.5 : 1 }]}>
                  <View style={[q.type === 'checkbox' ? styles.box : styles.radio, { borderColor: on ? colors.white : colors.textMuted }]}>
                    {on ? <CheckIcon size={12} color={colors.white} /> : null}
                  </View>
                  <Text style={[styles.flex, { color: on ? colors.white : colors.textPrimary }, type(13, 'semiBold', 18)]}>{option}</Text>
                </View>
              </ElasticPressable>
            );
          })}
          {(q.type === 'input' || q.allowCustom) && !sent ? (
            <TextInput
              value={custom[q.id] || ''}
              onChangeText={(v) => setCustom((prev) => ({ ...prev, [q.id]: v }))}
              placeholder={q.type === 'input' ? '' : t('askOther')}
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.accent}
              maxLength={300}
              onSubmitEditing={send}
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.card }, type(13, 'regular', 18)]}
            />
          ) : null}
        </View>
      ))}
      <ElasticPressable shape="pill" disabled={!ready || sent} onPress={send} accessibilityRole="button" accessibilityLabel={t('askSubmit')}>
        <View style={[styles.send, { backgroundColor: colors.accent, opacity: ready && !sent ? 1 : 0.5 }]}>
          <Text style={[{ color: colors.white }, type(13, 'bold', 18)]}>{sent ? t('askAnswered') : t('askSubmit')}</Text>
        </View>
      </ElasticPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.md, padding: 14, gap: 14, marginVertical: 4 },
  question: { gap: 8 },
  titleRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: Radius.md },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  box: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 42, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8 },
  send: { minHeight: 42, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
});
