/** Shared subject rename/create and lecture/chat creation modal. */
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { PaperClipIcon } from 'react-native-heroicons/solid';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import ElasticPressable from './ElasticPressable';

export default function SubjectEditorModal({ visible, title, initialValue = '', placeholder, allowFiles = false, onCancel, onConfirm }) {
  const { colors, type, t, motion, isRTL } = usePreferences();
  const [mounted, setMounted] = useState(visible);
  const [name, setName] = useState(initialValue);
  const [files, setFiles] = useState([]);
  const [displayTitle, setDisplayTitle] = useState(title);
  const mountedRef = useRef(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useLayoutEffect(() => {
    progress.stopAnimation();
    if (visible) {
      if (!mountedRef.current) {
        mountedRef.current = true;
        setMounted(true);
      }
      setDisplayTitle(title);
      setName(initialValue);
      setFiles([]);
      progress.setValue(motion ? 0 : 1);
      if (motion) Animated.spring(progress, { toValue: 1, stiffness: 340, damping: 28, mass: 0.62, useNativeDriver: true, isInteraction: false }).start();
    } else if (mountedRef.current) {
      Animated.timing(progress, { toValue: 0, duration: motion ? 120 : 0, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }).start(({ finished }) => {
        if (!finished) return;
        mountedRef.current = false;
        setMounted(false);
      });
    }
  }, [initialValue, motion, progress, title, visible]);

  const pickFiles = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (result.canceled) return;
    setFiles(result.assets.map((file) => ({ id: `${file.name}-${file.size || 0}-${file.uri}`, name: file.name, uri: file.uri, mimeType: file.mimeType || null, size: file.size || null })));
  }, []);
  const submit = useCallback(() => {
    const clean = name.trim();
    if (clean) onConfirm({ name: clean, files });
  }, [files, name, onConfirm]);

  if (!mounted && !visible) return null;
  return (
    <Modal visible={mounted || visible} transparent animationType="none" presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent hardwareAccelerated onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: progress }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <Animated.View style={[styles.card, { backgroundColor: colors.card, opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }]}> 
          <Text style={[{ color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(19, 'bold', 24)]}>{displayTitle}</Text>
          <TextInput
            autoFocus
            value={name}
            onChangeText={setName}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.accent}
            style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.cardButton, textAlign: isRTL ? 'right' : 'left' }, type(15, 'regular', 20)]}
            maxLength={100}
          />
          {allowFiles && (
            <>
              <ElasticPressable shape="pill" onPress={pickFiles} accessibilityRole="button">
                <View style={[styles.uploadButton, { backgroundColor: colors.cardButton, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <PaperClipIcon size={19} color={colors.accent} />
                  <Text style={[{ color: colors.textPrimary }, type(13, 'bold', 17)]}>{t('uploadFiles')}</Text>
                </View>
              </ElasticPressable>
              {!!files.length && <ScrollView style={styles.files} nestedScrollEnabled>{files.map((file) => <Text key={file.id} numberOfLines={1} style={[styles.fileName, { color: colors.textMuted }, type(11, 'regular', 15)]}>{file.name}</Text>)}</ScrollView>}
            </>
          )}
          <View style={[styles.actions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <ElasticPressable shape="pill" style={styles.action} onPress={onCancel}><View style={[styles.button, { backgroundColor: colors.cardButton }]}><Text style={[{ color: colors.textPrimary }, type(13, 'bold', 17)]}>{t('cancel')}</Text></View></ElasticPressable>
            <ElasticPressable shape="pill" style={styles.action} onPress={submit} disabled={!name.trim()}><View style={[styles.button, { backgroundColor: colors.accent, opacity: name.trim() ? 1 : 0.45 }]}><Text style={[{ color: colors.white }, type(13, 'bold', 17)]}>{t('confirm')}</Text></View></ElasticPressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: Spacing.lg },
  card: { borderRadius: Radius.lg, padding: Spacing.lg },
  input: { minHeight: 48, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10, marginTop: Spacing.md },
  uploadButton: { minHeight: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: Spacing.sm },
  files: { maxHeight: 72, marginTop: Spacing.sm },
  fileName: { paddingVertical: 2 },
  actions: { gap: Spacing.sm, marginTop: Spacing.lg },
  action: { flex: 1 },
  button: { minHeight: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
