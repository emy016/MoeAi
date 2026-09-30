/**
 * Assignments or Quizzes from Home: what the course staff put on the
 * calendar, soonest first, with the time left. Tapping one opens its course.
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import SwipeableBottomSheet from './SwipeableBottomSheet';
import ElasticPressable from './ElasticPressable';
import { colorWithAlpha } from '../constants/colors';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import { courseLabel, kindLabel } from '../calendar/courseEvents';

function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return 'done';
  const h = ms / 3600000;
  if (h < 1) return `${Math.max(1, Math.round(ms / 60000))} min left`;
  if (h < 48) return `${Math.round(h)} h left`;
  return `${Math.round(h / 24)} days left`;
}

export default function CourseDeadlinesSheet({ visible, title, emptyText, occurrences, kinds, onClose, onOpenCourse }) {
  const { colors, type, isRTL } = usePreferences();
  const now = Date.now();
  const items = useMemo(() => (occurrences || [])
    .filter((o) => kinds.includes(o.kind) && new Date(o.end || o.at).getTime() > now - 6 * 3600000)
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(0, 40), [occurrences, kinds, now]);
  const align = { textAlign: isRTL ? 'right' : 'left' };
  return (
    <SwipeableBottomSheet visible={visible} title={title} onClose={onClose}>
      <View style={styles.list}>
        {!items.length ? <Text style={[{ color: colors.textMuted }, align, type(13, 'regular', 19)]}>{emptyText}</Text> : null}
        {items.map((o) => {
          const urgent = new Date(o.at).getTime() - now < 48 * 3600000;
          const d = new Date(o.at);
          return (
            <ElasticPressable key={`${o.id}-${o.occurrence}`} shape="pill" onPress={() => onOpenCourse?.(o.course_id)} accessibilityRole="button">
              <View style={[styles.row, { backgroundColor: colors.cardButton, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.date, { backgroundColor: urgent ? colorWithAlpha(colors.danger, 0.18) : colors.card }]}>
                  <Text style={[{ color: urgent ? colors.danger : colors.accent }, type(10.5, 'bold', 13)]}>{d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</Text>
                  <Text style={[{ color: colors.textPrimary }, type(18, 'bold', 22)]}>{d.getDate()}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text numberOfLines={2} style={[{ color: colors.textPrimary }, align, type(14, 'bold', 19)]}>{o.title}</Text>
                  <Text numberOfLines={1} style={[{ color: colors.textMuted }, align, type(12, 'semiBold', 16)]}>{[kindLabel(o.kind), courseLabel(o), o.all_day ? null : d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }), o.location].filter(Boolean).join(' · ')}</Text>
                  {o.details ? <Text numberOfLines={2} style={[{ color: colors.textSecondary }, align, type(12, 'regular', 17)]}>{o.details}</Text> : null}
                </View>
                <Text style={[{ color: urgent ? colors.danger : colors.textSecondary }, type(11.5, 'bold', 15)]}>{timeLeft(o.at)}</Text>
              </View>
            </ElasticPressable>
          );
        })}
      </View>
    </SwipeableBottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.sm, paddingBottom: Spacing.md },
  row: { alignItems: 'center', gap: 12, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10 },
  date: { width: 48, borderRadius: 12, alignItems: 'center', paddingVertical: 5 },
});
