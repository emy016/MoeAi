/** Bottom calendar/time modal with controlled tabs and native scroll wheels. */
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDays, addMonths, formatDate, formatMonthMarker, formatMonthYear, formatTime, formatWeekday, sameDay, startOfDay, startOfWeek } from '../calendar/calendarModel';
import { Radius, Spacing, TabBar } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import ElasticPressable from './ElasticPressable';
import WheelPicker from './WheelPicker';

const HOURS = Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: String(index + 1) }));
const MINUTES = Array.from({ length: 60 }, (_, index) => ({ value: index, label: String(index).padStart(2, '0') }));
const PERIODS = [{ value: 'am', label: 'AM' }, { value: 'pm', label: 'PM' }];
const YEARS = Array.from({ length: 301 }, (_, index) => ({ value: 1900 + index, label: String(1900 + index) }));
const PICKER_VIEW_HEIGHT = 282;
const DATE_VIEW_HEIGHT = 240;
const INITIAL_PICKER_WIDTH = Math.max(1, Dimensions.get('window').width - (Spacing.md * 4));

function setDateParts(value, year, month, day) {
  const next = new Date(value);
  const lastDay = new Date(year, month + 1, 0).getDate();
  next.setFullYear(year, month, Math.min(day, lastDay));
  return next;
}

function calendarGrid(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

const PickerTabs = React.memo(function PickerTabs({ selected, value, onChange, progress }) {
  const { colors, type, t, language } = usePreferences();
  const [trackWidth, setTrackWidth] = useState(0);
  const tabs = [
    { key: 'date', label: t('date'), value: formatDate(value, language) },
    { key: 'time', label: t('time'), value: formatTime(value, language) },
  ];
  const indicatorWidth = Math.max(0, (trackWidth - 12) / 2);
  const indicatorTravel = indicatorWidth + 4;
  return (
    <View onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)} style={[styles.tabs, { backgroundColor: colors.cardButton }]}> 
      {trackWidth > 0 && <Animated.View pointerEvents="none" style={[styles.tabIndicator, { width: indicatorWidth, backgroundColor: colors.accent, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [indicatorTravel, 0], extrapolate: 'clamp' }) }] }]} />}
      {tabs.map((tab) => (
        <ElasticPressable key={tab.key} shape="pill" style={styles.tabShell} pressableStyle={styles.tab} onPress={() => onChange(tab.key)} accessibilityRole="tab" accessibilityState={{ selected: selected === tab.key }}>
          <> 
            <Text style={[{ color: selected === tab.key ? colors.white : colors.textMuted }, type(10, 'bold', 12)]}>{tab.label}</Text>
            <Text numberOfLines={1} style={[{ color: selected === tab.key ? colors.white : colors.textPrimary }, type(12, 'bold', 15)]}>{tab.value}</Text>
          </>
        </ElasticPressable>
      ))}
    </View>
  );
});

const TimePicker = React.memo(function TimePicker({ value, liveValueRef, onChange }) {
  const { t } = usePreferences();
  const hour24 = value.getHours();
  const hour12 = hour24 % 12 || 12;
  const period = hour24 >= 12 ? 'pm' : 'am';
  const updateHour = useCallback((hour) => {
    const next = new Date(liveValueRef.current);
    next.setHours((period === 'pm' ? 12 : 0) + (hour % 12));
    onChange(next);
  }, [liveValueRef, onChange, period]);
  const updateMinute = useCallback((minute) => {
    const next = new Date(liveValueRef.current);
    next.setMinutes(minute, 0, 0);
    onChange(next);
  }, [liveValueRef, onChange]);
  const updatePeriod = useCallback((nextPeriod) => {
    const next = new Date(liveValueRef.current);
    next.setHours((nextPeriod === 'pm' ? 12 : 0) + (hour12 % 12));
    onChange(next);
  }, [hour12, liveValueRef, onChange]);
  return (
    <View collapsable={false} style={styles.timeArea}>
      <View style={styles.wheelRow}>
        <WheelPicker items={HOURS} value={hour12} onChange={updateHour} accessibilityLabel={t('hour')} />
        <WheelPicker items={MINUTES} value={value.getMinutes()} onChange={updateMinute} accessibilityLabel={t('minute')} />
        <WheelPicker items={PERIODS} value={period} onChange={updatePeriod} accessibilityLabel={t('period')} />
      </View>
    </View>
  );
}, (previous, next) => previous.onChange === next.onChange
  && previous.liveValueRef === next.liveValueRef
  && previous.value.getHours() === next.value.getHours()
  && previous.value.getMinutes() === next.value.getMinutes());

