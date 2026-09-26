/**
 * The first thing a university student sees on Home: which MoeAI they are
 * on. "MoeAI · Computer Science" is the tutor their faculty set up,
 * answering from these courses' own lectures and citing the page; each
 * course opens straight to its lectures.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckBadgeIcon } from 'react-native-heroicons/solid';
import ElasticPressable from './ElasticPressable';
import SubjectIcon from './SubjectIcon';
import { Radius, Spacing } from '../constants/layout';
import { colorWithAlpha } from '../constants/colors';
import { usePreferences } from '../context/AppPreferences';
import { modelLabel, useAccount } from '../account/AccountContext';

export default function ModelBanner({ subjects, onOpenSubject }) {
  const { colors, type, t, isRTL } = usePreferences();
  const { account, orgCourses } = useAccount();
  const label = modelLabel(account);
  const courses = useMemo(() => subjects.filter((s) => s.orgCourseId), [subjects]);
  const lectures = useMemo(() => courses.reduce((n, s) => n + s.lectures.length, 0), [courses]);
  if (!label || !orgCourses.length) return null;
  const align = { textAlign: isRTL ? 'right' : 'left' };
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]} accessibilityRole="summary">
      <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.mark, { backgroundColor: colorWithAlpha(colors.accent, 0.16) }]}><CheckBadgeIcon size={22} color={colors.accent} /></View>
        <View style={styles.text}>
          <Text style={[{ color: colors.textMuted }, align, type(10, 'bold', 13)]}>{t('youAreOn')}</Text>
          <Text numberOfLines={2} style={[{ color: colors.textPrimary }, align, type(17, 'bold', 22)]}>{label}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colorWithAlpha(colors.accent, 0.16) }]}><Text style={[{ color: colors.accent }, type(10, 'bold', 13)]}>{t('ragBadge')}</Text></View>
      </View>
      <Text style={[{ color: colors.textSecondary, marginTop: 8 }, align, type(13, 'regular', 19)]}>
        {t('modelPitch').replace('{courses}', String(courses.length)).replace('{lectures}', String(lectures))}
      </Text>
      <View style={[styles.chips, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {courses.map((subject) => (
          <ElasticPressable key={subject.id} shape="pill" onPress={() => onOpenSubject(subject)} accessibilityRole="button" accessibilityLabel={subject.name}>
            <View style={[styles.chip, { backgroundColor: colors.cardButton, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <SubjectIcon name={subject.name} query={subject.iconQuery} color={colors.accent} size={16} />
              <Text numberOfLines={1} style={[{ color: colors.textPrimary }, type(12, 'bold', 16)]}>{subject.name}</Text>
              <Text style={[{ color: colors.textMuted }, type(11, 'semiBold', 15)]}>{subject.lectures.length}</Text>
            </View>
          </ElasticPressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  row: { alignItems: 'center', gap: 10 },
  mark: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.pill },
  chips: { flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 8, borderRadius: Radius.pill, maxWidth: '100%' },
});
