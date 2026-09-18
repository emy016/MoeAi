/** Animated, swipeable, inspect-first full-screen month calendar. */
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, XMarkIcon } from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  addDays,
  addMonths,
  currentWeekNumber,
  dateKey,
  formatMonthMarker,
  formatMonthYear,
  formatNumericDate,
  formatTime,
  formatWeekday,
  markerKindsForDay,
  markerKindsForObjectOnDay,
  monthGrid,
  objectsForDay,
  sameDay,
  startOfDay,
} from '../calendar/calendarModel';
import CalendarEventIcons from '../components/CalendarEventIcons';
import ElasticPressable from '../components/ElasticPressable';
import EventTooltipModal from '../components/EventTooltipModal';
import { colorWithAlpha } from '../constants/colors';
import { Calendar, Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';

function objectTimeLabel(object, day, language, allDayLabel) {
  if (object.allDay) return allDayLabel;
  if (object.point) return formatTime(object.start, language);
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const visibleStart = new Date(Math.max(new Date(object.start).getTime(), dayStart.getTime()));
  const visibleEnd = new Date(Math.min(new Date(object.end).getTime(), dayEnd.getTime()));
  return `${formatTime(visibleStart, language)} – ${formatTime(visibleEnd, language)}`;
}

function timelineTargetForObject(object, day) {
  const finalTime = object.rangeMarkerTimes?.end;
  if (finalTime && sameDay(finalTime, day)) return { day: startOfDay(finalTime), focusTime: finalTime };
  const firstTime = object.rangeMarkerTimes?.start || object.start;
  if (firstTime && sameDay(firstTime, day)) return { day: startOfDay(firstTime), focusTime: firstTime };
  if (object.rangeMarkerTimes?.start) return { day: startOfDay(object.rangeMarkerTimes.start), focusTime: object.rangeMarkerTimes.start };
  if (object.point) return { day: startOfDay(object.start), focusTime: object.start };
  const clippedStart = new Date(Math.max(new Date(object.start).getTime(), startOfDay(day).getTime()));
  return { day: startOfDay(day), focusTime: clippedStart };
}

const WeekRow = React.memo(function WeekRow({ dates, markersByDay, displayMonth, inspectedDay, today, width, onDayPress }) {
  const { colors, type, language, isRTL, fontScale } = usePreferences();
  const cellWidth = width / 7;

  return (
    <View style={[styles.weekRow, { height: Calendar.MONTH_CELL_HEIGHT, backgroundColor: colors.cardButton, flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
      {dates.map((date) => {
        const inMonth = date.getMonth() === displayMonth.getMonth() && date.getFullYear() === displayMonth.getFullYear();
        const monthStart = date.getDate() === 1;
        const current = sameDay(date, today);
        const inspected = sameDay(date, inspectedDay);
        const previous = addDays(date, -1);
        const next = addDays(date, 1);
        const startsCurrentMonth = inMonth && (previous.getMonth() !== displayMonth.getMonth() || previous.getFullYear() !== displayMonth.getFullYear());
        const endsCurrentMonth = inMonth && (next.getMonth() !== displayMonth.getMonth() || next.getFullYear() !== displayMonth.getFullYear());
        const previousTouchesCurrent = !inMonth && next.getMonth() === displayMonth.getMonth() && next.getFullYear() === displayMonth.getFullYear();
        const nextTouchesCurrent = !inMonth && previous.getMonth() === displayMonth.getMonth() && previous.getFullYear() === displayMonth.getFullYear();
        const curveStyle = {
          borderBottomRightRadius: (!isRTL && (previousTouchesCurrent || endsCurrentMonth)) ? Radius.lg : 0,
          borderBottomLeftRadius: (isRTL && (previousTouchesCurrent || endsCurrentMonth)) ? Radius.lg : 0,
          borderTopLeftRadius: (!isRTL && (nextTouchesCurrent || startsCurrentMonth)) ? Radius.lg : 0,
          borderTopRightRadius: (isRTL && (nextTouchesCurrent || startsCurrentMonth)) ? Radius.lg : 0,
        };
        return (
          <Pressable key={date.toISOString()} onPress={() => onDayPress(date)} accessibilityRole="button" accessibilityLabel={`${formatWeekday(date, language, 'long')} ${date.getDate()}`} style={{ width: cellWidth, backgroundColor: inMonth && (startsCurrentMonth || endsCurrentMonth) ? colors.card : colors.cardButton }}>
            <View style={[styles.dayCell, { width: cellWidth, height: Calendar.MONTH_CELL_HEIGHT, backgroundColor: inMonth ? colors.cardButton : colors.card }, curveStyle]}> 
              <View style={[styles.monthMarkerSlot, { height: fontScale > 1.2 ? 20 : 16 }]}>{monthStart && <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86} style={[styles.monthMarker, { color: inMonth ? colors.textPrimary : colors.textMuted }, type(12, 'bold', 14)]}>{formatMonthMarker(date, language)}</Text>}</View>
              <View style={styles.dateSelectionWrap}> 
                <View style={[styles.dateCircle, { width: Calendar.MONTH_DATE_SIZE, height: Calendar.MONTH_DATE_SIZE }, inspected && { backgroundColor: colorWithAlpha(colors.accent, 0.5) }, current && { backgroundColor: colors.accent }]}> 
                  <Text style={[{ color: current ? colors.white : inMonth ? colors.textPrimary : colors.textMuted }, type(16, 'bold', 19)]}>{date.getDate()}</Text>
                </View>
              </View>
            </View>
          </Pressable>
        );
      })}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.monthIconsOverlay, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
        {markersByDay.map((markers, index) => <View key={dates[index].toISOString()} style={[styles.monthIcons, { width: cellWidth, height: Calendar.MONTH_MARKER_ROW_HEIGHT }]}><CalendarEventIcons kinds={markers} size={13} maxWidth={cellWidth - 4} surfaceColor={colors.cardButton} /></View>)}
      </View>
    </View>
  );
});

const MonthPage = React.memo(function MonthPage({ month, objects, inspectedDay, today, width, onDayPress }) {
  const { colors, type, language, isRTL } = usePreferences();
  const days = useMemo(() => monthGrid(month), [month]);
  const weeks = useMemo(() => Array.from({ length: days.length / 7 }, (_, index) => days.slice(index * 7, index * 7 + 7)), [days]);
  const weekRows = useMemo(
    () => weeks.map((dates) => ({ dates, markersByDay: dates.map((date) => markerKindsForDay(objects, date)) })),
    [objects, weeks],
  );
  const weekdayDates = useMemo(() => Array.from({ length: 7 }, (_, index) => days[index] || addDays(new Date(2024, 0, 1), index)), [days]);

  return (
    <View style={[styles.calendarCard, { width, height: Calendar.MONTH_CELL_HEIGHT * weeks.length + Calendar.MONTH_WEEKDAY_HEIGHT, backgroundColor: colors.card }]}> 
      <View style={[styles.weekdayRow, { height: Calendar.MONTH_WEEKDAY_HEIGHT, flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.border }]}> 
        {weekdayDates.map((date) => <Text key={date.toISOString()} numberOfLines={1} adjustsFontSizeToFit style={[styles.weekdayName, { color: colors.textMuted }, type(11, 'bold', 14)]}>{formatWeekday(date, language, 'short').replace('.', '')}</Text>)}
      </View>
      {weekRows.map(({ dates, markersByDay }) => <WeekRow key={dateKey(dates[0])} dates={dates} markersByDay={markersByDay} displayMonth={month} inspectedDay={inspectedDay} today={today} width={width} onDayPress={onDayPress} />)}
    </View>
  );
}, (previous, next) => previous.month.getFullYear() === next.month.getFullYear()
  && previous.month.getMonth() === next.month.getMonth()
  && previous.objects === next.objects
  && previous.width === next.width
  && previous.today === next.today
  && previous.onDayPress === next.onDayPress
  && ((!previous.inspectedDay && !next.inspectedDay)
    || (!!previous.inspectedDay && !!next.inspectedDay && sameDay(previous.inspectedDay, next.inspectedDay))));

const SelectedDayEvents = React.memo(function SelectedDayEvents({ day, objects, onViewObject, onCreateEvent, onDeleteEvent }) {
  const { colors, type, t, language, isRTL } = usePreferences();
  const entries = objectsForDay(objects, day);
  const label = `${formatWeekday(day, language, 'long')} · ${formatNumericDate(day)}`;
  const timeLabel = (object) => object.allDay ? t('allDay') : object.point ? formatTime(object.start, language) : `${formatTime(object.start, language)} – ${formatTime(object.end, language)}`;
  return (
    <View style={[styles.eventsPanel, { backgroundColor: colors.card }]}> 
      <View style={styles.eventsHeader}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.eventsTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(17, 'bold', 22)]}>{label}</Text>
        <ElasticPressable shape="circle" onPress={() => onCreateEvent(day)} accessibilityRole="button" accessibilityLabel={t('addEvent')}>
          <View style={[styles.addCircle, { backgroundColor: colors.cardButton }]}><PlusIcon size={19} color={colors.textPrimary} /></View>
        </ElasticPressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.eventsList}>
        {entries.length ? entries.map((object) => (
          <View key={object.id} style={[styles.eventRow, { backgroundColor: colors.cardButton }]}> 
            <ElasticPressable shape="pill" style={styles.eventTap} pressableStyle={[styles.eventTapInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => onViewObject(object, day)} accessibilityRole="button" accessibilityLabel={object.title}>
              <CalendarEventIcons kinds={markerKindsForObjectOnDay(object, day)} size={18} />
              <View style={styles.eventCopy}><Text numberOfLines={1} style={[{ color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(12, 'bold', 15)]}>{object.title}</Text><Text numberOfLines={1} style={[{ color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }, type(10, 'regular', 13)]}>{timeLabel(object)}</Text></View>
            </ElasticPressable>
            {object.userCreated && <ElasticPressable shape="circle" onPress={() => onDeleteEvent(object)} accessibilityRole="button" accessibilityLabel={t('deleteEvent')}><View style={[styles.deleteCircle, { backgroundColor: colors.background }]}><XMarkIcon size={15} color={colors.textMuted} /></View></ElasticPressable>}
          </View>
        )) : <Text style={[{ color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }, type(12, 'regular', 16)]}>{t('noEvents')}</Text>}
      </ScrollView>
    </View>
  );
});

export default function FullCalendarScreen({ visible, objects, onClose, onSelectDay, onCreateEvent, onDeleteEvent }) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { colors, type, t, language, motion, isRTL } = usePreferences();
  const today = useMemo(() => startOfDay(new Date()), []);
  const initialMonth = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  const [mounted, setMounted] = useState(visible);
  const [displayMonth, setDisplayMonth] = useState(initialMonth);
  const [visibleMonth, setVisibleMonth] = useState(initialMonth);
  const [inspectedDay, setInspectedDay] = useState(today);
  const [armedDay, setArmedDay] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [transitionOverlayMonth, setTransitionOverlayMonth] = useState(null);
  const gridWidth = Math.max(0, windowWidth - Spacing.md * 2);
  const displayMonthRef = useRef(initialMonth);
  const modalProgress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const monthTranslate = useRef(new Animated.Value(0)).current;
  const monthOverlayOpacity = useRef(new Animated.Value(0)).current;
  const monthDragOrigin = useRef(0);
  const overlayFrame = useRef(null);
  const monthTransitioning = useRef(false);
  const todayOpensDirectly = useRef(true);
  const armedDayRef = useRef(armedDay);
  armedDayRef.current = armedDay;
  const pageMonths = useMemo(() => [addMonths(displayMonth, -1), displayMonth, addMonths(displayMonth, 1)], [displayMonth]);
  const pagerHeight = Calendar.MONTH_CELL_HEIGHT * 6 + Calendar.MONTH_WEEKDAY_HEIGHT;

  const resetCalendarState = useCallback(() => {
    monthTransitioning.current = false;
    monthTranslate.stopAnimation();
    monthOverlayOpacity.stopAnimation();
    monthOverlayOpacity.setValue(0);
    if (overlayFrame.current != null) cancelAnimationFrame(overlayFrame.current);
    overlayFrame.current = null;
    displayMonthRef.current = initialMonth;
    setDisplayMonth(initialMonth);
    setVisibleMonth(initialMonth);
    setInspectedDay(today);
    setArmedDay(null);
    setSelectedObject(null);
    setTransitionOverlayMonth(null);
    todayOpensDirectly.current = true;
    monthTranslate.setValue(0);
  }, [initialMonth, monthOverlayOpacity, monthTranslate, today]);

  useLayoutEffect(() => {
    modalProgress.stopAnimation();
    if (visible) {
      setMounted(true);
      modalProgress.setValue(motion ? 0 : 1);
      if (motion) Animated.spring(modalProgress, { toValue: 1, stiffness: 400, damping: 32, mass: 0.55, useNativeDriver: true, isInteraction: false }).start();
    } else if (mounted) {
      if (!motion) { modalProgress.setValue(0); setMounted(false); resetCalendarState(); }
      else Animated.timing(modalProgress, { toValue: 0, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }).start(({ finished }) => { if (finished) { setMounted(false); resetCalendarState(); } });
    }
  }, [visible, motion, modalProgress, resetCalendarState]);

  const settleMonth = useCallback(() => {
    monthTranslate.stopAnimation();
    if (!motion) { monthTranslate.setValue(0); return; }
    Animated.spring(monthTranslate, {
      toValue: 0,
      stiffness: 235,
      damping: 22,
      mass: 0.72,
      restDisplacementThreshold: 0.1,
      restSpeedThreshold: 0.1,
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  }, [motion, monthTranslate]);

  const changeMonth = useCallback((amount) => {
    if (!amount || monthTransitioning.current || gridWidth <= 0) return;
    const next = addMonths(displayMonthRef.current, amount);
    const commit = () => {
      monthOverlayOpacity.setValue(1);
      displayMonthRef.current = next;
      // Rebase the native track in the same JS turn as the month update. The
      // old implementation waited for a later layout effect, briefly exposing
      // the wrong neighboring month and its marker set.
      monthTranslate.setValue(0);
      setDisplayMonth(next);
      monthTransitioning.current = false;
      overlayFrame.current = requestAnimationFrame(() => {
        Animated.timing(monthOverlayOpacity, { toValue: 0, duration: 55, useNativeDriver: true, isInteraction: false }).start(({ finished }) => {
          if (finished) setTransitionOverlayMonth(null);
        });
      });
    };
    // The header and selected-day panel describe the destination immediately;
    // the pager's internal center month is committed only after its native
    // slide finishes, keeping both metadata and motion responsive.
    setVisibleMonth(next);
    const nextInspection = next.getMonth() === today.getMonth() && next.getFullYear() === today.getFullYear() ? today : next;
    setInspectedDay(nextInspection);
    setArmedDay(null);
    setTransitionOverlayMonth(next);
    monthOverlayOpacity.stopAnimation();
    monthOverlayOpacity.setValue(0);
    monthTransitioning.current = true;
    monthTranslate.stopAnimation();
    if (!motion) {
      displayMonthRef.current = next;
      monthTranslate.setValue(0);
      setDisplayMonth(next);
      setTransitionOverlayMonth(null);
      monthTransitioning.current = false;
      return;
    }
    Animated.spring(monthTranslate, {
      toValue: amount > 0 ? -gridWidth : gridWidth,
      stiffness: 285,
      damping: 25,
      mass: 0.66,
      velocity: amount > 0 ? -0.25 : 0.25,
      restDisplacementThreshold: 0.35,
      restSpeedThreshold: 0.35,
      useNativeDriver: true,
      isInteraction: false,
    }).start(({ finished }) => {
      if (finished) commit();
      else {
        monthOverlayOpacity.setValue(0);
        setTransitionOverlayMonth(null);
        monthTransitioning.current = false;
      }
    });
  }, [gridWidth, motion, monthOverlayOpacity, monthTranslate, today]);

  const goToCurrentMonth = useCallback(() => {
    const current = displayMonthRef.current;
    const changed = current.getMonth() !== initialMonth.getMonth() || current.getFullYear() !== initialMonth.getFullYear();
    monthTranslate.stopAnimation();
    monthTranslate.setValue(0);
    monthOverlayOpacity.stopAnimation();
    monthOverlayOpacity.setValue(0);
    if (overlayFrame.current != null) cancelAnimationFrame(overlayFrame.current);
    overlayFrame.current = null;
    monthTransitioning.current = false;
    displayMonthRef.current = initialMonth;
    setDisplayMonth(initialMonth);
    setVisibleMonth(initialMonth);
    setInspectedDay(today);
    setArmedDay(null);
    setTransitionOverlayMonth(null);
    if (!changed) todayOpensDirectly.current = true;
  }, [initialMonth, monthOverlayOpacity, monthTranslate, today]);

  const swipe = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => !monthTransitioning.current && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15,
    onMoveShouldSetPanResponderCapture: (_, gesture) => !monthTransitioning.current && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15,
    onPanResponderGrant: () => {
      monthDragOrigin.current = 0;
      monthTranslate.stopAnimation((value) => { monthDragOrigin.current = value; });
    },
    onPanResponderMove: (_, gesture) => {
      if (motion) monthTranslate.setValue(Math.max(-gridWidth, Math.min(gridWidth, monthDragOrigin.current + gesture.dx)));
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx < -gridWidth * 0.18 || gesture.vx < -0.38) changeMonth(1);
      else if (gesture.dx > gridWidth * 0.18 || gesture.vx > 0.38) changeMonth(-1);
      else settleMonth();
    },
    onPanResponderTerminate: settleMonth,
    onPanResponderTerminationRequest: () => false,
  }), [changeMonth, gridWidth, motion, monthTranslate, settleMonth]);

  const handleDayPress = useCallback((day) => {
    if (sameDay(day, today) && todayOpensDirectly.current) {
      todayOpensDirectly.current = false;
      onSelectDay(day);
      return;
    }
    todayOpensDirectly.current = false;
    if (armedDayRef.current && sameDay(day, armedDayRef.current)) onSelectDay(day);
    else { setInspectedDay(day); setArmedDay(day); }
  }, [onSelectDay, today]);

  const viewObject = useCallback((object, day) => setSelectedObject({ ...object, tooltipDay: day }), []);
  const closeObject = useCallback(() => setSelectedObject(null), []);
  const jumpToObject = useCallback((object) => {
    const day = object.tooltipDay || inspectedDay;
    const target = timelineTargetForObject(object, day);
    setSelectedObject(null);
    onSelectDay(target.day, target.focusTime);
  }, [inspectedDay, onSelectDay]);
  const tooltipTime = selectedObject ? objectTimeLabel(selectedObject, selectedObject.tooltipDay || inspectedDay, language, t('allDay')) : '';

  return (
    <>
    <Modal visible={mounted || visible} animationType="none" presentationStyle="fullScreen" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent hardwareAccelerated>
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}> 
        <Animated.View style={[styles.screen, {
          paddingTop: insets.top,
          opacity: modalProgress,
          transform: [
            { translateY: modalProgress.interpolate({ inputRange: [0, 1], outputRange: [Calendar.MODAL_POP_TRANSLATE, 0] }) },
            { scale: modalProgress.interpolate({ inputRange: [0, 1], outputRange: [Calendar.MODAL_POP_SCALE, 1] }) },
          ],
        }]}> 
          <View style={[styles.topBar, { minHeight: Calendar.MONTH_TOP_BAR_HEIGHT, flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
            <ElasticPressable shape="circle" onPress={onClose} accessibilityRole="button" accessibilityLabel={t('closeCalendar')}>
              <View style={[styles.topCircle, { width: Calendar.MONTH_BACK_SIZE, height: Calendar.MONTH_BACK_SIZE, backgroundColor: colors.cardButton }]}><ArrowLeftIcon size={Calendar.CONTROL_ICON_SIZE} color={colors.textPrimary} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} /></View>
            </ElasticPressable>
            <View style={[styles.monthTitleRow, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}> 
              <ElasticPressable shape="pill" onPress={goToCurrentMonth} accessibilityRole="button" accessibilityLabel={formatMonthYear(visibleMonth, language)}>
                <Text numberOfLines={1} adjustsFontSizeToFit style={[{ color: colors.textPrimary }, type(20, 'bold', 25)]}>{formatMonthYear(visibleMonth, language)}</Text>
              </ElasticPressable>
              <Text numberOfLines={1} style={[{ color: colors.textMuted }, type(13, 'bold', 17)]}>{t('week')} {currentWeekNumber(inspectedDay)}</Text>
            </View>
            <View style={[styles.monthArrows, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
              <ElasticPressable shape="circle" onPress={() => changeMonth(-1)} accessibilityRole="button" accessibilityLabel={t('previousMonth')}><View style={[styles.smallCircle, { width: Calendar.MONTH_NAV_SIZE, height: Calendar.MONTH_NAV_SIZE, backgroundColor: colors.cardButton }]}><ChevronLeftIcon size={Calendar.CONTROL_ICON_SIZE - 3} color={colors.textPrimary} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} /></View></ElasticPressable>
              <ElasticPressable shape="circle" onPress={() => changeMonth(1)} accessibilityRole="button" accessibilityLabel={t('nextMonth')}><View style={[styles.smallCircle, { width: Calendar.MONTH_NAV_SIZE, height: Calendar.MONTH_NAV_SIZE, backgroundColor: colors.cardButton }]}><ChevronRightIcon size={Calendar.CONTROL_ICON_SIZE - 3} color={colors.textPrimary} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} /></View></ElasticPressable>
            </View>
          </View>
          <View style={styles.monthContent}>
            <View style={[styles.monthPager, { height: pagerHeight }]} {...swipe.panHandlers}>
              {pageMonths.map((month, index) => (
                <Animated.View
                  key={`${month.getFullYear()}-${month.getMonth()}`}
                  pointerEvents={index === 1 ? 'auto' : 'none'}
                  style={[styles.monthPage, { width: gridWidth, left: (index - 1) * gridWidth, transform: [{ translateX: monthTranslate }] }]}
                >
                  <MonthPage month={month} objects={objects} inspectedDay={index === 1 ? armedDay : null} today={today} width={gridWidth} onDayPress={handleDayPress} />
                </Animated.View>
              ))}
              {transitionOverlayMonth && (
                <Animated.View pointerEvents="none" style={[styles.monthPage, styles.monthCommitOverlay, { width: gridWidth, opacity: monthOverlayOpacity }]}> 
                  <MonthPage month={transitionOverlayMonth} objects={objects} inspectedDay={null} today={today} width={gridWidth} onDayPress={handleDayPress} />
                </Animated.View>
              )}
            </View>
            <SelectedDayEvents day={inspectedDay} objects={objects} onViewObject={viewObject} onCreateEvent={onCreateEvent} onDeleteEvent={onDeleteEvent} />
          </View>
        </Animated.View>
      </View>
    </Modal>
    <EventTooltipModal visible={!!selectedObject} object={selectedObject} timeLabel={tooltipTime} onClose={closeObject} onJumpToTime={jumpToObject} />
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1 },
  screen: { flex: 1, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  topBar: { alignItems: 'center', gap: Spacing.sm },
  topCircle: { borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  monthTitleRow: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 1 },
  monthArrows: { gap: 6 },
  smallCircle: { borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  monthContent: { flex: 1 },
  monthPager: { position: 'relative', overflow: 'hidden' },
  monthPage: { position: 'absolute', top: 0 },
  monthCommitOverlay: { left: 0, zIndex: 5 },
  calendarCard: { borderRadius: Radius.lg, overflow: 'hidden' },
  weekdayRow: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  weekdayName: { width: `${100 / 7}%`, textAlign: 'center', textTransform: 'capitalize' },
  weekRow: { position: 'relative' },
  dayCell: { alignItems: 'center', paddingTop: 2, overflow: 'hidden' },
  monthMarkerSlot: { justifyContent: 'center' },
  monthMarker: { textAlign: 'center', maxWidth: '94%' },
  dateSelectionWrap: { width: Calendar.MONTH_DATE_SIZE, height: Calendar.MONTH_DATE_SIZE, borderRadius: Calendar.MONTH_DATE_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  dateCircle: { borderRadius: Calendar.MONTH_DATE_SIZE / 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  monthIconsOverlay: { alignItems: 'flex-end', zIndex: 3 },
  monthIcons: { alignItems: 'center', justifyContent: 'center' },
  eventsPanel: { flex: 1, minHeight: 76, marginTop: Spacing.sm, borderRadius: Radius.lg, padding: Spacing.sm },
  eventsHeader: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  eventsTitle: { flex: 1, minWidth: 0 },
  addCircle: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  eventsList: { gap: 6, paddingTop: 6, paddingBottom: Spacing.sm },
  eventRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md, paddingRight: 7, overflow: 'hidden' },
  eventTap: { flex: 1, minWidth: 0 },
  eventTapInner: { minHeight: 48, alignItems: 'center', gap: Spacing.sm, paddingHorizontal: 10, paddingVertical: 7 },
  eventCopy: { flex: 1, minWidth: 0 },
  deleteCircle: { width: 28, height: 28, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
