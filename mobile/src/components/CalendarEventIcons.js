/** Compact, overlapping Heroicons Mini markers shared by both calendars. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AcademicCapIcon,
  CakeIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  DocumentCheckIcon,
  StarIcon,
} from 'react-native-heroicons/mini';
import { CalendarKind } from '../calendar/calendarModel';
import { Calendar } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';

export const CALENDAR_KIND_ICONS = {
  [CalendarKind.ASSIGNMENT_UPLOADED]: DocumentArrowDownIcon,
  [CalendarKind.ASSIGNMENT_SUBMITTED]: DocumentCheckIcon,
  [CalendarKind.ASSIGNMENT_DUE]: DocumentArrowUpIcon,
  [CalendarKind.EXAM]: AcademicCapIcon,
  [CalendarKind.EVENT]: StarIcon,
  [CalendarKind.BIRTHDAY]: CakeIcon,
};

function CalendarEventIcons({ kinds, size = Calendar.MARKER_SIZE, maxWidth, surfaceColor, accentColor }) {
  const { colors } = usePreferences();
  if (!kinds?.length) return <View style={{ height: size }} />;
  const markerSize = maxWidth ? Math.min(size, Math.floor(maxWidth / (1 + Math.max(0, kinds.length - 1) * 0.55))) : size;
  const step = Math.round(markerSize * 0.55);
  const circleSize = Math.max(8, markerSize - 1);
  const backgroundColor = surfaceColor || colors.cardButton;
  const color = accentColor || colors.accent;
  return (
    <View style={[styles.row, { width: markerSize + Math.max(0, kinds.length - 1) * step, height: markerSize }]}> 
      {kinds.map((kind, index) => {
        const Icon = CALENDAR_KIND_ICONS[kind];
        if (!Icon) return null;
        return (
          <View
            key={`${kind}-${index}`}
            style={[styles.marker, { width: circleSize, height: circleSize, borderRadius: circleSize / 2, left: index * step, top: (markerSize - circleSize) / 2, backgroundColor, borderColor: colors.border, zIndex: index }]}
          >
            <Icon size={Math.max(6, Math.round(circleSize * 0.72))} color={color} />
          </View>
        );
      })}
    </View>
  );
}

export default React.memo(CalendarEventIcons);

const styles = StyleSheet.create({
  row: { position: 'relative', alignSelf: 'center' },
  marker: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
});
