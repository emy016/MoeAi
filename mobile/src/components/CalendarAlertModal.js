/** Small bottom modal used for validation warnings and delete confirmation. */
import React, { useLayoutEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Radius, Spacing, TabBar } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import ElasticPressable from './ElasticPressable';

export default function CalendarAlertModal({ visible, title, message, onClose, onConfirm, destructive = false }) {
  const insets = useSafeAreaInsets();
  const { colors, type, t, motion, isRTL } = usePreferences();
  const [mounted, setMounted] = useState(visible);
  const [content, setContent] = useState(() => ({ title, message }));
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useLayoutEffect(() => {
    progress.stopAnimation();
    if (visible) {
      setMounted(true);
      setContent({ title, message });
      progress.setValue(motion ? 0 : 1);
      if (motion) Animated.spring(progress, { toValue: 1, friction: 9, tension: 125, useNativeDriver: true, isInteraction: false }).start();
    } else if (mounted) {
      if (!motion) { progress.setValue(0); setMounted(false); }
      else Animated.timing(progress, { toValue: 0, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }).start(({ finished }) => finished && setMounted(false));
    }
  }, [visible, title, message, motion, progress]);

  if (!mounted && !visible) return null;
  return (
    <Modal visible={mounted || visible} transparent animationType="none" presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent hardwareAccelerated onRequestClose={onClose}>
      <View style={styles.layer}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: progress }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.card, { marginBottom: insets.bottom + TabBar.PILL_MARGIN_BOTTOM, backgroundColor: colors.card, opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}> 
          <Text style={[{ color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(18, 'bold', 23)]}>{content.title}</Text>
          {!!content.message && <Text style={[styles.message, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }, type(13, 'regular', 18)]}>{content.message}</Text>}
          <View style={styles.actions}>
            {!!onConfirm && <ElasticPressable shape="pill" style={styles.action} onPress={onClose}><View style={[styles.button, { backgroundColor: colors.cardButton }]}><Text style={[{ color: colors.textPrimary }, type(13, 'bold', 17)]}>{t('cancel')}</Text></View></ElasticPressable>}
            <ElasticPressable shape="pill" style={styles.action} onPress={onConfirm || onClose}><View style={[styles.button, { backgroundColor: destructive ? colors.danger : colors.accent }]}><Text style={[{ color: colors.white }, type(13, 'bold', 17)]}>{onConfirm ? t('delete') : t('ok')}</Text></View></ElasticPressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  layer: { flex: 1, justifyContent: 'flex-end' },
  card: { marginHorizontal: Spacing.md, borderRadius: Radius.lg, padding: Spacing.lg },
  message: { marginTop: Spacing.sm },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  action: { flex: 1 },
  button: { minHeight: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
