/** Home progress overview and dynamic two-column subject grid. */
import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { AcademicCapIcon, FolderIcon, PlusIcon } from 'react-native-heroicons/solid';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import { combinedSubjectStats, subjectStats } from '../subjects/subjectStore';
import Card from './Card';
import ElasticPressable from './ElasticPressable';
import ProgressRing from './ProgressRing';
import SubjectIcon from './SubjectIcon';

function AnimatedProgressBar({ progress, active }) {
  const { colors, motion } = usePreferences();
  const animated = useRef(new Animated.Value(0)).current;
  const wasActive = useRef(false);
  const safe = Math.max(0, Math.min(1, progress));
  useEffect(() => {
    if (!active) {
      wasActive.current = false;
      return undefined;
    }
    animated.stopAnimation();
    if (!wasActive.current) animated.setValue(0);
    wasActive.current = true;
    const animation = Animated.timing(animated, { toValue: safe, duration: motion ? 650 : 0, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [active, animated, motion, safe]);
  const width = animated.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return <View style={[styles.subjectTrack, { backgroundColor: colors.track }]}><Animated.View style={[styles.subjectFill, { backgroundColor: colors.accent, width }]} /></View>;
}

const SubjectCard = React.memo(function SubjectCard({ subject, active, onPress, onLongPress }) {
  const { colors, type, isRTL } = usePreferences();
  const cardRef = useRef(null);
  const stats = subjectStats(subject);
  const handleLongPress = useCallback(() => {
    if (subject.owner !== 'user') return;
    cardRef.current?.measureInWindow((x, y, width, height) => onLongPress(subject, { x, y, width, height, screenWidth: Dimensions.get('window').width }));
  }, [onLongPress, subject]);
  return (
    <View ref={cardRef} collapsable={false} style={styles.subjectSlot}>
      <ElasticPressable shape="pill" style={styles.subjectPressable} pressableStyle={styles.subjectHit} onPress={() => onPress(subject)} onLongPress={handleLongPress} delayLongPress={330} accessibilityRole="button">
        <View style={[styles.subjectCard, { backgroundColor: colors.card }]}>
          <View style={[styles.subjectTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text numberOfLines={2} style={[styles.subjectName, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(14, 'bold', 18)]}>{subject.name}</Text>
            <SubjectIcon name={subject.name} query={subject.iconQuery} color={colors.textPrimary} size={31} />
          </View>
          <View style={[styles.subjectBottom, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <AnimatedProgressBar progress={stats.progress} active={active} />
            <Text style={[styles.subjectPercent, { color: colors.textPrimary }, type(12, 'bold', 16)]}>{Math.round(stats.progress * 100)}%</Text>
          </View>
        </View>
      </ElasticPressable>
    </View>
  );
});

export default function SubjectDashboard({ subjects, active, onOpenSubject, onCreateSubject, onLongPressSubject }) {
  const { colors, type, t, isRTL } = usePreferences();
  const totals = combinedSubjectStats(subjects);
  const actionDirection = { flexDirection: isRTL ? 'row-reverse' : 'row' };
  return (
    <>
      <Card style={styles.progressCard}>
        <Text style={[styles.progressLabel, { color: colors.textMuted }, type(12, 'bold', 16)]}>{t('totalProgress')}</Text>
        <ProgressRing completed={totals.completed} total={totals.total} active={active} />
        <View style={[styles.quickActions, actionDirection]}>
          <ElasticPressable shape="pill" style={styles.quickAction} pressableStyle={styles.quickActionHit} accessibilityRole="button">
            <View style={[styles.quickActionInner, actionDirection, { backgroundColor: colors.cardButton }]}><FolderIcon size={19} color={colors.accent} /><Text numberOfLines={1} adjustsFontSizeToFit style={[{ color: colors.accent }, type(13, 'bold', 17)]}>{t('assignments')}</Text></View>
          </ElasticPressable>
          <ElasticPressable shape="pill" style={styles.quickAction} pressableStyle={styles.quickActionHit} accessibilityRole="button">
            <View style={[styles.quickActionInner, actionDirection, { backgroundColor: colors.cardButton }]}><AcademicCapIcon size={20} color={colors.accent} /><Text numberOfLines={1} adjustsFontSizeToFit style={[{ color: colors.accent }, type(13, 'bold', 17)]}>{t('quizzes')}</Text></View>
          </ElasticPressable>
        </View>
      </Card>
      <View style={[styles.subjectGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {subjects.map((subject) => <SubjectCard key={subject.id} subject={subject} active={active} onPress={onOpenSubject} onLongPress={onLongPressSubject} />)}
        <View style={styles.subjectSlot}>
          <ElasticPressable shape="pill" style={styles.createPressable} pressableStyle={styles.createHit} onPress={onCreateSubject} accessibilityRole="button" accessibilityLabel={t('createSubject')}>
            <View style={[styles.createCard, { borderColor: colors.track }]}>
              <View style={[styles.createCircle, { backgroundColor: colors.card }]}><PlusIcon size={25} color={colors.background} /></View>
            </View>
          </ElasticPressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  progressCard: { alignItems: 'center', paddingTop: Spacing.lg },
  progressLabel: { textAlign: 'center', marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.7 },
  quickActions: { width: '100%', gap: Spacing.sm, marginTop: Spacing.lg },
  quickAction: { flex: 1 },
  quickActionHit: { borderRadius: Radius.pill },
  quickActionInner: { minHeight: 46, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: Spacing.sm },
  subjectGrid: { flexWrap: 'wrap', justifyContent: 'space-between', columnGap: Spacing.sm },
  subjectSlot: { width: '48.5%', marginBottom: Spacing.md },
  subjectPressable: { flex: 1 },
  subjectHit: { borderRadius: Radius.md },
  subjectCard: { minHeight: 92, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 10, justifyContent: 'flex-start' },
  subjectTop: { alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.sm },
  subjectName: { flex: 1 },
  subjectBottom: { alignItems: 'center', gap: Spacing.sm, marginTop: 8 },
  subjectTrack: { flex: 1, height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  subjectFill: { height: '100%', borderRadius: Radius.pill },
  subjectPercent: { minWidth: 34, textAlign: 'right' },
  createPressable: { flex: 1 },
  createHit: { borderRadius: Radius.md },
  createCard: { minHeight: 92, borderRadius: Radius.md, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  createCircle: { width: 48, height: 48, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
