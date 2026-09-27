/**
 * SimulatorsScreen.js
 * ---------------------------------------------------------------------
 * The student's simulators, grouped by course: for a university course,
 * the ones its lecture material calls for (matched against MoeAI's course
 * map, see src/simulators/catalog.js); for a student's own subject, its name.
 * Each tile says honestly whether MoeAI runs it or it is an outside tool.
 * A course added or renamed on Home shows up here as soon as it is saved.
 * Each simulator opens full screen in the same sandbox the chat's
 * interactive cards use.
 * ---------------------------------------------------------------------
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowTopRightOnSquareIcon, ChevronRightIcon, XMarkIcon } from 'react-native-heroicons/outline';
import ScreenContainer from '../components/ScreenContainer';
import Card from '../components/Card';
import ElasticPressable from '../components/ElasticPressable';
import SubjectIcon from '../components/SubjectIcon';
import SandboxFrame from '../chat/blocks/SandboxFrame';
import PhetFrame from '../chat/blocks/PhetFrame';
import { parsePhet, phetUrl } from '../simulators/phet';
import { colorWithAlpha } from '../constants/colors';
import { reportEvent } from '../ai/client';
import { blockDocument, themeFrom } from '../chat/blocks/document';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import { onStorageWrite, readStoredValue, storageKey } from '../storage/persistedStorage';
import { baseSubjects } from '../subjects/subjectExamples';
import { useAccount } from '../account/AccountContext';
import { LIBRARY, STARTER_IDS, simulatorsForSubjects } from '../simulators/catalog';

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
  const { orgCourses } = useAccount();
  return useMemo(() => [...baseSubjects(orgCourses), ...userSubjects], [orgCourses, userSubjects]);
}

const STATUS = {
  moeai: { label: 'Built into MoeAI', tone: 'accent' },
  external: { label: 'Not integrated with MoeAI', tone: 'muted' },
};

function StatusChip({ status }) {
  const { colors, type } = usePreferences();
  const s = STATUS[status] || STATUS.external;
  return (
    <View style={[styles.chip, { backgroundColor: s.tone === 'accent' ? colorWithAlpha(colors.accent, 0.18) : colors.card }]}>
      <Text style={[{ color: s.tone === 'accent' ? colors.textPrimary : colors.textMuted }, type(10, 'bold', 13)]}>{s.label}</Text>
    </View>
  );
}

function SimTile({ sim, onOpen }) {
  const { colors, type, isRTL } = usePreferences();
  return (
    <ElasticPressable shape="pill" onPress={() => onOpen(sim)} accessibilityRole="button" accessibilityLabel={`${sim.title}, ${STATUS[sim.status]?.label || ''}`}>
      <View style={[styles.tile, { backgroundColor: colors.cardButton, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.tileText}>
          <Text style={[{ color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(14, 'bold', 19)]} numberOfLines={1}>{sim.title}</Text>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}><StatusChip status={sim.status} /></View>
        </View>
        {sim.kind === 'link' ? <ArrowTopRightOnSquareIcon size={17} color={colors.textMuted} /> : <ChevronRightIcon size={18} color={colors.textMuted} style={isRTL ? { transform: [{ scaleX: -1 }] } : null} />}
      </View>
    </ElasticPressable>
  );
}

function SimulatorView({ sim, onClose }) {
  const { colors, effectiveTheme, type, language } = usePreferences();
  const external = sim.kind === 'phet' ? phetUrl(parsePhet(sim.code)?.sim, language) : sim.kind === 'frame' ? sim.url : null;
  const insets = useSafeAreaInsets();
  const frameId = useMemo(() => `moeai-sim-${sim.id}-${Date.now().toString(36)}`, [sim.id]);
  const html = useMemo(() => (external ? '' : blockDocument({
    id: frameId, kind: sim.kind, language: sim.language, code: sim.code, theme: themeFrom(colors, effectiveTheme !== 'light'), fullscreen: true,
  })), [colors, effectiveTheme, external, frameId, sim]);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.full, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.fullHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.tileText}>
            <Text style={[{ color: colors.textPrimary }, type(16, 'bold', 21)]} numberOfLines={1}>{sim.title}</Text>
            <View style={{ flexDirection: 'row' }}><StatusChip status={sim.status} /></View>
          </View>
          {external ? (
            <Pressable onPress={() => Linking.openURL(external).catch(() => {})} hitSlop={10} accessibilityRole="link" accessibilityLabel="Open in a new tab"
              style={[styles.close, { backgroundColor: colors.cardButton }]}><ArrowTopRightOnSquareIcon size={18} color={colors.textPrimary} /></Pressable>
          ) : null}
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close"
            style={[styles.close, { backgroundColor: colors.cardButton }]}><XMarkIcon size={20} color={colors.textPrimary} /></Pressable>
        </View>
        <View style={[styles.fullBody, { paddingBottom: insets.bottom }]}>
          {external
            ? <PhetFrame url={external} height="100%" title={sim.title} style={{ flex: 1 }} />
            : <SandboxFrame html={html} frameId={frameId} height="100%" onMessage={() => {}} title={sim.title} style={{ flex: 1 }} />}
        </View>
      </View>
    </Modal>
  );
}

export default function SimulatorsScreen() {
  const { colors, type, t, isRTL } = usePreferences();
  const courses = useCourseList();
  const groups = useMemo(() => simulatorsForSubjects(courses), [courses]);
  const starters = useMemo(() => LIBRARY.filter((sim) => STARTER_IDS.includes(sim.id)), []);
  const [open, setOpen] = useState(null);
  const openSim = useCallback((sim, subject) => {
    reportEvent('simulator', `Opened the ${sim.title} simulator${subject?.name ? ` (${subject.name})` : ''}`);
    if (sim.kind === 'link') { Linking.openURL(sim.url).catch(() => {}); return; }
    setOpen(sim);
  }, []);
  const align = { textAlign: isRTL ? 'right' : 'left' };
  const shown = groups.some((g) => g.sims.length) ? groups : [...groups, { subject: { id: 'starter', name: t('simulatorsStarter') }, sims: starters }];

  return (
    <ScreenContainer>
      <View style={styles.scroll}>
        {shown.map(({ subject, sims, pending }) => (
          <View key={subject.id || subject.name} style={styles.group}>
            <View style={[styles.groupHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {subject.id !== 'starter' ? <SubjectIcon name={subject.name} query={subject.iconQuery} color={colors.accent} size={22} /> : null}
              <Text style={[{ color: colors.textPrimary, flex: 1 }, align, type(14, 'bold', 19)]} numberOfLines={1}>{subject.name}</Text>
              {sims.length ? <Text style={[{ color: colors.textMuted }, type(11, 'semiBold', 15)]}>{sims.length}</Text> : null}
            </View>
            {pending ? (
              <Card><Text style={[{ color: colors.textMuted }, align, type(13, 'regular', 19)]}>No lecture material yet, so no simulators. They appear once your course staff upload lectures.</Text></Card>
            ) : (
              <View style={styles.tiles}>{sims.map((sim) => <SimTile key={sim.id} sim={sim} onOpen={(s) => openSim(s, subject)} />)}</View>
            )}
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
  tileText: { flex: 1, minWidth: 0, gap: 4 },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill },
  full: { flex: 1 },
  fullHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  fullBody: { flex: 1 },
});
