/** Calendar event editor with nested start/end date-time selection. */
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ClockIcon } from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDate, formatTime, startOfDay } from '../calendar/calendarModel';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import CalendarAlertModal from './CalendarAlertModal';
import DateTimePickerModal from './DateTimePickerModal';
import ElasticPressable from './ElasticPressable';

function nextTenMinutes(day) {
  const now = new Date();
  const minute = now.getMinutes();
  const rounded = minute % 10 === 0 ? minute : minute + (10 - (minute % 10));
  const result = startOfDay(day || now);
  result.setHours(now.getHours(), rounded, 0, 0);
  return result;
}

const DateTimeField = React.memo(function DateTimeField({ label, value, onPress }) {
  const { colors, type, language, isRTL } = usePreferences();
  return (
    <View style={styles.fieldColumn}>
      <Text style={[{ color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }, type(12, 'bold', 16)]}>{label}</Text>
      <ElasticPressable shape="pill" onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label} ${formatTime(value, language)}`}>
        <View style={[styles.timeButton, { backgroundColor: colors.cardButton }]}> 
          <ClockIcon size={17} color={colors.accent} />
          <Text numberOfLines={1} style={[{ color: colors.textPrimary }, type(15, 'bold', 19)]}>{formatTime(value, language)}</Text>
        </View>
      </ElasticPressable>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.date, { color: colors.textMuted }, type(11, 'regular', 14)]}>{formatDate(value, language)}</Text>
    </View>
  );
});

export default function EventEditorModal({ visible, initialDate, onCancel, onSave }) {
  const insets = useSafeAreaInsets();
  const { colors, type, t, motion, isRTL } = usePreferences();
  const [mounted, setMounted] = useState(visible);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(() => nextTenMinutes(initialDate));
  const [end, setEnd] = useState(() => new Date(nextTenMinutes(initialDate).getTime() + 60 * 60 * 1000));
  const [activeField, setActiveField] = useState(null);
  const [warning, setWarning] = useState(null);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useLayoutEffect(() => {
    progress.stopAnimation();
    if (visible) {
      const nextStart = nextTenMinutes(initialDate);
      setMounted(true);
      setTitle('');
      setStart(nextStart);
      setEnd(new Date(nextStart.getTime() + 60 * 60 * 1000));
      setActiveField(null);
      setWarning(null);
      progress.setValue(motion ? 0 : 1);
      if (motion) Animated.spring(progress, { toValue: 1, stiffness: 340, damping: 29, mass: 0.62, useNativeDriver: true, isInteraction: false }).start();
    } else if (mounted) {
      if (!motion) { progress.setValue(0); setMounted(false); }
      else Animated.timing(progress, { toValue: 0, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }).start(({ finished }) => finished && setMounted(false));
    }
  }, [visible, initialDate, motion, progress]);

  const pickerTitle = activeField === 'start' ? t('selectStartingTime') : t('selectEndingTime');
  const pickerValue = activeField === 'start' ? start : end;
  const savePicker = useCallback((next) => {
    const invalid = activeField === 'start' ? next >= end : next <= start;
    if (invalid) {
      setWarning({ title: t('invalidTimeRange'), message: t('endAfterStart') });
      return false;
    }
    if (activeField === 'start') setStart(next);
    else setEnd(next);
    return true;
  }, [activeField, end, start, t]);
  const done = useCallback(() => {
    if (!title.trim()) { setWarning({ title: t('eventTitleRequired'), message: t('eventTitleRequiredDesc') }); return; }
    if (end <= start) { setWarning({ title: t('invalidTimeRange'), message: t('endAfterStart') }); return; }
    onSave({ title, start, end });
  }, [end, onSave, start, t, title]);
  const openStart = useCallback(() => setActiveField('start'), []);
  const openEnd = useCallback(() => setActiveField('end'), []);
  const direction = useMemo(() => ({ flexDirection: isRTL ? 'row-reverse' : 'row' }), [isRTL]);

  if (!mounted && !visible) return null;
  return (
    <>
      <Modal visible={mounted || visible} transparent animationType="none" presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent hardwareAccelerated onRequestClose={onCancel}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.layer}>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: progress }]} />
          <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
          <Animated.View style={[styles.card, { marginTop: insets.top + Spacing.lg, marginBottom: insets.bottom + Spacing.lg, backgroundColor: colors.card, opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}> 
            <Text style={[{ color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(20, 'bold', 25)]}>{t('newEvent')}</Text>
            <Text style={[styles.inputLabel, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }, type(12, 'bold', 16)]}>{t('title')}</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('eventTitlePlaceholder')}
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.accent}
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.cardButton, textAlign: isRTL ? 'right' : 'left' }, type(15, 'regular', 20)]}
              maxLength={100}
            />
            <View style={[styles.fields, direction]}>
              <DateTimeField label={t('start')} value={start} onPress={openStart} />
              <DateTimeField label={t('end')} value={end} onPress={openEnd} />
            </View>
            <View style={styles.footer}>
              <ElasticPressable shape="pill" style={styles.footerButton} onPress={onCancel}><View style={[styles.secondaryButton, { backgroundColor: colors.cardButton }]}><Text style={[{ color: colors.textPrimary }, type(13, 'bold', 17)]}>{t('cancel')}</Text></View></ElasticPressable>
              <ElasticPressable shape="pill" style={styles.footerButton} onPress={done}><View style={[styles.primaryButton, { backgroundColor: colors.accent }]}><Text style={[{ color: colors.white }, type(13, 'bold', 17)]}>{t('done')}</Text></View></ElasticPressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
      <DateTimePickerModal visible={!!activeField} title={pickerTitle} value={pickerValue} onCancel={() => setActiveField(null)} onConfirm={savePicker} />
      <CalendarAlertModal visible={!!warning} title={warning?.title} message={warning?.message} onClose={() => setWarning(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  layer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg },
  card: { width: '100%', maxWidth: 410, borderRadius: Radius.lg, padding: Spacing.lg },
  inputLabel: { marginTop: Spacing.lg, marginBottom: 6 },
  input: { minHeight: 48, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10 },
  fields: { gap: Spacing.sm, marginTop: Spacing.lg },
  fieldColumn: { flex: 1, minWidth: 0 },
  timeButton: { minHeight: 46, borderRadius: Radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6, paddingHorizontal: 8 },
  date: { textAlign: 'center', marginTop: 6 },
  footer: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl },
  footerButton: { flex: 1 },
  secondaryButton: { minHeight: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { minHeight: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
