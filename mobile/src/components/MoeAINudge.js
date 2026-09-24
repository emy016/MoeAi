/**
 * A message from MoeAI on Home, before the student has asked anything:
 * "Let's go" opens the right lecture chat with MoeAI already answering.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SparklesIcon } from 'react-native-heroicons/solid';
import ElasticPressable from './ElasticPressable';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';

export default function MoeAINudge({ nudge, onAccept, onDismiss }) {
  const { colors, type, t, isRTL, motion } = usePreferences();
  const enter = useRef(new Animated.Value(motion ? 0 : 1)).current;
  useEffect(() => {
    if (!nudge || !motion) { enter.setValue(1); return undefined; }
    enter.setValue(0);
    const animation = Animated.timing(enter, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [enter, motion, nudge?.id]);
  if (!nudge) return null;
  const row = { flexDirection: isRTL ? 'row-reverse' : 'row' };
  return (
    <Animated.View style={[styles.card, { backgroundColor: colors.card, opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}
      accessibilityRole="summary" accessibilityLabel={`MoeAI: ${nudge.body}`}>
      <View style={[styles.head, row]}>
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}><SparklesIcon size={15} color="#fff" /></View>
        <Text style={[{ color: colors.textMuted }, type(11, 'bold', 14)]}>MoeAI</Text>
      </View>
      <Text style={[{ color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(14, 'regular', 20)]}>{nudge.body}</Text>
      <View style={[styles.actions, row]}>
        <ElasticPressable shape="pill" onPress={() => onAccept(nudge)} accessibilityRole="button">
          <View style={[styles.button, { backgroundColor: colors.accent }]}><Text style={[{ color: '#fff' }, type(12, 'bold', 16)]}>{t('nudgeGo')}</Text></View>
        </ElasticPressable>
        <ElasticPressable shape="pill" onPress={() => onDismiss(nudge)} accessibilityRole="button">
          <View style={[styles.button, { backgroundColor: colors.cardButton }]}><Text style={[{ color: colors.textSecondary }, type(12, 'bold', 16)]}>{t('nudgeLater')}</Text></View>
        </ElasticPressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, gap: 8 },
  head: { alignItems: 'center', gap: 8 },
  avatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actions: { gap: 8, marginTop: 2 },
  button: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999 },
});