const DatePicker = React.memo(function DatePicker({ value, liveValueRef, onChange }) {
  const { colors, type, t, language, motion, isRTL } = usePreferences();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [displayMonth, setDisplayMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const [viewMode, setViewMode] = useState('calendar');
  const [dateViewWidth, setDateViewWidth] = useState(INITIAL_PICKER_WIDTH);
  const viewTransition = useRef(new Animated.Value(0)).current;
  const chevronProgress = useRef(new Animated.Value(0)).current;
  const days = useMemo(() => calendarGrid(displayMonth), [displayMonth]);
  const calendarRows = useMemo(() => Array.from({ length: 6 }, (_, index) => days.slice(index * 7, index * 7 + 7)), [days]);
  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(new Date(2024, 0, 1), index)), []);
  const months = useMemo(() => Array.from({ length: 12 }, (_, index) => ({ value: index, label: formatMonthMarker(new Date(2024, index, 1), language) })), [language]);
  const monthValue = value.getMonth();
  const selectedYear = value.getFullYear();
  const selectedMonth = value.getMonth();
  const dayItems = useMemo(() => Array.from({ length: new Date(selectedYear, selectedMonth + 1, 0).getDate() }, (_, index) => ({ value: index + 1, label: String(index + 1) })), [selectedMonth, selectedYear]);

  useLayoutEffect(() => {
    setDisplayMonth((current) => current.getFullYear() === selectedYear && current.getMonth() === selectedMonth
      ? current
      : new Date(selectedYear, selectedMonth, 1));
  }, [selectedMonth, selectedYear]);

  useLayoutEffect(() => {
    const wheelOpen = viewMode === 'wheel';
    chevronProgress.stopAnimation();
    viewTransition.stopAnimation();
    if (!motion) {
      chevronProgress.setValue(wheelOpen ? 1 : 0);
      viewTransition.setValue(wheelOpen ? 1 : 0);
      return undefined;
    }
    const animations = Animated.parallel([
      Animated.spring(viewTransition, { toValue: wheelOpen ? 1 : 0, stiffness: 250, damping: 21, mass: 0.68, useNativeDriver: true, isInteraction: false }),
      Animated.spring(chevronProgress, { toValue: wheelOpen ? 1 : 0, stiffness: 250, damping: 21, mass: 0.68, useNativeDriver: true, isInteraction: false }),
    ]);
    animations.start();
    return () => animations.stop();
  }, [chevronProgress, motion, viewMode, viewTransition]);

  const chooseDay = useCallback((day) => {
    const next = new Date(liveValueRef.current);
    next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    onChange(next);
    setDisplayMonth(new Date(day.getFullYear(), day.getMonth(), 1));
  }, [liveValueRef, onChange]);
  const updatePart = useCallback((part, nextValue) => {
    const current = liveValueRef.current;
    const year = part === 'year' ? nextValue : current.getFullYear();
    const month = part === 'month' ? nextValue : current.getMonth();
    const day = part === 'day' ? nextValue : current.getDate();
    const next = setDateParts(current, year, month, day);
    onChange(next);
    setDisplayMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  }, [liveValueRef, onChange]);
  const updateMonth = useCallback((next) => updatePart('month', next), [updatePart]);
  const updateDay = useCallback((next) => updatePart('day', next), [updatePart]);
  const updateYear = useCallback((next) => updatePart('year', next), [updatePart]);
  const toggleDateMode = useCallback(() => {
    setViewMode((current) => current === 'calendar' ? 'wheel' : 'calendar');
  }, []);
  const measureDateViewport = useCallback((event) => {
    const nextWidth = Math.max(1, Math.round(event.nativeEvent.layout.width));
    setDateViewWidth((current) => current === nextWidth ? current : nextWidth);
  }, []);
  const dateTrackTranslateX = viewTransition.interpolate({ inputRange: [0, 1], outputRange: [0, -dateViewWidth], extrapolate: 'clamp' });
  const dateTrackScaleX = viewTransition.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.018, 1], extrapolate: 'clamp' });

  return (
    <View collapsable={false} style={styles.dateArea}>
      <View style={[styles.calendarHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
        <ElasticPressable shape="circle" onPress={() => setDisplayMonth((current) => addMonths(current, -1))} accessibilityLabel={t('previousMonth')}>
          <View style={[styles.pickerArrow, { backgroundColor: colors.cardButton }]}><ChevronLeftIcon size={18} color={colors.textPrimary} /></View>
        </ElasticPressable>
        <ElasticPressable shape="pill" onPress={toggleDateMode} accessibilityRole="button" accessibilityLabel={`${t('month')} ${formatMonthYear(displayMonth, language)}`}>
          <View style={styles.calendarTitle}>
            <Text numberOfLines={1} style={[{ color: colors.textPrimary }, type(16, 'bold', 20)]}>{formatMonthYear(displayMonth, language)}</Text>
            <Animated.View style={{ transform: [{ rotate: chevronProgress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}><ChevronDownIcon size={17} color={colors.textMuted} /></Animated.View>
          </View>
        </ElasticPressable>
        <ElasticPressable shape="circle" onPress={() => setDisplayMonth((current) => addMonths(current, 1))} accessibilityLabel={t('nextMonth')}>
          <View style={[styles.pickerArrow, { backgroundColor: colors.cardButton }]}><ChevronRightIcon size={18} color={colors.textPrimary} /></View>
        </ElasticPressable>
      </View>
      <View collapsable={false} onLayout={measureDateViewport} style={styles.dateViews}>
        <Animated.View collapsable={false} style={[styles.dateModeTrack, { width: dateViewWidth * 2, transform: [{ translateX: dateTrackTranslateX }, { scaleX: dateTrackScaleX }] }]}> 
          {['calendar', 'wheel'].map((modeName) => {
            const entering = modeName === viewMode;
            return (
              <View key={modeName} collapsable={false} pointerEvents={entering ? 'auto' : 'none'} importantForAccessibility={entering ? 'auto' : 'no-hide-descendants'} style={[styles.dateView, { width: dateViewWidth, backgroundColor: colors.card }]}> 
              {modeName === 'calendar' ? (
                <>
                  <View style={[styles.weekdays, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>{weekdays.map((day) => <Text key={day.toISOString()} style={[styles.weekday, { color: colors.textMuted }, type(10, 'bold', 13)]}>{formatWeekday(day, language, 'short').replace('.', '')}</Text>)}</View>
                  <View style={styles.calendarRows}>{calendarRows.map((week) => (
                    <View key={week[0].toISOString()} style={[styles.calendarWeek, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>{week.map((day) => {
                      const selected = sameDay(day, value);
                      const current = sameDay(day, today);
                      const inMonth = day.getMonth() === displayMonth.getMonth();
                      return <Pressable key={day.toISOString()} onPress={() => chooseDay(day)} style={styles.dayButton}><View style={[styles.miniDateCircle, current && { borderColor: colors.accent, borderWidth: 1.5 }, selected && { backgroundColor: colors.accent, borderColor: colors.accent }]}><Text style={[{ color: selected ? colors.white : inMonth ? colors.textPrimary : colors.textMuted }, type(11, 'bold', 14)]}>{day.getDate()}</Text></View></Pressable>;
                    })}</View>
                  ))}</View>
                </>
              ) : (
                <View style={styles.dateWheelRow}>
                  <WheelPicker items={months} value={monthValue} onChange={updateMonth} accessibilityLabel={t('month')} />
                  <WheelPicker items={dayItems} value={value.getDate()} onChange={updateDay} accessibilityLabel={t('day')} />
                  <WheelPicker items={YEARS} value={value.getFullYear()} onChange={updateYear} accessibilityLabel={t('year')} flex={1.35} />
                </View>
              )}
              </View>
            );
          })}
        </Animated.View>
      </View>
    </View>
  );
}, (previous, next) => previous.onChange === next.onChange
  && previous.liveValueRef === next.liveValueRef
  && previous.value.getFullYear() === next.value.getFullYear()
  && previous.value.getMonth() === next.value.getMonth()
  && previous.value.getDate() === next.value.getDate());

export default function DateTimePickerModal({ visible, title, value, onCancel, onConfirm }) {
  const insets = useSafeAreaInsets();
  const { colors, type, t, motion } = usePreferences();
  const [mounted, setMounted] = useState(visible);
  const [tab, setTab] = useState('time');
  const [displayTitle, setDisplayTitle] = useState(title);
  const [draft, setDraft] = useState(() => new Date(value || Date.now()));
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const tabProgress = useRef(new Animated.Value(0)).current;
  const [pickerWidth, setPickerWidth] = useState(INITIAL_PICKER_WIDTH);

  useLayoutEffect(() => {
    progress.stopAnimation();
    if (visible) {
      setMounted(true);
      setDisplayTitle(title);
      setDraft(new Date(value || Date.now()));
      setTab('time');
      tabProgress.setValue(0);
      progress.setValue(motion ? 0 : 1);
      if (motion) Animated.spring(progress, { toValue: 1, friction: 9, tension: 120, useNativeDriver: true, isInteraction: false }).start();
    } else if (mounted) {
      if (!motion) { progress.setValue(0); setMounted(false); }
      else Animated.timing(progress, { toValue: 0, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }).start(({ finished }) => finished && setMounted(false));
    }
  }, [visible, title, value, motion, progress, tabProgress]);

  useLayoutEffect(() => {
    tabProgress.stopAnimation();
    if (!motion) {
      tabProgress.setValue(tab === 'date' ? 1 : 0);
      return undefined;
    }
    const animation = Animated.spring(tabProgress, { toValue: tab === 'date' ? 1 : 0, stiffness: 250, damping: 21, mass: 0.68, useNativeDriver: true, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [motion, tab, tabProgress]);

  const changeTab = useCallback((nextTab) => {
    if (nextTab === tab) return;
    setTab(nextTab);
  }, [tab]);
  const measurePickerViewport = useCallback((event) => {
    const nextWidth = Math.max(1, Math.round(event.nativeEvent.layout.width));
    setPickerWidth((current) => current === nextWidth ? current : nextWidth);
  }, []);
  const pickerTrackTranslateX = tabProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -pickerWidth], extrapolate: 'clamp' });
  const pickerTrackScaleX = tabProgress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.012, 1], extrapolate: 'clamp' });

  if (!mounted && !visible) return null;
  const confirm = () => { if (onConfirm(new Date(draft)) !== false) onCancel(); };
  return (
    <Modal visible={mounted || visible} transparent animationType="none" presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent hardwareAccelerated onRequestClose={onCancel}>
      <View style={styles.layer}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: progress }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <Animated.View style={[styles.sheet, { marginBottom: insets.bottom + TabBar.PILL_MARGIN_BOTTOM, backgroundColor: colors.card, opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }] }]}> 
          <Text style={[styles.title, { color: colors.textPrimary }, type(18, 'bold', 23)]}>{displayTitle}</Text>
          <PickerTabs selected={tab} value={draft} onChange={changeTab} progress={tabProgress} />
          <View onLayout={measurePickerViewport} style={styles.pickerTransition}>
            <Animated.View collapsable={false} style={[styles.pickerTrack, { width: pickerWidth * 2, transform: [{ translateX: pickerTrackTranslateX }, { scaleX: pickerTrackScaleX }] }]}> 
              {['time', 'date'].map((pickerTab) => {
                const entering = pickerTab === tab;
                return (
                  <View key={pickerTab} collapsable={false} pointerEvents={entering ? 'auto' : 'none'} importantForAccessibility={entering ? 'auto' : 'no-hide-descendants'} style={[styles.pickerPane, { width: pickerWidth, backgroundColor: colors.card }]}>
                    {pickerTab === 'time' ? <TimePicker value={draft} liveValueRef={draftRef} onChange={setDraft} /> : <DatePicker value={draft} liveValueRef={draftRef} onChange={setDraft} />}
                  </View>
                );
              })}
            </Animated.View>
          </View>
          <View style={styles.footer}>
            <ElasticPressable shape="pill" style={styles.footerButton} onPress={onCancel}><View style={[styles.secondaryButton, { backgroundColor: colors.cardButton }]}><Text style={[{ color: colors.textPrimary }, type(13, 'bold', 17)]}>{t('cancel')}</Text></View></ElasticPressable>
            <ElasticPressable shape="pill" style={styles.footerButton} onPress={confirm}><View style={[styles.primaryButton, { backgroundColor: colors.accent }]}><Text style={[{ color: colors.white }, type(13, 'bold', 17)]}>{t('confirm')}</Text></View></ElasticPressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  layer: { flex: 1, justifyContent: 'flex-end' },
  sheet: { marginHorizontal: Spacing.md, borderRadius: Radius.lg, padding: Spacing.md, overflow: 'hidden' },
  title: { textAlign: 'center', marginBottom: Spacing.sm },
  tabs: { width: '100%', maxWidth: 310, alignSelf: 'center', flexDirection: 'row', borderRadius: Radius.pill, padding: 4, gap: 4, marginBottom: Spacing.sm, overflow: 'hidden', position: 'relative' },
  tabIndicator: { position: 'absolute', left: 4, top: 4, bottom: 4, borderRadius: Radius.pill },
  tabShell: { flex: 1, borderRadius: Radius.pill, overflow: 'hidden', zIndex: 1 },
  tab: { minHeight: 42, justifyContent: 'center', alignItems: 'center', borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 5, overflow: 'hidden' },
  pickerTransition: { height: PICKER_VIEW_HEIGHT, position: 'relative', overflow: 'hidden' },
  pickerTrack: { height: PICKER_VIEW_HEIGHT, flexDirection: 'row', alignItems: 'stretch' },
  pickerPane: { height: PICKER_VIEW_HEIGHT, flexShrink: 0, overflow: 'hidden', alignItems: 'stretch', justifyContent: 'flex-start' },
  timeArea: { width: '100%', height: PICKER_VIEW_HEIGHT, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  wheelRow: { width: '82%', height: 230, alignSelf: 'center', flexDirection: 'row', alignItems: 'center' },
  dateArea: { width: '100%', height: PICKER_VIEW_HEIGHT, flexShrink: 0 },
  calendarHeader: { width: '100%', height: 42, flexShrink: 0, alignItems: 'center', justifyContent: 'space-between', zIndex: 2 },
  pickerArrow: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  calendarTitle: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  dateViews: { width: '100%', height: DATE_VIEW_HEIGHT, flexShrink: 0, position: 'relative', overflow: 'hidden' },
  dateModeTrack: { height: DATE_VIEW_HEIGHT, flexDirection: 'row', alignItems: 'stretch' },
  dateView: { height: DATE_VIEW_HEIGHT, flexShrink: 0, overflow: 'hidden' },
  weekdays: { height: 30, alignItems: 'center' },
  weekday: { flex: 1, textAlign: 'center' },
  calendarRows: { height: 210 },
  calendarWeek: { height: 35 },
  dayButton: { flex: 1, height: 35, alignItems: 'center', justifyContent: 'center' },
  miniDateCircle: { width: 31, height: 31, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  dateWheelRow: { height: DATE_VIEW_HEIGHT, flexDirection: 'row', alignItems: 'center' },
  footer: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  footerButton: { flex: 1 },
  secondaryButton: { minHeight: 43, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { minHeight: 43, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
