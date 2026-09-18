/** Full-screen, message-scoped attachment preview with an optional carousel. */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeftIcon, ChevronRightIcon, DocumentIcon, XMarkIcon } from 'react-native-heroicons/solid';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import ElasticPressable from './ElasticPressable';

const isImage = (item) => item?.kind === 'image' || item?.mimeType?.startsWith('image/');

export default function ChatAttachmentPreview({ visible, attachments = [], initialIndex = 0, onClose }) {
  const insets = useSafeAreaInsets();
  const { colors, type, motion } = usePreferences();
  const [index, setIndex] = useState(initialIndex);
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    setIndex(Math.max(0, Math.min(initialIndex, attachments.length - 1)));
    progress.setValue(motion ? 0 : 1);
    if (motion) Animated.spring(progress, { toValue: 1, stiffness: 330, damping: 27, mass: 0.62, useNativeDriver: true, isInteraction: false }).start();
  }, [attachments.length, initialIndex, motion, progress, visible]);
  if (!visible || !attachments.length) return null;
  const item = attachments[index];
  const close = () => Animated.timing(progress, { toValue: 0, duration: motion ? 110 : 0, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }).start(() => onClose?.());
  return (
    <Modal visible transparent animationType="none" presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
      <Animated.View style={[styles.root, { backgroundColor: colors.overlay, opacity: progress }]}> 
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={[styles.top, { paddingTop: insets.top + 10 }]}><ElasticPressable shape="circle" onPress={close}><View style={[styles.round, { backgroundColor: colors.card }]}><XMarkIcon size={22} color={colors.textPrimary} /></View></ElasticPressable></View>
        <Animated.View onStartShouldSetResponder={() => true} style={[styles.stage, { transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}> 
          {isImage(item) ? <Image source={{ uri: item.uri }} resizeMode="contain" style={styles.image} /> : <View style={[styles.fileCard, { backgroundColor: colors.card }]}><DocumentIcon size={48} color={colors.accent} /><Text numberOfLines={3} style={[styles.fileText, { color: colors.textPrimary }, type(14, 'bold', 19)]}>{item.name}</Text></View>}
        </Animated.View>
        {attachments.length > 1 && <><View style={styles.left}><ElasticPressable shape="circle" onPress={() => setIndex((index - 1 + attachments.length) % attachments.length)}><View style={[styles.round, { backgroundColor: colors.card }]}><ChevronLeftIcon size={22} color={colors.textPrimary} /></View></ElasticPressable></View><View style={styles.right}><ElasticPressable shape="circle" onPress={() => setIndex((index + 1) % attachments.length)}><View style={[styles.round, { backgroundColor: colors.card }]}><ChevronRightIcon size={22} color={colors.textPrimary} /></View></ElasticPressable></View></>}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  top: { position: 'absolute', top: 0, right: Spacing.md, zIndex: 3 },
  stage: { width: '78%', height: '70%', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%', borderRadius: Radius.lg },
  fileCard: { minWidth: 210, maxWidth: '100%', minHeight: 170, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: Spacing.md },
  fileText: { textAlign: 'center' },
  left: { position: 'absolute', left: Spacing.md }, right: { position: 'absolute', right: Spacing.md },
  round: { width: 42, height: 42, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
