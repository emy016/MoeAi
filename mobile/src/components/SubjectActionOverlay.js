/** Bouncy rename/delete pill positioned over a long-pressed user subject. */
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import { PencilIcon, TrashIcon } from 'react-native-heroicons/solid';
import { Radius } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import ElasticPressable from './ElasticPressable';

export default function SubjectActionOverlay({ visible, anchor, onClose, onRename, onDelete }) {
  const { colors, motion } = usePreferences();
  const [mounted, setMounted] = useState(visible);
  const mountedRef = useRef(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useLayoutEffect(() => {
    progress.stopAnimation();
    if (visible) {
      if (!mountedRef.current) {
        mountedRef.current = true;
        setMounted(true);
      }
      progress.setValue(motion ? 0 : 1);
      if (motion) Animated.spring(progress, { toValue: 1, friction: 7, tension: 155, useNativeDriver: true, isInteraction: false }).start();
    } else if (mountedRef.current) {
      Animated.timing(progress, { toValue: 0, duration: motion ? 110 : 0, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }).start(({ finished }) => {
        if (!finished) return;
        mountedRef.current = false;
        setMounted(false);
      });
    }
  }, [motion, progress, visible]);

  const closeAnd = useCallback((action) => { onClose(); requestAnimationFrame(action); }, [onClose]);
  if (!mounted && !visible) return null;
  const top = Math.max(8, (anchor?.y || 0) + 7);
  const right = Math.max(8, (anchor?.screenWidth || 400) - ((anchor?.x || 0) + (anchor?.width || 0)) + 7);
  return (
    <Modal visible={mounted || visible} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} onTouchMove={onClose} />
      <Animated.View style={[styles.pill, { top, right, backgroundColor: colors.cardButton, opacity: progress, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.68, 1] }) }] }]}> 
        <ElasticPressable shape="circle" onPress={() => closeAnd(onRename)}><View style={styles.action}><PencilIcon size={18} color={colors.textPrimary} /></View></ElasticPressable>
        <ElasticPressable shape="circle" onPress={() => closeAnd(onDelete)}><View style={styles.action}><TrashIcon size={18} color={colors.danger} /></View></ElasticPressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pill: { position: 'absolute', flexDirection: 'row', borderRadius: Radius.pill, padding: 4, gap: 2 },
  action: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
