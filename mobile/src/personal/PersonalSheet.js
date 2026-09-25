/**
 * What MoeAI remembers, the skills the student switched on, and how they
 * asked MoeAI to work, all in one sheet. Everything here is the student's:
 * they can read, pin, edit and delete every memory MoeAI wrote.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { PencilIcon, PlusIcon, SparklesIcon, TrashIcon } from 'react-native-heroicons/outline';
import ElasticPressable from '../components/ElasticPressable';
import SwipeableBottomSheet from '../components/SwipeableBottomSheet';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import { SKILL_TEMPLATES, usePersonal } from './PersonalContext';

const TABS = ['memory', 'skills', 'instructions'];
const pretty = (key) => String(key || '').replace(/_/g, ' ');

function Field({ value, onChangeText, placeholder, multiline, maxLength }) {
  const { colors, type, isRTL } = usePreferences();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      multiline={multiline}
      maxLength={maxLength}
      selectionColor={colors.accent}
      style={[styles.input, multiline && styles.multiline, { color: colors.textPrimary, backgroundColor: colors.cardButton, textAlign: isRTL ? 'right' : 'left' }, type(14, 'regular', 20)]}
    />
  );
}

function Button({ label, onPress, busy, ghost, disabled, Icon, small }) {
  const { colors, type } = usePreferences();
  const fg = ghost ? colors.textPrimary : colors.white;
  return (
    <ElasticPressable shape="pill" onPress={onPress} disabled={busy || disabled} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[styles.button, small && styles.buttonSmall, { backgroundColor: ghost ? colors.cardButton : colors.accent, opacity: disabled ? 0.5 : 1 }]}>
        {busy ? <ActivityIndicator color={fg} /> : (
          <>
            {Icon ? <Icon size={16} color={fg} /> : null}
            <Text style={[{ color: fg }, type(small ? 12 : 14, 'bold', 18)]}>{label}</Text>
          </>
        )}
      </View>
    </ElasticPressable>
  );
}

function IconButton({ Icon, label, onPress, danger }) {
  const { colors } = usePreferences();
  return (
    <ElasticPressable shape="circle" onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[styles.iconButton, { backgroundColor: colors.cardButton }]}><Icon size={16} color={danger ? colors.danger : colors.textSecondary} /></View>
    </ElasticPressable>
  );
}

function Chip({ label, active, onPress }) {
  const { colors, type } = usePreferences();
  return (
    <ElasticPressable shape="pill" onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={label}>
      <View style={[styles.chip, { backgroundColor: active ? colors.accent : colors.cardButton }]}>
        <Text style={[{ color: active ? colors.white : colors.textSecondary }, type(12, 'bold', 16)]}>{label}</Text>
      </View>
    </ElasticPressable>
  );
}

function MemoryTab({ run }) {
  const { colors, type, t } = usePreferences();
  const { memories, saveMemory, deleteMemory, clearMemory, signedIn } = usePersonal();
  const [editing, setEditing] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const always = memories.filter((m) => m.importance === 'always');
  const called = memories.filter((m) => m.importance !== 'always');

  if (editing) {
    return (
      <View style={styles.body}>
        <Field value={editing.key} onChangeText={(key) => setEditing({ ...editing, key })} placeholder={t('memoryTopic')} maxLength={60} />
        <Field value={editing.value} onChangeText={(value) => setEditing({ ...editing, value })} placeholder={t('memoryValue')} multiline maxLength={300} />
        <View style={styles.row}>
          <Chip label={t('memoryAlways')} active={editing.importance === 'always'} onPress={() => setEditing({ ...editing, importance: 'always' })} />
          <Chip label={t('memoryCalled')} active={editing.importance !== 'always'} onPress={() => setEditing({ ...editing, importance: 'called' })} />
        </View>
        <Text style={[{ color: colors.textMuted }, type(12, 'regular', 16)]}>{editing.importance === 'always' ? t('memoryAlwaysHint') : t('memoryCalledHint')}</Text>
        <View style={styles.row}>
          <View style={styles.flex}><Button ghost label={t('cancel')} onPress={() => setEditing(null)} /></View>
          <View style={styles.flex}><Button label={t('save')} disabled={!editing.key.trim() || !editing.value.trim()} onPress={() => run(() => saveMemory(editing)).then((ok) => ok && setEditing(null))} /></View>
        </View>
      </View>
    );
  }

  const item = (m) => (
    <View key={m.id || m.key} style={[styles.card, { backgroundColor: colors.cardButton }]}>
      <View style={styles.flex}>
        <Text style={[{ color: colors.textPrimary }, type(13, 'bold', 18)]} numberOfLines={1}>{pretty(m.key)}</Text>
        <Text style={[{ color: colors.textSecondary }, type(13, 'regular', 18)]}>{m.value}</Text>
        {m.source === 'tutor' ? <Text style={[{ color: colors.accent }, type(11, 'semiBold', 14)]}>{t('memoryByMoeAI')}</Text> : null}
      </View>
      <IconButton Icon={PencilIcon} label={t('edit')} onPress={() => setEditing({ ...m })} />
      <IconButton Icon={TrashIcon} label={t('delete')} danger onPress={() => run(() => deleteMemory(m.id))} />
    </View>
  );

  return (
    <View style={styles.body}>
      <Text style={[{ color: colors.textSecondary }, type(13, 'regular', 18)]}>{t('memoryExplain')}</Text>
      {!signedIn ? <Text style={[{ color: colors.textMuted }, type(12, 'regular', 16)]}>{t('memoryGuest')}</Text> : null}
      {!memories.length ? (
        <View style={[styles.empty, { backgroundColor: colors.cardButton }]}>
          <Text style={[{ color: colors.textMuted, textAlign: 'center' }, type(13, 'regular', 18)]}>{t('memoryEmpty')}</Text>
        </View>
      ) : null}
      {always.length ? <Text style={[styles.section, { color: colors.textPrimary }, type(13, 'bold', 18)]}>{t('memoryAlwaysTitle')}</Text> : null}
      {always.map(item)}
      {called.length ? <Text style={[styles.section, { color: colors.textPrimary }, type(13, 'bold', 18)]}>{t('memoryCalledTitle')}</Text> : null}
      {called.map(item)}
      <Button ghost Icon={PlusIcon} label={t('memoryAdd')} onPress={() => setEditing({ key: '', value: '', importance: 'always' })} />
      {memories.length ? (
        confirmClear ? (
          <View style={styles.row}>
            <View style={styles.flex}><Button ghost label={t('cancel')} onPress={() => setConfirmClear(false)} /></View>
            <View style={styles.flex}><Button label={t('memoryClearConfirm')} onPress={() => run(clearMemory).then(() => setConfirmClear(false))} /></View>
          </View>
        ) : <Button ghost label={t('memoryClear')} onPress={() => setConfirmClear(true)} />
      ) : null}
    </View>
  );
}

function SkillsTab({ run }) {
  const { colors, type, t } = usePreferences();
  const { skills, saveSkill, deleteSkill, draftSkill } = usePersonal();
  const [editing, setEditing] = useState(null);
  const [goal, setGoal] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState(null);
  const owned = new Set(skills.map((k) => k.name.toLowerCase()));

  const draft = async () => {
    setDrafting(true);
    setDraftError(null);
    try {
      const result = await draftSkill(goal.trim());
      setEditing({ name: result.name, content: result.content, enabled: true });
      setGoal('');
    } catch (error) {
      setDraftError(error?.message || t('accountError'));
    } finally {
      setDrafting(false);
    }
  };

  if (editing) {
    return (
      <View style={styles.body}>
        <Field value={editing.name} onChangeText={(name) => setEditing({ ...editing, name })} placeholder={t('skillName')} maxLength={60} />
        <Field value={editing.content} onChangeText={(content) => setEditing({ ...editing, content })} placeholder={t('skillRules')} multiline maxLength={4000} />
        <View style={styles.row}>
          <View style={styles.flex}><Button ghost label={t('cancel')} onPress={() => setEditing(null)} /></View>
          <View style={styles.flex}><Button label={t('save')} disabled={editing.name.trim().length < 2 || editing.content.trim().length < 4} onPress={() => run(() => saveSkill(editing)).then((ok) => ok && setEditing(null))} /></View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <Text style={[{ color: colors.textSecondary }, type(13, 'regular', 18)]}>{t('skillsExplain')}</Text>
      {skills.map((k) => (
        <View key={k.id || k.name} style={[styles.card, { backgroundColor: colors.cardButton }]}>
          <View style={styles.flex}>
            <Text style={[{ color: colors.textPrimary }, type(13, 'bold', 18)]} numberOfLines={1}>{k.name}</Text>
            <Text style={[{ color: colors.textSecondary }, type(12, 'regular', 17)]} numberOfLines={3}>{k.content}</Text>
          </View>
          <Switch value={k.enabled !== false} onValueChange={(enabled) => run(() => saveSkill({ ...k, enabled }))} trackColor={{ true: colors.accent, false: colors.track }} thumbColor={colors.white} accessibilityLabel={k.name} />
          <IconButton Icon={PencilIcon} label={t('edit')} onPress={() => setEditing({ ...k })} />
          <IconButton Icon={TrashIcon} label={t('delete')} danger onPress={() => run(() => deleteSkill(k.id))} />
        </View>
      ))}

      <Text style={[styles.section, { color: colors.textPrimary }, type(13, 'bold', 18)]}>{t('skillBuilder')}</Text>
      <Field value={goal} onChangeText={setGoal} placeholder={t('skillBuilderHint')} multiline maxLength={500} />
      {draftError ? <Text style={[{ color: colors.danger }, type(12, 'semiBold', 16)]}>{draftError}</Text> : null}
      <View style={styles.row}>
        <View style={styles.flex}><Button Icon={SparklesIcon} label={t('skillDraft')} busy={drafting} disabled={goal.trim().length < 6} onPress={draft} /></View>
        <View style={styles.flex}><Button ghost Icon={PlusIcon} label={t('skillWrite')} onPress={() => setEditing({ name: '', content: '', enabled: true })} /></View>
      </View>

      <Text style={[styles.section, { color: colors.textPrimary }, type(13, 'bold', 18)]}>{t('skillTemplates')}</Text>
      <View style={styles.wrap}>
        {SKILL_TEMPLATES.filter((tpl) => !owned.has(tpl.name.toLowerCase())).map((tpl) => (
          <Button key={tpl.name} small ghost Icon={PlusIcon} label={tpl.name} onPress={() => run(() => saveSkill({ ...tpl, enabled: true, source: 'template' }))} />
        ))}
      </View>
    </View>
  );
}

function InstructionsTab({ run }) {
  const { colors, type, t } = usePreferences();
  const { instructions, saveInstructions } = usePersonal();
  const [text, setText] = useState(instructions);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setText(instructions); }, [instructions]);
  return (
    <View style={styles.body}>
      <Text style={[{ color: colors.textSecondary }, type(13, 'regular', 18)]}>{t('instructionsExplain')}</Text>
      <Field value={text} onChangeText={(v) => { setText(v); setSaved(false); }} placeholder={t('instructionsHint')} multiline maxLength={1500} />
      <Text style={[{ color: colors.textMuted, textAlign: 'right' }, type(11, 'regular', 14)]}>{text.length}/1500</Text>
      <Button label={saved ? t('saved') : t('save')} disabled={text === instructions} onPress={() => run(() => saveInstructions(text)).then((ok) => ok && setSaved(true))} />
    </View>
  );
}

export default function PersonalSheet() {
  const { colors, type, t } = usePreferences();
  const { panel, openPanel, closePanel } = usePersonal();
  const [error, setError] = useState(null);
  useEffect(() => { setError(null); }, [panel]);

  /** Runs a change and reports failure in the sheet; resolves to whether it worked. */
  const run = async (action) => {
    setError(null);
    try { await action(); return true; } catch (e) { setError(e?.message || t('accountError')); return false; }
  };

  const tab = TABS.includes(panel) ? panel : 'memory';
  return (
    <SwipeableBottomSheet visible={Boolean(panel)} title={t('personalTitle')} onClose={closePanel}>
      <View style={styles.tabs}>
        {TABS.map((id) => <Chip key={id} label={t(`personal_${id}`)} active={tab === id} onPress={() => openPanel(id)} />)}
      </View>
      {error ? <Text style={[{ color: colors.danger }, type(12, 'semiBold', 16)]}>{error}</Text> : null}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {tab === 'memory' ? <MemoryTab run={run} /> : tab === 'skills' ? <SkillsTab run={run} /> : <InstructionsTab run={run} />}
      </ScrollView>
    </SwipeableBottomSheet>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: Spacing.xs || 6, paddingTop: Spacing.sm, flexWrap: 'wrap' },
  scroll: { maxHeight: 520 },
  scrollContent: { paddingBottom: Spacing.md },
  body: { gap: Spacing.sm, paddingTop: Spacing.sm },
  section: { marginTop: Spacing.sm },
  input: { minHeight: 46, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10 },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  button: { minHeight: 46, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, flexDirection: 'row', gap: 6 },
  buttonSmall: { minHeight: 34, paddingHorizontal: 12 },
  iconButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill },
  card: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: Radius.md },
  empty: { borderRadius: Radius.md, padding: 16 },
  row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  flex: { flex: 1, minWidth: 0 },
});
