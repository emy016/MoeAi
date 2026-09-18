/** Fast, continuous, animated multi-day timeline cover modal. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { PlusIcon, XMarkIcon } from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  addDays,
  clippedMinutes,
  formatTime,
  formatNumericDate,
  formatWeekday,
  layoutTimedObjects,
  markerKindsForObjectOnDay,
  minutesIntoDay,
  sameDay,
  splitDayObjects,
  startOfDay,
} from '../calendar/calendarModel';
import { Calendar, Radius, Spacing } from '../constants/layout';
import { brightenColor, colorWithAlpha } from '../constants/colors';
import { usePreferences } from '../context/AppPreferences';
import CalendarEventIcons from './CalendarEventIcons';
import ElasticPressable from './ElasticPressable';
import EventTooltipModal from './EventTooltipModal';

const DAY_HEIGHT = Calendar.HOUR_HEIGHT * 24;
const DAYS_EACH_SIDE = Calendar.TIMELINE_DAYS_EACH_SIDE;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const TIMELINE_CONTENT_STYLE = { paddingBottom: Calendar.ALL_DAY_DOCK_HEIGHT };

function objectTimeLabel(object, day, language, allDayLabel) {
  if (object.allDay) return allDayLabel;
  if (object.point) return formatTime(object.start, language);
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const visibleStart = new Date(Math.max(new Date(object.start).getTime(), dayStart.getTime()));
  const visibleEnd = new Date(Math.min(new Date(object.end).getTime(), dayEnd.getTime()));
  return `${formatTime(visibleStart, language)} – ${formatTime(visibleEnd, language)}`;
}

const TimelineDay = React.memo(function TimelineDay({ day, objects, eventAreaWidth, onOpen, onDelete, colors, type, t, language, fontScale, now, nowLabelColor }) {
  const dayObjects = splitDayObjects(objects, day);
  const { deadlines } = dayObjects;
  const timed = layoutTimedObjects(objects, day, (Calendar.MIN_EVENT_HEIGHT / Calendar.HOUR_HEIGHT) * 60, dayObjects);
  const isCurrentDay = sameDay(day, now);
  const nowMinute = isCurrentDay ? minutesIntoDay(now) : -1;
  const ongoingEventColor = brightenColor(colors.accent, 0.25);
  const deadlineGroups = Object.values(deadlines.reduce((groups, object) => {
    const key = new Date(object.start).getTime();
    if (!groups[key]) groups[key] = [];
    groups[key].push(object);
    return groups;
  }, {}));

  return (
    <View style={[styles.day, { height: DAY_HEIGHT, backgroundColor: colors.background }]}> 
      {HOURS.map((hour) => (
        <View key={hour} style={[styles.hourRow, { top: hour * Calendar.HOUR_HEIGHT, height: Calendar.HOUR_HEIGHT, borderTopColor: colors.border }]}> 
          <Text style={[styles.hourLabel, { color: colors.textMuted }, type(11, 'regular', 14)]}>{formatTime(new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour), language)}</Text>
        </View>
      ))}
      {timed.map(({ object, startMinute, endMinute, column, columns }) => {
        const gap = 4;
        const columnWidth = (eventAreaWidth - gap * Math.max(0, columns - 1)) / columns;
        const top = (startMinute / 60) * Calendar.HOUR_HEIGHT;
        const height = Math.max(Calendar.MIN_EVENT_HEIGHT, ((endMinute - startMinute) / 60) * Calendar.HOUR_HEIGHT);
        const ongoing = isCurrentDay && nowMinute >= startMinute && nowMinute < endMinute;
        return (
          <Pressable
            key={object.id}
            onPress={() => onOpen(object, day)}
            accessibilityRole="button"
            accessibilityLabel={object.title}
            style={[styles.eventBlock, { top, height, left: Calendar.TIME_GUTTER + column * (columnWidth + gap), width: columnWidth, backgroundColor: ongoing ? ongoingEventColor : colors.accent }]}
          >
            <Text numberOfLines={2} style={[object.userCreated && styles.userEventText, { color: colors.white }, type(12, 'bold', 14)]}>{object.title}</Text>
            {height >= 48 && <Text numberOfLines={1} style={[styles.eventTime, { color: colors.white }, type(10, 'regular', 12)]}>{objectTimeLabel(object, day, language, t('allDay'))}</Text>}
            {object.userCreated && <ElasticPressable shape="circle" style={styles.eventDelete} onPress={(event) => { event.stopPropagation?.(); onDelete?.(object); }} accessibilityRole="button" accessibilityLabel={t('deleteEvent')}><View style={[styles.eventDeleteCircle, { backgroundColor: colors.background }]}><XMarkIcon size={12} color={colors.textPrimary} /></View></ElasticPressable>}
          </Pressable>
        );
      })}
      {deadlineGroups.map((group) => {
        const object = group.length === 1 ? group[0] : {
          ...group[0],
          id: `deadline-group-${new Date(group[0].start).getTime()}`,
          title: group.map((entry) => entry.title).join(' · '),
          description: t('dummyDescription'),
        };
        const top = (minutesIntoDay(object.start) / 60) * Calendar.HOUR_HEIGHT;
        const deadlineHeight = Math.max(40, Math.ceil(17 * fontScale * 2 + 10));
        const center = deadlineHeight / 2;
        const endpointLabel = object.userCreated && object.rangeEndpoint ? t(object.rangeEndpoint === 'start' ? 'start' : 'end') : null;
        return (
          <Pressable
            key={object.id}
            onPress={() => onOpen(object, day)}
            accessibilityRole="button"
            accessibilityLabel={object.title}
            hitSlop={8}
            style={[styles.deadlineTouch, { top: top - center, height: deadlineHeight, left: Calendar.TIME_GUTTER, width: eventAreaWidth }]}
          >
            <View style={[styles.deadlineLine, { top: center - 1, backgroundColor: colors.accent }]} />
            <View style={[styles.deadlineDot, { top: center - 5, backgroundColor: colors.accent, borderColor: colors.background }]} />
            <View pointerEvents="none" style={styles.deadlineLabelWrap}>
              <Text numberOfLines={2} includeFontPadding={false} style={[styles.deadlineLabel, { color: colors.textPrimary, backgroundColor: colors.background }, type(13, 'bold', 17)]}>{formatTime(object.start, language)} · {endpointLabel ? `${endpointLabel} · ` : ''}{object.title}</Text>
            </View>
          </Pressable>
        );
      })}
      {isCurrentDay && (
        <>
          <View pointerEvents="none" style={[styles.nowLineHalo, { top: (nowMinute / 60) * Calendar.HOUR_HEIGHT - 2, left: Calendar.TIME_GUTTER, width: eventAreaWidth, backgroundColor: colorWithAlpha(colors.accent, 0.28) }]} />
          <View pointerEvents="none" style={[styles.nowLine, { top: (nowMinute / 60) * Calendar.HOUR_HEIGHT, left: Calendar.TIME_GUTTER, width: eventAreaWidth, backgroundColor: colors.accent }]}><Text includeFontPadding={false} style={[styles.nowLabel, { color: nowLabelColor, backgroundColor: colors.accent }, type(10, 'bold', 12)]}>{t('now')}</Text></View>
        </>
      )}
    </View>
  );
});

export default function DayTimelineModal({ visible, date, focusTime, objects, onClose, onOpenMonth, onCreateEvent, onDeleteEvent }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors, type, t, language, motion, isRTL, fontScale, effectiveTheme } = usePreferences();
  const selectedDayRef = useRef(startOfDay(date || new Date()));
  const focusTimeRef = useRef(focusTime || null);
  if (visible) {
    const requestedDay = startOfDay(date || new Date());
    if (!sameDay(selectedDayRef.current, requestedDay)) selectedDayRef.current = requestedDay;
    focusTimeRef.current = focusTime || null;
  }
  const selectedDay = selectedDayRef.current;
  const activeFocusTime = focusTimeRef.current;
  const [mounted, setMounted] = useState(visible);
  const [headerDay, setHeaderDay] = useState(selectedDay);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [selectedObject, setSelectedObject] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const listRef = useRef(null);
  const didInitialScroll = useRef(false);
  const modalProgress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const days = useMemo(() => (visible || mounted) ? Array.from({ length: DAYS_EACH_SIDE * 2 + 1 }, (_, index) => addDays(selectedDay, index - DAYS_EACH_SIDE)) : [], [selectedDay, visible, mounted]);
  const timelineWidth = Math.max(180, width - Spacing.sm * 2);
  const eventAreaWidth = timelineWidth - Calendar.TIME_GUTTER - Spacing.md;
  const nowLabelColor = effectiveTheme === 'dark' ? colors.white : colors.black;
  const activeAllDay = useMemo(() => splitDayObjects(objects, headerDay).allDay, [objects, headerDay]);

  useEffect(() => {
    if (!visible) return undefined;
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, [visible]);

  const initialMinute = useMemo(() => {
    if (activeFocusTime && sameDay(activeFocusTime, selectedDay)) return minutesIntoDay(activeFocusTime);
    if (sameDay(selectedDay, new Date())) return minutesIntoDay(new Date());
    const dayObjects = splitDayObjects(objects, selectedDay);
    const minutes = [...dayObjects.timed.map((object) => clippedMinutes(object, selectedDay).startMinute), ...dayObjects.deadlines.map((object) => minutesIntoDay(object.start))].sort((a, b) => a - b);
    return minutes[0] ?? 0;
  }, [activeFocusTime, objects, selectedDay]);

  const performInitialScroll = useCallback(() => {
    if (!mounted || !viewportHeight || didInitialScroll.current) return;
    const target = DAYS_EACH_SIDE * DAY_HEIGHT + (initialMinute / 60) * Calendar.HOUR_HEIGHT - viewportHeight / 2;
    listRef.current?.scrollToOffset({ offset: Math.max(0, target), animated: false });
    didInitialScroll.current = true;
  }, [initialMinute, mounted, viewportHeight]);

  useEffect(() => {
    modalProgress.stopAnimation();
    if (visible) {
      setMounted(true);
      setHeaderDay(selectedDay);
      setSelectedObject(null);
      didInitialScroll.current = false;
      modalProgress.setValue(motion ? 0 : 1);
      if (motion) Animated.spring(modalProgress, { toValue: 1, friction: 8, tension: 115, useNativeDriver: true, isInteraction: false }).start();
    } else if (mounted) {
      setSelectedObject(null);
      if (!motion) { modalProgress.setValue(0); setMounted(false); }
      else Animated.timing(modalProgress, { toValue: 0, duration: Calendar.MODAL_ANIMATION_MS, easing: Easing.in(Easing.back(1.1)), useNativeDriver: true, isInteraction: false }).start(({ finished }) => finished && setMounted(false));
    }
  }, [visible, selectedDay, activeFocusTime, motion, modalProgress]);

  useEffect(() => {
    if (!mounted || !viewportHeight) return;
    let settleFrame;
    const layoutFrame = requestAnimationFrame(() => { settleFrame = requestAnimationFrame(performInitialScroll); });
    return () => { cancelAnimationFrame(layoutFrame); if (settleFrame) cancelAnimationFrame(settleFrame); };
  }, [mounted, viewportHeight, performInitialScroll]);

  const openTooltip = useCallback((object, objectDay) => setSelectedObject({ ...object, tooltipDay: objectDay }), []);
  const handleViewportLayout = useCallback((event) => {
    const nextHeight = event.nativeEvent.layout.height;
    setViewportHeight((current) => current === nextHeight ? current : nextHeight);
  }, []);
  const handleTimelineScroll = useCallback((event) => {
    const center = event.nativeEvent.contentOffset.y + viewportHeight / 2;
    const index = Math.max(0, Math.min(days.length - 1, Math.floor(center / DAY_HEIGHT)));
    const nextDay = days[index];
    if (nextDay) setHeaderDay((current) => sameDay(nextDay, current) ? current : nextDay);
  }, [days, viewportHeight]);
  const openFullCalendar = useCallback(() => {
    // This is navigation, not a dismissal: remove the day modal immediately so
    // its native layer cannot briefly sit above the opening month calendar.
    modalProgress.stopAnimation();
    modalProgress.setValue(0);
    setMounted(false);
    setSelectedObject(null);
    onOpenMonth?.();
  }, [modalProgress, onOpenMonth]);
  const renderDay = useCallback(({ item }) => <TimelineDay day={item} objects={objects} eventAreaWidth={eventAreaWidth} onOpen={openTooltip} onDelete={onDeleteEvent} colors={colors} type={type} t={t} language={language} fontScale={fontScale} now={now} nowLabelColor={nowLabelColor} />, [objects, eventAreaWidth, openTooltip, onDeleteEvent, colors, type, t, language, fontScale, now, nowLabelColor]);
  const formattedDate = formatNumericDate(headerDay);
  const tooltipTime = selectedObject ? objectTimeLabel(selectedObject, selectedObject.tooltipDay || headerDay, language, t('allDay')) : '';

  if (!mounted && !visible) return null;

  return (
    <>
      <Modal visible={mounted || visible} transparent animationType="none" presentationStyle="overFullScreen" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent hardwareAccelerated>
        <View style={styles.cover}>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: modalProgress }]} />
          <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} />
          <Animated.View style={[styles.modal, {
            marginTop: insets.top + Spacing.sm,
            marginBottom: Math.max(Spacing.sm, insets.bottom),
            borderRadius: Calendar.COVER_RADIUS,
            backgroundColor: colors.background,
            opacity: modalProgress,
            transform: [
              { translateY: modalProgress.interpolate({ inputRange: [0, 1], outputRange: [Calendar.MODAL_POP_TRANSLATE, 0] }) },
              { scale: modalProgress.interpolate({ inputRange: [0, 1], outputRange: [Calendar.MODAL_POP_SCALE, 1] }) },
            ],
          }]}> 
            <View style={[styles.header, { height: Calendar.COVER_HEADER_HEIGHT, borderBottomColor: colors.border }]}> 
              <ElasticPressable shape="pill" style={styles.headerText} pressableStyle={styles.headerDatePressable} onPress={openFullCalendar} accessibilityRole="button" accessibilityLabel={t('openFullCalendar')}>
                <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.centeredHeaderText, { color: colors.textMuted }, type(14, 'bold', 18)]}>{formatWeekday(headerDay, language, 'long')}</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.centeredHeaderText, { color: colors.textPrimary }, type(21, 'bold', 26)]}>{formattedDate}</Text>
              </ElasticPressable>
              <ElasticPressable shape="circle" style={styles.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('closeCalendar')}>
                <View style={[styles.closeCircle, { width: Calendar.COVER_CLOSE_SIZE, height: Calendar.COVER_CLOSE_SIZE, backgroundColor: colors.cardButton }]}><XMarkIcon size={Calendar.CONTROL_ICON_SIZE} color={colors.textPrimary} /></View>
              </ElasticPressable>
              <ElasticPressable shape="circle" style={styles.addButton} onPress={() => onCreateEvent(headerDay)} accessibilityRole="button" accessibilityLabel={t('addEvent')}>
                <View style={[styles.closeCircle, { width: Calendar.COVER_CLOSE_SIZE, height: Calendar.COVER_CLOSE_SIZE, backgroundColor: colors.cardButton }]}><PlusIcon size={Calendar.CONTROL_ICON_SIZE} color={colors.textPrimary} /></View>
              </ElasticPressable>
            </View>
            <View style={styles.timelineViewport} onLayout={handleViewportLayout}>
              <FlatList
                key={`${selectedDay.getTime()}-${activeFocusTime ? new Date(activeFocusTime).getTime() : 'auto'}`}
                ref={listRef}
                data={days}
                renderItem={renderDay}
                keyExtractor={(item) => item.toISOString()}
                getItemLayout={(_, index) => ({ length: DAY_HEIGHT, offset: DAY_HEIGHT * index, index })}
                initialScrollIndex={DAYS_EACH_SIDE}
                initialNumToRender={2}
                maxToRenderPerBatch={2}
                windowSize={3}
                removeClippedSubviews
                onScrollToIndexFailed={({ index }) => listRef.current?.scrollToOffset({ offset: index * DAY_HEIGHT, animated: false })}
                onContentSizeChange={performInitialScroll}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                contentContainerStyle={TIMELINE_CONTENT_STYLE}
                onScroll={handleTimelineScroll}
              />
              <View style={[styles.allDayDock, { minHeight: Calendar.ALL_DAY_DOCK_HEIGHT, paddingBottom: Math.max(Spacing.sm, insets.bottom), backgroundColor: colors.card, borderTopColor: colors.border }]}> 
                <Text style={[styles.allDayLabel, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }, type(11, 'bold', 14)]}>{t('allDay')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.allDayContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
                  {activeAllDay.length ? activeAllDay.map((object) => (
                    <ElasticPressable key={object.id} shape="pill" onPress={() => openTooltip(object, headerDay)} accessibilityRole="button" accessibilityLabel={object.title}>
                      <View style={[styles.allDayChip, { backgroundColor: colors.cardButton, flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
                        <CalendarEventIcons kinds={markerKindsForObjectOnDay(object, headerDay)} size={18} />
                        <Text numberOfLines={1} style={[{ color: colors.textPrimary }, type(12, 'bold', 15)]}>{object.title}</Text>
                      </View>
                    </ElasticPressable>
                  )) : <Text style={[{ color: colors.textMuted }, type(11, 'regular', 14)]}>{t('noAllDayEvents')}</Text>}
                </ScrollView>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
      <EventTooltipModal visible={!!selectedObject} object={selectedObject} timeLabel={tooltipTime} onClose={() => setSelectedObject(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  cover: { flex: 1, paddingHorizontal: Spacing.sm },
  modal: { flex: 1, overflow: 'hidden' },
  header: { justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  headerText: { position: 'absolute', left: 56, right: 56, top: 5, bottom: 5 },
  headerDatePressable: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centeredHeaderText: { width: '100%', textAlign: 'center' },
  closeButton: { position: 'absolute', left: Spacing.md, top: 14 },
  addButton: { position: 'absolute', right: Spacing.md, top: 14 },
  closeCircle: { borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  timelineViewport: { flex: 1 },
  day: { position: 'relative', overflow: 'hidden' },
  hourRow: { position: 'absolute', left: 0, right: 0, borderTopWidth: StyleSheet.hairlineWidth },
  hourLabel: { position: 'absolute', width: Calendar.TIME_GUTTER - 8, top: 4, textAlign: 'right' },
  eventBlock: { position: 'absolute', borderRadius: Radius.sm, paddingHorizontal: 5, paddingVertical: 4, overflow: 'hidden', zIndex: 2 },
  userEventText: { paddingRight: 23 },
  eventDelete: { position: 'absolute', right: 3, top: 3 },
  eventDeleteCircle: { width: 20, height: 20, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  eventTime: { opacity: 0.84, marginTop: 2 },
  deadlineTouch: { position: 'absolute', justifyContent: 'center', zIndex: 5 },
  deadlineLine: { position: 'absolute', left: 0, right: 0, height: 2 },
  deadlineDot: { position: 'absolute', left: -4, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  deadlineLabelWrap: { position: 'absolute', left: 9, right: 0, top: 0, bottom: 0, zIndex: 2, justifyContent: 'center', alignItems: 'flex-start' },
  deadlineLabel: { maxWidth: '94%', paddingHorizontal: 6, paddingVertical: 2, textAlignVertical: 'center' },
  nowLineHalo: { position: 'absolute', height: 5.5, borderRadius: 3, zIndex: 6 },
  nowLine: { position: 'absolute', height: 1.5, borderRadius: 1, zIndex: 7 },
  nowLabel: { position: 'absolute', left: 8, top: -10, paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.pill, overflow: 'hidden' },
  allDayDock: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.sm },
  allDayLabel: { paddingHorizontal: Spacing.md, marginBottom: Spacing.xs },
  allDayContent: { alignItems: 'center', paddingHorizontal: Spacing.md, gap: Spacing.sm, minHeight: 40 },
  allDayChip: { alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radius.pill, maxWidth: 240 },
});
