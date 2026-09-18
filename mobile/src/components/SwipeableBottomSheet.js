/** Reusable bottom sheet with a hinge handle and finger-tracked dismissal. */
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Radius, Spacing, TabBar } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';

export default function SwipeableBottomSheet({ visible, title, onClose, children, sheetStyle }) {
  const insets = useSafeAreaInsets();
  const { colors, type, motion } = usePreferences();
  const [mounted, setMounted] = useState(visible);
  const [displayTitle, setDisplayTitle] = useState(title);
  const mountedRef = useRef(visible);
  const onCloseRef = useRef(onClose);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const dragStart = useRef(0);
  const sheetHeight = useRef(420);
  const closing = useRef(false);
  onCloseRef.current = onClose;

  const closeAnimated = useCallback((notify) => {
    if (closing.current) return;
    closing.current = true;
    const target = Math.max(sheetHeight.current + 36, 460);
    Animated.parallel([
      Animated.timing(dragY, { toValue: target, duration: motion ? 180 : 0, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false }),
      Animated.timing(progress, { toValue: 0, duration: motion ? 105 : 0, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }),
    ]).start(({ finished }) => {
      if (!finished) return;
      mountedRef.current = false;
      setMounted(false);
      closing.current = false;
      if (notify) onCloseRef.current();
    });
  }, [dragY, motion, progress]);

  useLayoutEffect(() => {
    if (visible) {
      closing.current = false;
      if (!mountedRef.current) {
        mountedRef.current = true;
        setMounted(true);
      }
      setDisplayTitle(title);
      dragY.setValue(0);
      progress.stopAnimation();
      progress.setValue(motion ? 0 : 1);
      if (motion) Animated.spring(progress, { toValue: 1, stiffness: 330, damping: 28, mass: 0.62, useNativeDriver: true, isInteraction: false }).start();
    } else if (mountedRef.current && !closing.current) closeAnimated(false);
  }, [closeAnimated, dragY, motion, progress, title, visible]);

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 0,
    onPanResponderGrant: () => dragY.stopAnimation((value) => { dragStart.current = value; }),
    onPanResponderMove: (_, gesture) => dragY.setValue(Math.max(0, dragStart.current + gesture.dy)),
    onPanResponderRelease: (_, gesture) => {
      const current = Math.max(0, dragStart.current + gesture.dy);
      if (current > 78 || gesture.vy > 0.72) closeAnimated(true);
      else Animated.spring(dragY, { toValue: 0, friction: 10, tension: 180, useNativeDriver: true, isInteraction: false }).start();
    },
    onPanResponderTerminate: () => Animated.spring(dragY, { toValue: 0, friction: 10, tension: 180, useNativeDriver: true, isInteraction: false }).start(),
  }), [closeAnimated, dragY]);

  if (!mounted && !visible) return null;
  const baseTranslate = progress.interpolate({ inputRange: [0, 1], outputRange: [420, 0] });
  return (
    <Modal visible={mounted || visible} transparent animationType="none" presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent hardwareAccelerated onRequestClose={() => closeAnimated(true)}>
      <View style={styles.root}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: progress }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={() => closeAnimated(true)} />
        <Animated.View
          onLayout={(event) => { sheetHeight.current = event.nativeEvent.layout.height; }}
          style={[styles.sheet, sheetStyle, { paddingBottom: insets.bottom + TabBar.PILL_MARGIN_BOTTOM + Spacing.md, backgroundColor: colors.card, opacity: progress, transform: [{ translateY: Animated.add(baseTranslate, dragY) }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }] }]}
        >
          <View style={styles.handleHit} {...pan.panHandlers}><View style={[styles.handle, { backgroundColor: colors.track }]} /></View>
          {!!displayTitle && <Text numberOfLines={2} style={[styles.title, { color: colors.textPrimary }, type(19, 'bold', 24)]}>{displayTitle}</Text>}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '82%', borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, paddingHorizontal: Spacing.md },
  handleHit: { height: 28, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 44, height: 5, borderRadius: Radius.pill },
  title: { textAlign: 'center', marginBottom: Spacing.md },
});
