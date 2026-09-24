/**
 * SimulatorsScreen.js
 * ---------------------------------------------------------------------
 * The student's simulators: only the ones that belong to the courses on
 * their Home tab (src/simulators/catalog.js decides), grouped by course.
 * A course added or renamed on Home shows up here as soon as it is saved.
 * Each simulator opens full screen in the same sandbox the chat's
 * interactive cards use.
 * ---------------------------------------------------------------------
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRightIcon, XMarkIcon } from 'react-native-heroicons/outline';
import ScreenContainer from '../components/ScreenContainer';
import Card from '../components/Card';
import ElasticPressable from '../components/ElasticPressable';
import SubjectIcon from '../components/SubjectIcon';
import SandboxFrame from '../chat/blocks/SandboxFrame';
import { blockDocument, themeFrom } from '../chat/blocks/document';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import { onStorageWrite, readStoredValue, storageKey } from '../storage/persistedStorage';
import { SUBJECT_EXAMPLES } from '../subjects/subjectExamples';
import { SIMULATORS, STARTER_IDS, simulatorsForSubjects } from '../simulators/catalog';

const SUBJECTS_KEY = storageKey('user-subjects-v1');

/** The course list the Home tab shows, kept current as Home saves it. */
function useCourseList() {
  const [userSubjects, setUserSubjects] = useState([]);
  useEffect(() => {
    let alive = true;
    const apply = (raw) => {
      try { const parsed = JSON.parse(raw || '[]'); if (alive && Array.isArray(parsed)) setUserSubjects(parsed.filter((s) => s?.name)); } catch (_) {}
    };
    readStoredValue(SUBJECTS_KEY).then(apply).catch(() => {});
    const unsubscribe = onStorageWrite((key, value) => { if (key === SUBJECTS_KEY) apply(value); });
    return () => { alive = false; unsubscribe(); };
  }, []);
  return useMemo(() => [...SUBJECT_EXAMPLES, ...userSubjects], [userSubjects]);
}

function SimTile({ sim, onOpen }) {
  const { colors, type, isRTL } = usePreferences();
  return (
    <ElasticPressable shape="pill" onPress={() => onOpen(sim)} accessibilityRole="button" accessibilityLabel={sim.title}>
      <View style={[styles.tile, { backgroundColor: colors.cardButton, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.tileText}>
          <Text style={[{ color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(14, 'bold', 19)]} numberOfLines={1}>{sim.title}</Text>
          <Text style={[{ color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }, type(12, 'regular', 16)]} numberOfLines={2}>{sim.blurb}</Text>
        </View>
        <ChevronRightIcon size={18} color={colors.textMuted} style={isRTL ? { transform: [{ scaleX: -1 }] } : null} />
      </View>
    </ElasticPressable>
  );
}

function SimulatorView({ sim, onClose }) {
  const { colors, effectiveTheme, type } = usePreferences();
  const insets = useSafeAreaInsets();
  const frameId = useMemo(() => `moeai-sim-${sim.id}-${Date.now().toString(36)}`, [sim.id]);
  const html = useMemo(() => blockDocument({
    id: frameId, kind: sim.kind, language: sim.language, code: sim.code, theme: themeFrom(colors, effectiveTheme !== 'light'), fullscreen: true,
  }), [colors, effectiveTheme, frameId, sim]);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.full, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.fullHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.tileText}>
            <Text style={[{ color: colors.textPrimary }, type(16, 'bold', 21)]} numberOfLines={1}>{sim.title}</Text>
            <Text style={[{ color: colors.textMuted }, type(11, 'regular', 15)]} numberOfLines={1}>{sim.blurb}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close"
            style={[styles.close, { backgroundColor: colors.cardButton }]}><XMarkIcon size={20} color={colors.textPrimary} /></Pressable>
        </View>
        <View style={[styles.fullBody, { paddingBottom: insets.bottom }]}>
          <SandboxFrame html={html} frameId={frameId} height="100%" onMessage={() => {}} title={sim.title} style={{ flex: 1 }} />
        </View>
      </View>
    </Modal>
  );
}

export default function SimulatorsScreen() {
  const { colors, type, t, isRTL } = usePreferences();
  const courses = useCourseList();
  const groups = useMemo(() => simulatorsForSubjects(courses), [courses]);
  const starters = useMemo(() => SIMULATORS.filter((sim) => STARTER_IDS.includes(sim.id)), []);
  const [open, setOpen] = useState(null);
  const openSim = useCallback((sim) => setOpen(sim), []);
  const align = { textAlign: isRTL ? 'right' : 'left' };

  return (
    <ScreenContainer>
      <View style={styles.scroll}>
        <Card>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }, align, type(16, 'bold')]}>{t('availableSimulators')}</Text>
          <Text style={[{ color: colors.textSecondary }, align, type(13, 'regular', 19)]}>{groups.length ? t('simulatorsForYou') : t('simulatorsEmpty')}</Text>
        </Card>
        {(groups.length ? groups : [{ subject: { id: 'starter', name: t('simulatorsStarter') }, sims: starters }]).map(({ subject, sims }) => (
          <View key={subject.id || subject.name} style={styles.group}>
            <View style={[styles.groupHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {subject.id !== 'starter' ? <SubjectIcon name={subject.name} query={subject.iconQuery} color={colors.accent} size={22} /> : null}
              <Text style={[{ color: colors.textPrimary, flex: 1 }, align, type(14, 'bold', 19)]} numberOfLines={1}>{subject.name}</Text>
              <Text style={[{ color: colors.textMuted }, type(11, 'semiBold', 15)]}>{sims.length}</Text>
            </View>
            <View style={styles.tiles}>{sims.map((sim) => <SimTile key={sim.id} sim={sim} onOpen={openSim} />)}</View>
          </View>
        ))}
      </View>
      {open ? <SimulatorView sim={open} onClose={() => setOpen(null)} /> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: Spacing.md },
  cardTitle: { marginBottom: 4 },
  group: { gap: Spacing.sm },
  groupHeader: { alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  tiles: { gap: 8 },
  tile: { alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: Radius.md },
  tileText: { flex: 1, minWidth: 0, gap: 2 },
  full: { flex: 1 },
  fullHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  fullBody: { flex: 1 },
});
