/** Free-scrolling Home calendar strip with week navigation controls. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { CalendarDaysIcon } from 'react-native-heroicons/solid';
import { ChevronLeftIcon, ChevronRightIcon } from 'react-native-heroicons/outline';
import {
  addDays,
  formatWeekday,
  currentWeekNumber,
  markerKindsForDay,
  sameDay,
  startOfDay,
  startOfWeek,
} from '../calendar/calendarModel';
import { Calendar, Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import CalendarEventIcons from './CalendarEventIcons';
import ElasticPressable from './ElasticPressable';

const INITIAL_PAST_DAYS = 8 * 7;
const INITIAL_FUTURE_DAYS = 12 * 7;
const EXTEND_DAYS = 8 * 7;

function makeDates(start, count) {
  return Array.from({ length: count }, (_, index) => addDays(start, index));
}

const CalendarDay = React.memo(function CalendarDay({ day, today, objects, cellWidth, onSelectDay }) {
  const { colors, type, language } = usePreferences();
  const current = sameDay(day, today);
  const markers = markerKindsForDay(objects, day);
  return (
    <ElasticPressable
      shape="pill"
      style={[styles.dayTouch, { width: cellWidth }]}
      onPress={() => onSelectDay(day)}
      accessibilityRole="button"
      accessibilityLabel={`${formatWeekday(day, language, 'long')} ${day.getDate()}`}
    >
      <View style={[styles.dayPill, { height: Calendar.DAY_PILL_HEIGHT, borderRadius: Calendar.DAY_PILL_RADIUS, backgroundColor: colors.card }]}> 
        <View style={[styles.todayInset, { minHeight: Calendar.TODAY_LABEL_HEIGHT }, current && { backgroundColor: colors.accent, borderRadius: Calendar.DAY_PILL_RADIUS - Calendar.TODAY_INSET }]}> 
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.weekday, { color: current ? colors.white : colors.textMuted }, type(11, 'bold', 14)]}>{formatWeekday(day, language, 'short').replace('.', '')}</Text>
          <Text style={[styles.dayNumber, { color: current ? colors.white : colors.textSecondary }, type(17, 'bold', 21)]}>{day.getDate()}</Text>
        </View>
        <CalendarEventIcons kinds={markers} maxWidth={cellWidth - Calendar.TODAY_INSET * 2} />
      </View>
    </ElasticPressable>
  );
});

function CalendarStrip({ registerReset, objects, onSelectDay, onOpenMonth }) {
  const { colors, type, t, isRTL, motion } = usePreferences();
  const today = useMemo(() => startOfDay(new Date()), []);
  const firstDate = useMemo(() => addDays(startOfWeek(today), -INITIAL_PAST_DAYS), [today]);
  const [dates, setDates] = useState(() => makeDates(firstDate, INITIAL_PAST_DAYS + INITIAL_FUTURE_DAYS + 7));
  const [stripWidth, setStripWidth] = useState(0);
  const [visibleWeek, setVisibleWeek] = useState(() => startOfWeek(today));
  const visibleWeekRef = useRef(startOfWeek(today));
  const listRef = useRef(null);
  const offsetRef = useRef(0);
  const extendingPast = useRef(false);
  const extendingFuture = useRef(false);
  const programmaticScroll = useRef(null);
  const cellWidth = stripWidth ? Math.max(36, (stripWidth - Calendar.DAY_GAP * 6) / 7) : 48;
  const span = cellWidth + Calendar.DAY_GAP;

  const extendFuture = useCallback(() => {
    if (extendingFuture.current) return;
    extendingFuture.current = true;
    setDates((current) => [...current, ...makeDates(addDays(current[current.length - 1], 1), EXTEND_DAYS)]);
    requestAnimationFrame(() => { extendingFuture.current = false; });
  }, []);

  const extendPast = useCallback(() => {
    if (extendingPast.current) return;
    extendingPast.current = true;
    setDates((current) => [...makeDates(addDays(current[0], -EXTEND_DAYS), EXTEND_DAYS), ...current]);
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: offsetRef.current + EXTEND_DAYS * span, animated: false });
      offsetRef.current += EXTEND_DAYS * span;
      extendingPast.current = false;
    });
  }, [span]);

  const animateToOffset = useCallback((targetOffset, targetWeek) => {
    // Let the native scroll view own every animation frame. Driving
    // scrollToOffset from an Animated.Value listener crosses the JS bridge on
    // every frame and causes visible jitter on busy calendar renders.
    programmaticScroll.current = motion ? { offset: targetOffset, week: targetWeek } : null;
    listRef.current?.scrollToOffset({ offset: targetOffset, animated: motion });
  }, [motion]);

  const scrollToDate = useCallback((target, animated = false) => {
    const nextWeek = startOfWeek(target);
    if (!sameDay(nextWeek, visibleWeekRef.current)) {
      visibleWeekRef.current = nextWeek;
      setVisibleWeek(nextWeek);
    }

    let index = dates.findIndex((date) => sameDay(date, target));
    if (index < 14 || index > dates.length - 15) {
      const start = addDays(startOfWeek(target), -INITIAL_PAST_DAYS);
      const replacement = makeDates(start, INITIAL_PAST_DAYS + INITIAL_FUTURE_DAYS + 7);
      index = replacement.findIndex((date) => sameDay(date, target));
      setDates(replacement);
      requestAnimationFrame(() => animated ? animateToOffset(index * span, nextWeek) : listRef.current?.scrollToOffset({ offset: index * span, animated: false }));
    } else {
      if (animated) animateToOffset(index * span, nextWeek);
      else listRef.current?.scrollToOffset({ offset: index * span, animated: false });
    }
  }, [animateToOffset, dates, span]);

  const moveWeek = useCallback((amount) => scrollToDate(addDays(visibleWeekRef.current, amount * 7), true), [scrollToDate]);
  const goToCurrentWeek = useCallback(() => scrollToDate(startOfWeek(today), true), [scrollToDate, today]);
  const initialIndex = useMemo(() => Math.max(0, dates.findIndex((date) => sameDay(date, startOfWeek(today)))), [dates, today]);

  useEffect(() => {
    registerReset?.(goToCurrentWeek);
    return () => registerReset?.(null);
  }, [goToCurrentWeek, registerReset]);

  const renderDay = useCallback(({ item }) => <CalendarDay day={item} today={today} objects={objects} cellWidth={cellWidth} onSelectDay={onSelectDay} />, [cellWidth, objects, onSelectDay, today]);

  const handleScroll = useCallback((event) => {
    const offset = event.nativeEvent.contentOffset.x;
    offsetRef.current = offset;
    const pending = programmaticScroll.current;
    if (pending) {
      if (Math.abs(offset - pending.offset) <= 1.5) programmaticScroll.current = null;
      return;
    }
    const index = Math.max(0, Math.min(dates.length - 1, Math.round(offset / span)));
    const nextWeek = startOfWeek(dates[index]);
    if (!sameDay(nextWeek, visibleWeekRef.current)) {
      visibleWeekRef.current = nextWeek;
      setVisibleWeek(nextWeek);
    }
  }, [dates, span]);

  const handleStripLayout = useCallback((event) => {
    const nextWidth = event.nativeEvent.layout.width;
    setStripWidth((current) => current === nextWidth ? current : nextWidth);
  }, []);
  const handleScrollBeginDrag = useCallback(() => { programmaticScroll.current = null; }, []);
  const handleMomentumScrollEnd = useCallback((event) => {
    const pending = programmaticScroll.current;
    if (!pending) return;
    const offset = event.nativeEvent.contentOffset.x;
    if (Math.abs(offset - pending.offset) <= 1.5) programmaticScroll.current = null;
  }, []);
  const handleScrollToIndexFailed = useCallback(({ index }) => {
    listRef.current?.scrollToOffset({ offset: index * span, animated: false });
  }, [span]);

  return (
    <View>
      <View style={[styles.controls, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
        <ElasticPressable shape="circle" onPress={onOpenMonth} accessibilityRole="button" accessibilityLabel={t('openFullCalendar')}>
          <View style={[styles.circleButton, { width: Calendar.CONTROL_SIZE, height: Calendar.CONTROL_SIZE, backgroundColor: colors.cardButton }]}><CalendarDaysIcon size={Calendar.CONTROL_ICON_SIZE} color={colors.textPrimary} /></View>
        </ElasticPressable>
        <ElasticPressable shape="pill" style={styles.weekLabel} pressableStyle={styles.weekLabelPressable} onPress={goToCurrentWeek} accessibilityRole="button" accessibilityLabel={`${t('week')} ${currentWeekNumber(visibleWeek)}`}>
          <Text style={[{ color: colors.textPrimary }, type(16, 'bold', 21)]}>{t('week')} {currentWeekNumber(visibleWeek)}</Text>
        </ElasticPressable>
        <View style={[styles.arrows, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
          <ElasticPressable shape="circle" onPress={() => moveWeek(-1)} accessibilityRole="button" accessibilityLabel={t('previousWeek')}>
            <View style={[styles.circleButton, { width: Calendar.CONTROL_SIZE, height: Calendar.CONTROL_SIZE, backgroundColor: colors.cardButton }]}><ChevronLeftIcon size={Calendar.CONTROL_ICON_SIZE - 1} color={colors.textPrimary} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} /></View>
          </ElasticPressable>
          <ElasticPressable shape="circle" onPress={() => moveWeek(1)} accessibilityRole="button" accessibilityLabel={t('nextWeek')}>
            <View style={[styles.circleButton, { width: Calendar.CONTROL_SIZE, height: Calendar.CONTROL_SIZE, backgroundColor: colors.cardButton }]}><ChevronRightIcon size={Calendar.CONTROL_ICON_SIZE - 1} color={colors.textPrimary} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} /></View>
          </ElasticPressable>
        </View>
      </View>
      <View style={styles.stripClip} onLayout={handleStripLayout}>
        {stripWidth > 0 && (
          <FlatList
            ref={listRef}
            horizontal
            data={dates}
            renderItem={renderDay}
            keyExtractor={(item) => item.toISOString()}
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            initialNumToRender={9}
            maxToRenderPerBatch={7}
            updateCellsBatchingPeriod={32}
            windowSize={3}
            removeClippedSubviews
            getItemLayout={(_, index) => ({ length: span, offset: span * index, index })}
            onScrollToIndexFailed={handleScrollToIndexFailed}
            onEndReached={extendFuture}
            onEndReachedThreshold={0.5}
            onStartReached={extendPast}
            onStartReachedThreshold={0.5}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            onScrollBeginDrag={handleScrollBeginDrag}
            onMomentumScrollEnd={handleMomentumScrollEnd}
          />
        )}
      </View>
    </View>
  );
}

export default React.memo(CalendarStrip);

const styles = StyleSheet.create({
  controls: { alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  weekLabel: { position: 'absolute', left: 90, right: 90 },
  weekLabelPressable: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xs },
  arrows: { gap: Spacing.sm },
  circleButton: { borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  dayTouch: { marginRight: Calendar.DAY_GAP },
  stripClip: { overflow: 'hidden' },
  dayPill: { justifyContent: 'space-between', alignItems: 'center', padding: Calendar.TODAY_INSET, paddingBottom: 6 },
  todayInset: { width: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  weekday: { textAlign: 'center', textTransform: 'capitalize' },
  dayNumber: { textAlign: 'center', marginTop: 1 },
});
