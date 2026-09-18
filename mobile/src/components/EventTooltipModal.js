/** Top-layer animated details tooltip shared by calendar object types. */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowDownTrayIcon, ClockIcon, DocumentTextIcon, XMarkIcon } from 'react-native-heroicons/outline';
import { DocumentArrowDownIcon, DocumentArrowUpIcon, DocumentCheckIcon } from 'react-native-heroicons/solid';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarKind, formatDate, formatNumericDate, formatTime, isMultiDay, sameDay } from '../calendar/calendarModel';
import { AccentPresets } from '../constants/colors';
import { Calendar, Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import ElasticPressable from './ElasticPressable';

const ASSIGNMENT_KINDS = new Set([
  CalendarKind.ASSIGNMENT_UPLOADED,
  CalendarKind.ASSIGNMENT_SUBMITTED,
  CalendarKind.ASSIGNMENT_DUE,
]);

export default function EventTooltipModal({ visible, object, timeLabel, onClose, onDownload, onViewFile, onJumpToTime }) {
  const insets = useSafeAreaInsets();
  const { colors, type, t, language, isRTL, motion, effectiveTheme } = usePreferences();
  const [mounted, setMounted] = useState(visible);
  const [currentObject, setCurrentObject] = useState(object);
  const [currentTimeLabel, setCurrentTimeLabel] = useState(timeLabel);
  const [expanded, setExpanded] = useState(false);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const descriptionProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!object) return;
    setCurrentObject(object);
    setCurrentTimeLabel(timeLabel);
    setExpanded(false);
    descriptionProgress.setValue(0);
  }, [object, timeLabel, descriptionProgress]);

  useEffect(() => {
    progress.stopAnimation();
    if (visible) {
      setMounted(true);
      progress.setValue(motion ? 0 : 1);
      if (motion) Animated.spring(progress, { toValue: 1, friction: 7, tension: 120, useNativeDriver: true, isInteraction: false }).start();
    } else if (mounted) {
      if (!motion) { progress.setValue(0); setMounted(false); }
      else Animated.timing(progress, { toValue: 0, duration: Calendar.MODAL_ANIMATION_MS, easing: Easing.in(Easing.back(1.25)), useNativeDriver: true, isInteraction: false }).start(({ finished }) => finished && setMounted(false));
    }
  }, [visible, motion, progress]);

  const shownObject = visible && object ? object : currentObject;
  const shownTimeLabel = visible && object ? timeLabel : currentTimeLabel;
  if ((!mounted && !visible) || !shownObject) return null;
  const assignment = ASSIGNMENT_KINDS.has(shownObject.kind);
  const birthday = shownObject.kind === CalendarKind.BIRTHDAY;
  const dateTime = (value) => value ? `${formatDate(value, language)} · ${formatTime(value, language)}` : t('notAvailable');
  const details = [];
  let eventRange = null;
  if (assignment) {
    const upload = shownObject.rangeMarkerTimes?.start || (shownObject.kind === CalendarKind.ASSIGNMENT_UPLOADED ? shownObject.start : null);
    const due = shownObject.rangeMarkerTimes?.end || (shownObject.kind === CalendarKind.ASSIGNMENT_DUE ? shownObject.start : null);
    const submission = shownObject.submissionDate || (shownObject.kind === CalendarKind.ASSIGNMENT_SUBMITTED ? shownObject.start : null);
    const submissionColor = submission && due
      ? new Date(submission) > new Date(due)
        ? AccentPresets.red[effectiveTheme]
        : new Date(submission) < new Date(due) ? AccentPresets.green[effectiveTheme] : colors.textSecondary
      : colors.textSecondary;
    details.push(
      { label: t('uploadDate'), value: dateTime(upload), Icon: DocumentArrowDownIcon },
      { label: t('dueDate'), value: dateTime(due), Icon: DocumentArrowUpIcon },
      { label: t('submissionDate'), value: dateTime(submission), Icon: DocumentCheckIcon, color: submissionColor },
    );
  } else if (shownObject.kind === CalendarKind.EXAM) {
    details.push({ label: t('eventDate'), value: formatDate(shownObject.start, language) }, { label: t('startEnd'), value: `${formatTime(shownObject.start, language)} – ${formatTime(shownObject.end, language)}` });
  } else if (shownObject.kind === CalendarKind.EVENT) {
    const eventStart = shownObject.rangeMarkerTimes?.start || shownObject.start;
    const eventEnd = shownObject.rangeMarkerTimes?.end || shownObject.end;
    const displayedEnd = shownObject.userCreated || !isMultiDay({ ...shownObject, point: false, start: eventStart, end: eventEnd })
      ? eventEnd
      : new Date(new Date(eventEnd).getTime() - 1);
    eventRange = { start: eventStart, end: displayedEnd };
  } else if (!birthday && shownTimeLabel) details.push({ label: t('startEnd'), value: shownTimeLabel });
  const canJump = !!onJumpToTime && (!shownObject.allDay || (assignment && !!shownObject.rangeMarkerTimes));
  const toggleDescription = () => {
    const next = !expanded;
    setExpanded(next);
    descriptionProgress.stopAnimation();
    if (!motion) { descriptionProgress.setValue(next ? 1 : 0); return; }
    Animated.spring(descriptionProgress, { toValue: next ? 1 : 0, friction: 8, tension: 115, overshootClamping: !next, useNativeDriver: false, isInteraction: false }).start();
  };
  return (
    <Modal visible={mounted || visible} transparent animationType="none" presentationStyle="overFullScreen" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.layer}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: progress }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('close')} />
        <Animated.View style={[styles.card, {
          marginTop: insets.top + Spacing.lg,
          marginBottom: insets.bottom + Spacing.lg,
          backgroundColor: colors.card,
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [Calendar.MODAL_POP_TRANSLATE, 0] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
          ],
        }]}> 
          <View style={[styles.cardHeader, isRTL ? styles.cardHeaderCloseLeft : styles.cardHeaderCloseRight]}>
            <ElasticPressable shape="circle" style={[styles.close, isRTL ? styles.closeLeft : styles.closeRight]} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('close')}>
              <View style={[styles.closeCircle, { backgroundColor: colors.cardButton }]}><XMarkIcon size={19} color={colors.textPrimary} /></View>
            </ElasticPressable>
            <Text style={[styles.title, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(18, 'bold', 23)]}>{shownObject.title}</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {details.map(({ label, value, Icon, color }) => <View key={label} style={[styles.detailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}><View style={[styles.detailLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>{Icon && <Icon size={18} color={colors.textMuted} />}<Text style={[styles.detailLabel, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }, type(12, 'bold', 16)]}>{label}</Text></View><Text style={[styles.detailValue, { color: color || colors.textSecondary, textAlign: isRTL ? 'left' : 'right' }, type(12, 'bold', 16)]}>{value}</Text></View>)}
            {eventRange && (() => {
              const dateUnchanged = sameDay(eventRange.start, eventRange.end);
              const timeUnchanged = eventRange.start.getHours() === eventRange.end.getHours()
                && eventRange.start.getMinutes() === eventRange.end.getMinutes();
              const dateColor = dateUnchanged ? colors.textMuted : colors.textPrimary;
              const timeColor = timeUnchanged ? colors.textMuted : colors.textPrimary;
              return (
                <View style={[styles.eventRange, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={styles.eventRangeSide}>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.eventRangeDate, { color: dateColor }, type(13, 'bold', 17)]}>{formatNumericDate(eventRange.start)}</Text>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.eventRangeTime, { color: timeColor }, type(13, 'bold', 17)]}>{formatTime(eventRange.start, language)}</Text>
                  </View>
                  <Text style={[styles.eventRangeDash, { color: colors.textMuted }, type(15, 'bold', 18)]}>–</Text>
                  <View style={styles.eventRangeSide}>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.eventRangeDate, { color: dateColor }, type(13, 'bold', 17)]}>{formatNumericDate(eventRange.end)}</Text>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.eventRangeTime, { color: timeColor }, type(13, 'bold', 17)]}>{formatTime(eventRange.end, language)}</Text>
                  </View>
                </View>
              );
            })()}
            {!!shownObject.description && (
              <>
                <Animated.View style={[styles.descriptionClip, { maxHeight: descriptionProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 180], extrapolate: 'clamp' }), opacity: descriptionProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ scaleY: descriptionProgress }] }]}><Text style={[styles.description, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }, type(14, 'regular', 20)]}>{shownObject.description}</Text></Animated.View>
                <ElasticPressable shape="pill" onPress={toggleDescription}>
                  <Text style={[styles.expand, { color: colors.accent, textAlign: isRTL ? 'right' : 'left' }, type(12, 'bold', 16)]}>{t(expanded ? 'collapseDescription' : 'expandDescription')}</Text>
                </ElasticPressable>
              </>
            )}
            <View style={styles.actions}>
              {assignment && shownObject.attachment && (
                <>
                <ElasticPressable style={styles.actionSlot} shape="pill" onPress={() => onDownload?.(shownObject)} accessibilityRole="button" accessibilityLabel={t('downloadAssignment')}>
                  <View style={[styles.actionButton, { backgroundColor: colors.accent }]}><ArrowDownTrayIcon size={16} color={colors.background} /><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.actionText, { color: colors.white }, type(11, 'bold', 14)]}>{t('download')}</Text></View>
                </ElasticPressable>
                <ElasticPressable style={styles.actionSlot} shape="pill" onPress={() => onViewFile?.(shownObject)} accessibilityRole="button" accessibilityLabel={t('viewFile')}>
                  <View style={[styles.actionButton, { backgroundColor: colors.cardButton }]}><DocumentTextIcon size={16} color={colors.accent} /><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.actionText, { color: colors.textPrimary }, type(11, 'bold', 14)]}>{t('viewFile')}</Text></View>
                </ElasticPressable>
                </>
              )}
              {canJump && <ElasticPressable style={styles.actionSlot} shape="pill" onPress={() => onJumpToTime(shownObject)} accessibilityRole="button" accessibilityLabel={t('jumpToTime')}><View style={[styles.actionButton, { backgroundColor: colors.cardButton }]}><ClockIcon size={16} color={colors.accent} /><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.actionText, { color: colors.textPrimary }, type(11, 'bold', 14)]}>{t('jumpToTime')}</Text></View></ElasticPressable>}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  layer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg },
  card: { width: '100%', maxWidth: 380, maxHeight: '82%', borderRadius: Radius.lg, overflow: 'hidden' },
  cardHeader: { minHeight: 50, justifyContent: 'center', paddingTop: Spacing.sm },
  cardHeaderCloseLeft: { paddingLeft: 52, paddingRight: Spacing.md },
  cardHeaderCloseRight: { paddingLeft: Spacing.md, paddingRight: 52 },
  close: { position: 'absolute', top: Spacing.sm, zIndex: 2 },
  closeLeft: { left: Spacing.sm },
  closeRight: { right: Spacing.sm },
  closeCircle: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, paddingTop: Spacing.xs },
  title: { width: '100%' },
  detailRow: { alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, marginTop: 7 },
  detailLabelGroup: { flexShrink: 0, alignItems: 'center', gap: 6 },
  detailLabel: { flexShrink: 0 },
  detailValue: { flex: 1 },
  eventRange: { alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, paddingHorizontal: 2 },
  eventRangeSide: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 2 },
  eventRangeDate: { textAlign: 'center', includeFontPadding: false },
  eventRangeTime: { textAlign: 'center', includeFontPadding: false },
  eventRangeDash: { alignSelf: 'center', includeFontPadding: false, marginTop: -1 },
  descriptionClip: { overflow: 'hidden', transformOrigin: 'top' },
  description: { marginTop: Spacing.sm },
  expand: { marginTop: Spacing.sm, paddingVertical: Spacing.xs },
  // Keep the action order explicit through the JSX order. `direction` is not
  // a React Native style; writingDirection is the portable equivalent.
  actions: { alignSelf: 'stretch', writingDirection: 'ltr', flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'flex-start', gap: 6, marginTop: Spacing.md },
  actionSlot: { flex: 1, minWidth: 0 },
  actionButton: { minHeight: 36, borderRadius: Radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 7, overflow: 'hidden' },
  actionText: { flexShrink: 1, textAlign: 'center' },
});
