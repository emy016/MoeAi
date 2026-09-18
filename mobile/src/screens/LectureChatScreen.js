/** Full-screen local lecture chat with an overlaid 75%-width history drawer. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Bars3Icon, CameraIcon, DocumentIcon, MicrophoneIcon, PaperAirplaneIcon, PaperClipIcon, PencilIcon, PencilSquareIcon, PhotoIcon, PlusIcon, XMarkIcon } from 'react-native-heroicons/solid';
import { ClipboardDocumentIcon } from 'react-native-heroicons/outline';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useHoldToDictate from '../chat/useHoldToDictate';
import ChatAttachmentPreview from '../components/ChatAttachmentPreview';
import ElasticPressable from '../components/ElasticPressable';
import ProfileMenu from '../components/ProfileMenu';
import ProfilePill from '../components/ProfilePill';
import SolidPinIcon from '../components/SolidPinIcon';
import SubjectEditorModal from '../components/SubjectEditorModal';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';

const normalizeFile = (file) => ({
  id: `${file.name}-${file.size || 0}-${file.uri}`,
  name: file.name,
  uri: file.uri,
  mimeType: file.mimeType || null,
  size: file.size || null,
  kind: file.mimeType?.startsWith('image/') ? 'image' : 'file',
});

const normalizeImage = (asset) => ({
  id: `${asset.fileName || 'image'}-${asset.fileSize || 0}-${asset.uri}`,
  name: asset.fileName || `image-${Date.now()}.jpg`,
  uri: asset.uri,
  mimeType: asset.mimeType || 'image/jpeg',
  size: asset.fileSize || null,
  width: asset.width || null,
  height: asset.height || null,
  kind: 'image',
});
const imageFile = (file) => file?.kind === 'image' || file?.mimeType?.startsWith('image/');
const fileExtension = (name = '') => name.includes('.') ? name.split('.').pop().slice(0, 4).toUpperCase() : 'FILE';

const ChatBubble = React.memo(function ChatBubble({ message, onPreview, onCopy }) {
  const { colors, type, isRTL, motion } = usePreferences();
  const user = message.role === 'user';
  const progress = useRef(new Animated.Value(motion ? 0 : 1)).current;
  useEffect(() => {
    if (!motion) { progress.setValue(1); return undefined; }
    progress.setValue(0);
    const animation = user
      ? Animated.timing(progress, { toValue: 1, duration: 170, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false })
      : Animated.sequence([
        Animated.delay(70),
        Animated.spring(progress, { toValue: 1, stiffness: 390, damping: 25, mass: 0.55, useNativeDriver: true, isInteraction: false }),
      ]);
    animation.start();
    return () => animation.stop();
  }, [motion, progress, user]);
  return (
    <Animated.View style={[styles.messageRow, user ? styles.userRow : styles.assistantRow, { opacity: progress, transform: user
      ? [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }]
      : [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.84, 1] }) }] }] }>
      <View style={styles.messageColumn}>
        {!user && <Text style={[styles.aiLabel, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }, type(10, 'bold', 13)]}>MoeAI</Text>}
        <View style={[styles.bubble, user ? { backgroundColor: colors.accent, borderBottomRightRadius: 5 } : { backgroundColor: colors.cardButton, borderBottomLeftRadius: 5 }]}>
          {!!message.files?.length && <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} style={styles.sentAttachmentScroll} contentContainerStyle={styles.sentAttachments}>{message.files.map((file, index) => imageFile(file) ? (
            <Pressable key={file.id || file.name} onPress={() => onPreview(message.files, index)}><Image source={{ uri: file.uri }} style={styles.sentImage} /></Pressable>
          ) : (
            <Pressable key={file.id || file.name} onPress={() => onPreview(message.files, index)} style={[styles.fileChip, { backgroundColor: user ? 'rgba(255,255,255,0.16)' : colors.card, flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
              <View style={styles.fileType}><DocumentIcon size={16} color={user ? colors.white : colors.accent} /><Text style={[{ color: user ? colors.white : colors.accent }, type(7, 'bold', 9)]}>{fileExtension(file.name)}</Text></View>
              <Text numberOfLines={1} style={[styles.fileName, { color: user ? colors.white : colors.textPrimary }, type(11, 'semiBold', 15)]}>{file.name}</Text>
            </Pressable>
          ))}</ScrollView>}
          {!!message.text && <Text style={[message.files?.length && styles.messageAfterFiles, { color: user ? colors.white : colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(14, 'regular', 20)]}>{message.text}</Text>}
          {!user && message.pending && !message.text && <TypingDots color={colors.textMuted} motion={motion} />}
        </View>
        {!user && !!message.text && !message.pending && <Pressable hitSlop={9} onPress={() => onCopy(message.text)} style={styles.copyButton} accessibilityRole="button"><ClipboardDocumentIcon size={17} color={colors.textMuted} /></Pressable>}
      </View>
    </Animated.View>
  );
});

function ChatActionPill({ pinned, onRename, onTogglePin }) {
  const { colors, motion, t } = usePreferences();
  const progress = useRef(new Animated.Value(motion ? 0 : 1)).current;
  useEffect(() => {
    if (!motion) { progress.setValue(1); return undefined; }
    const animation = Animated.spring(progress, { toValue: 1, friction: 7, tension: 165, useNativeDriver: true, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [motion, progress]);
  return (
    <Animated.View style={[styles.chatActions, { backgroundColor: colors.cardButtonPressed, opacity: progress, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }]}> 
      <ElasticPressable shape="circle" onPress={onRename} accessibilityRole="button" accessibilityLabel={t('renameChat')}>
        <View style={styles.chatAction}><PencilIcon size={17} color={colors.textPrimary} /></View>
      </ElasticPressable>
      <ElasticPressable shape="circle" onPress={onTogglePin} accessibilityRole="button" accessibilityLabel={pinned ? t('unpinChat') : t('pinChat')}>
        <View style={styles.chatAction}><SolidPinIcon size={18} color={pinned ? colors.accent : colors.textPrimary} /></View>
      </ElasticPressable>
    </Animated.View>
  );
}

/** Three dots, breathing in sequence, while the first token is still on its way. */
const TypingDots = React.memo(function TypingDots({ color, motion }) {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];
  useEffect(() => {
    if (!motion) return undefined;
    const animations = dots.map((dot, index) => Animated.loop(Animated.sequence([
      Animated.delay(index * 160),
      Animated.timing(dot, { toValue: 1, duration: 340, useNativeDriver: true, isInteraction: false }),
      Animated.timing(dot, { toValue: 0.3, duration: 340, useNativeDriver: true, isInteraction: false }),
      Animated.delay((2 - index) * 160),
    ])));
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motion]);
  return (
    <View style={styles.typingRow}>
      {dots.map((dot, index) => (
        <Animated.View key={index} style={[styles.typingDot, { backgroundColor: color, opacity: dot }]} />
      ))}
    </View>
  );
});

export default function LectureChatScreen({ visible, subject, lecture, threads, onClose, onStartChat, onSend, onRenameChat, onTogglePinChat, onProfileSelect }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors, type, t, motion, isRTL, language } = usePreferences();
  const [mounted, setMounted] = useState(visible);
  const mountedRef = useRef(visible);
  const [threadId, setThreadId] = useState(null);
  const [draft, setDraft] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [actionThreadId, setActionThreadId] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [micHeld, setMicHeld] = useState(false);
  const [navigatorUnlocked, setNavigatorUnlocked] = useState(false);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const screenProgress = useRef(new Animated.Value(visible && !motion ? 1 : 0)).current;
  const drawerProgress = useRef(new Animated.Value(0)).current;
  const plusProgress = useRef(new Animated.Value(0)).current;
  const micProgress = useRef(new Animated.Value(0)).current;
  const navigatorProgress = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  const pendingThreadId = useRef(null);
  const listRef = useRef(null);
  const sawFirstMessage = useRef(false);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 10 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const firstVisible = viewableItems.some((entry) => entry.index === 0);
    if (firstVisible) sawFirstMessage.current = true;
    else if (sawFirstMessage.current) setNavigatorUnlocked(true);
  }).current;
  const drawerWidth = Math.round(width * 0.75);

  const activeThread = useMemo(() => threads.find((thread) => thread.id === threadId) || null, [threadId, threads]);
  const messages = activeThread?.messages || [];
  const userMessages = useMemo(() => messages.filter((message) => message.role === 'user'), [messages]);
  const dashCount = Math.min(7, userMessages.length);
  const pinnedThreads = useMemo(() => threads.filter((thread) => thread.pinned), [threads]);
  const recentThreads = useMemo(() => threads.filter((thread) => !thread.pinned), [threads]);
  const historySections = useMemo(() => [
    ...(pinnedThreads.length ? [{ id: 'pinned', title: t('pinned'), data: pinnedThreads }] : []),
    { id: 'recent', title: t('recent'), data: recentThreads },
  ], [pinnedThreads, recentThreads, t]);
  const historyItems = useMemo(() => historySections.flatMap((section) => [
    { id: `section-${section.id}`, kind: 'section', title: section.title },
    ...section.data.map((thread) => ({ ...thread, kind: 'thread' })),
  ]), [historySections]);

  const dictationUnavailable = useCallback(() => Alert.alert(t('voiceUnavailable'), t('voiceUnavailableDesc')), [t]);
  const { listening, start: startDictation, stop: stopDictation } = useHoldToDictate({ value: draft, onChange: setDraft, language, onUnavailable: dictationUnavailable });

  useEffect(() => {
    plusProgress.stopAnimation();
    Animated.spring(plusProgress, { toValue: attachmentOpen ? 1 : 0, stiffness: 360, damping: 25, mass: 0.55, useNativeDriver: true, isInteraction: false }).start();
  }, [attachmentOpen, plusProgress]);

  useEffect(() => {
    micProgress.stopAnimation();
    Animated.spring(micProgress, { toValue: listening || micHeld ? 1 : 0, stiffness: 380, damping: 24, mass: 0.52, useNativeDriver: true, isInteraction: false }).start();
  }, [listening, micHeld, micProgress]);

  useEffect(() => {
    navigatorProgress.stopAnimation();
    const animation = navigatorOpen
      ? Animated.spring(navigatorProgress, { toValue: 1, stiffness: 330, damping: 27, mass: 0.62, useNativeDriver: true, isInteraction: false })
      : Animated.timing(navigatorProgress, { toValue: 0, duration: motion ? 120 : 0, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [motion, navigatorOpen, navigatorProgress]);

  useEffect(() => {
    if (!visible) return;
    if (threadId && threads.some((thread) => thread.id === threadId)) {
      pendingThreadId.current = null;
      return;
    }
    if (pendingThreadId.current && pendingThreadId.current === threadId) return;
    const nextId = threads[0]?.id || onStartChat();
    pendingThreadId.current = threads[0]?.id ? null : nextId;
    setThreadId(nextId);
  }, [onStartChat, threadId, threads, visible]);

  useEffect(() => {
    if (visible) {
      closing.current = false;
      if (!mountedRef.current) {
        mountedRef.current = true;
        setMounted(true);
      }
      screenProgress.stopAnimation();
      screenProgress.setValue(motion ? 0 : 1);
      if (motion) Animated.spring(screenProgress, { toValue: 1, stiffness: 340, damping: 29, mass: 0.62, useNativeDriver: true, isInteraction: false }).start();
    } else if (mountedRef.current && !closing.current) {
      Animated.timing(screenProgress, { toValue: 0, duration: motion ? 120 : 0, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }).start(({ finished }) => {
        if (!finished) return;
        mountedRef.current = false;
        setMounted(false);
      });
    }
  }, [motion, screenProgress, visible]);

  useEffect(() => {
    if (!visible) {
      setHistoryOpen(false);
      setProfileOpen(false);
      setActionThreadId(null);
      drawerProgress.setValue(0);
    }
  }, [drawerProgress, visible]);

  useEffect(() => {
    if (!messages.length) return;
    const id = requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: motion }));
    return () => cancelAnimationFrame(id);
  }, [messages.length, motion]);

  useEffect(() => {
    sawFirstMessage.current = false;
    setNavigatorUnlocked(false);
    setNavigatorOpen(false);
  }, [threadId]);

  const animateDrawer = useCallback((open) => {
    setHistoryOpen(open);
    if (!open) {
      setProfileOpen(false);
      setActionThreadId(null);
    }
    drawerProgress.stopAnimation();
    if (!motion) drawerProgress.setValue(open ? 1 : 0);
    else Animated.spring(drawerProgress, { toValue: open ? 1 : 0, stiffness: 340, damping: 31, mass: 0.65, useNativeDriver: true, isInteraction: false }).start();
  }, [drawerProgress, motion]);

  const dismiss = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setHistoryOpen(false);
    Animated.parallel([
      Animated.timing(drawerProgress, { toValue: 0, duration: motion ? 100 : 0, useNativeDriver: true, isInteraction: false }),
      Animated.timing(screenProgress, { toValue: 0, duration: motion ? 135 : 0, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }),
    ]).start(({ finished }) => {
      if (!finished) return;
      mountedRef.current = false;
      setMounted(false);
      closing.current = false;
      setDraft('');
      setPendingAttachments([]);
      setAttachmentOpen(false);
      setPreview(null);
      onClose();
    });
  }, [drawerProgress, motion, onClose, screenProgress]);

  const send = useCallback((text = draft, files = pendingAttachments) => {
    const clean = String(text || '').trim();
    if (!clean && !files.length) return;
    const targetId = threadId || onStartChat();
    if (!threadId) setThreadId(targetId);
    onSend(targetId, { text: clean, files, unavailableText: t('aiUnreachable'), lectureTitle: lecture?.title, subjectTitle: subject?.name });
    setDraft('');
    setPendingAttachments([]);
    setAttachmentOpen(false);
  }, [draft, lecture, onSend, onStartChat, pendingAttachments, subject, t, threadId]);

  const addAttachments = useCallback((next) => {
    setPendingAttachments((current) => [...current, ...next].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index));
    setAttachmentOpen(false);
  }, []);

  const attachFiles = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (!result.canceled) addAttachments(result.assets.map(normalizeFile));
  }, [addAttachments]);

  const attachImages = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.85 });
    if (!result.canceled) addAttachments(result.assets.map(normalizeImage));
  }, [addAttachments]);

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { Alert.alert(t('cameraPermission'), t('cameraPermissionDesc')); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], cameraType: 'back', quality: 0.85 });
    if (!result.canceled) addAttachments(result.assets.map(normalizeImage));
  }, [addAttachments, t]);

  const removePending = useCallback((id) => setPendingAttachments((current) => current.filter((item) => item.id !== id)), []);
  const openPreview = useCallback((attachments, index) => setPreview({ attachments, index }), []);
  const copyMessage = useCallback((text) => Clipboard.setStringAsync(text).catch(() => {}), []);

  const jumpToMessage = useCallback((message) => {
    setNavigatorOpen(false);
    const index = messages.findIndex((candidate) => candidate.id === message.id);
    if (index < 0) return;
    setTimeout(() => listRef.current?.scrollToIndex({ index, viewPosition: 0.28, animated: true }), motion ? 130 : 0);
  }, [messages, motion]);

  const newChat = useCallback(() => {
    setThreadId(onStartChat());
    setDraft('');
    setPendingAttachments([]);
    animateDrawer(false);
  }, [animateDrawer, onStartChat]);

  const selectThread = useCallback((id) => {
    setActionThreadId(null);
    setThreadId(id);
    animateDrawer(false);
  }, [animateDrawer]);

  const saveRename = useCallback(({ name }) => {
    if (renameTarget) onRenameChat?.(renameTarget.id, name);
    setRenameTarget(null);
  }, [onRenameChat, renameTarget]);

  const togglePin = useCallback((thread) => {
    setActionThreadId(null);
    onTogglePinChat?.(thread.id);
  }, [onTogglePinChat]);

  const selectProfileItem = useCallback((id) => {
    setProfileOpen(false);
    onProfileSelect?.(id);
  }, [onProfileSelect]);

  const renderMessage = useCallback(({ item }) => (
    <ChatBubble
      message={item}
      onPreview={openPreview}
      onCopy={copyMessage}
    />
  ), [copyMessage, openPreview]);
  const renderNavigatorMessage = useCallback(({ item }) => (
    <ElasticPressable shape="pill" onPress={() => jumpToMessage(item)}>
      <View style={[styles.navigatorMessage, { backgroundColor: colors.cardButton }]}><Text numberOfLines={2} style={[{ color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }, type(10, 'semiBold', 14)]}>{item.text || item.files?.map((file) => file.name).join(', ') || t('attachment')}</Text></View>
    </ElasticPressable>
  ), [colors.cardButton, colors.textSecondary, isRTL, jumpToMessage, t, type]);
  const showCamera = !['web', 'windows', 'macos'].includes(Platform.OS);

  if (!mounted && !visible) return null;
  return (
    <Modal visible={mounted || visible} transparent animationType="none" presentationStyle="overFullScreen" statusBarTranslucent navigationBarTranslucent hardwareAccelerated onRequestClose={dismiss}>
      <Animated.View style={[styles.root, { backgroundColor: colors.background, opacity: screenProgress, transform: [{ translateY: screenProgress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }, { scale: screenProgress.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) }] }]}>
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
            <ElasticPressable shape="circle" onPress={() => animateDrawer(true)} accessibilityRole="button" accessibilityLabel={t('openChatHistory')}>
              <View style={[styles.headerButton, { backgroundColor: colors.cardButton }]}><Bars3Icon size={23} color={colors.textPrimary} /></View>
            </ElasticPressable>
            <View style={styles.headerCopy}>
              <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.textPrimary }, type(16, 'bold', 21)]}>{lecture?.title || t('newChat')}</Text>
              <Text numberOfLines={1} style={[styles.headerSubtitle, { color: colors.textMuted }, type(10, 'semiBold', 13)]}>{subject?.name || 'MoeAI'}</Text>
            </View>
            <ElasticPressable shape="circle" onPress={dismiss} accessibilityRole="button" accessibilityLabel={t('closeChat')}>
              <View style={[styles.headerButton, { backgroundColor: colors.cardButton }]}><XMarkIcon size={22} color={colors.textPrimary} /></View>
            </ElasticPressable>
          </View>

          <FlatList
            ref={listRef}
            style={styles.messageList}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={[styles.messages, !messages.length && styles.emptyMessages]}
            ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textMuted }, type(13, 'regular', 18)]}>{t('emptyChat')}</Text>}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="interactive"
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
            onScrollBeginDrag={() => { setAttachmentOpen(false); setNavigatorOpen(false); }}
            onTouchStart={() => setAttachmentOpen(false)}
            onScrollToIndexFailed={(info) => {
              listRef.current?.scrollToOffset({ offset: Math.max(0, info.averageItemLength * info.index), animated: true });
              setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, viewPosition: 0.28, animated: true }), 120);
            }}
          />

          {navigatorUnlocked && dashCount > 0 && !navigatorOpen && (
            <Pressable onPress={() => setNavigatorOpen(true)} hitSlop={12} style={styles.navigatorRail} accessibilityRole="button" accessibilityLabel={t('messageNavigator')}>
              {Array.from({ length: dashCount }, (_, index) => <View key={index} style={[styles.navigatorDash, { backgroundColor: colors.textMuted }]} />)}
            </Pressable>
          )}
          <Animated.View pointerEvents={navigatorOpen ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, styles.navigatorLayer, { opacity: navigatorProgress }]}> 
            <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} onPress={() => setNavigatorOpen(false)} />
            <Animated.View style={[styles.navigatorMenu, { backgroundColor: colors.card, transform: [{ translateX: navigatorProgress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }, { scale: navigatorProgress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }]}> 
              <FlatList data={userMessages} keyExtractor={(item) => item.id} renderItem={renderNavigatorMessage} showsVerticalScrollIndicator={false} contentContainerStyle={styles.navigatorList} keyboardShouldPersistTaps="always" />
            </Animated.View>
          </Animated.View>

          <View style={[styles.composerDock, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: colors.background }]}> 
            {!!pendingAttachments.length && <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={styles.pendingTray}>{pendingAttachments.map((file, index) => (
              <View key={file.id} style={styles.pendingWrap}>
                <Pressable onPress={() => openPreview(pendingAttachments, index)}>{imageFile(file) ? <Image source={{ uri: file.uri }} style={styles.pendingImage} /> : <View style={[styles.pendingFile, { backgroundColor: colors.card }]}><DocumentIcon size={22} color={colors.accent} /><Text numberOfLines={2} style={[styles.pendingFileName, { color: colors.textPrimary }, type(9, 'semiBold', 12)]}>{file.name}</Text></View>}</Pressable>
                <Pressable onPress={() => removePending(file.id)} hitSlop={6} style={[styles.pendingRemove, { backgroundColor: colors.cardButton }]}><XMarkIcon size={13} color={colors.textPrimary} /></Pressable>
              </View>
            ))}</ScrollView>}
            {attachmentOpen && <Animated.View style={[styles.attachmentMenu, pendingAttachments.length && styles.attachmentMenuWithPending, { backgroundColor: colors.card, opacity: plusProgress, transform: [{ translateY: plusProgress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }, { scale: plusProgress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}> 
              {showCamera && <ElasticPressable shape="pill" onPress={takePhoto}><View style={styles.attachmentOption}><CameraIcon size={19} color={colors.accent} /><Text style={[{ color: colors.textPrimary }, type(12, 'semiBold', 16)]}>{t('camera')}</Text></View></ElasticPressable>}
              <ElasticPressable shape="pill" onPress={attachImages}><View style={styles.attachmentOption}><PhotoIcon size={19} color={colors.accent} /><Text style={[{ color: colors.textPrimary }, type(12, 'semiBold', 16)]}>{t('images')}</Text></View></ElasticPressable>
              <ElasticPressable shape="pill" onPress={attachFiles}><View style={styles.attachmentOption}><PaperClipIcon size={19} color={colors.accent} /><Text style={[{ color: colors.textPrimary }, type(12, 'semiBold', 16)]}>{t('files')}</Text></View></ElasticPressable>
            </Animated.View>}
            <View style={[styles.composer, { backgroundColor: colors.card }]}> 
              <ElasticPressable shape="circle" onPress={() => setAttachmentOpen((open) => !open)} accessibilityRole="button" accessibilityLabel={t('attachFiles')}>
                <View style={[styles.composerButton, { backgroundColor: colors.cardButton }]}><Animated.View style={{ transform: [{ rotate: plusProgress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '32deg'] }) }] }}><PlusIcon size={21} color={colors.textPrimary} /></Animated.View></View>
              </ElasticPressable>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={t('messagePlaceholder')}
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.accent}
                multiline
                returnKeyType="send"
                enterKeyHint="send"
                submitBehavior="submit"
                style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(14, 'regular', 20)]}
                onFocus={() => setAttachmentOpen(false)}
                onSubmitEditing={() => send()}
              />
              <Pressable onPressIn={() => { setMicHeld(true); startDictation(); }} onPressOut={() => { setMicHeld(false); stopDictation(); }} onTouchCancel={() => { setMicHeld(false); stopDictation(); }} hitSlop={7} style={styles.micButton} accessibilityRole="button" accessibilityLabel={t('holdToDictate')}>
                <Animated.View pointerEvents="none" style={[styles.micFill, { backgroundColor: colors.accent, opacity: micProgress, transform: [{ scale: micProgress.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }]} />
                <MicrophoneIcon size={20} color={listening || micHeld ? colors.background : colors.textSecondary} />
              </Pressable>
              <ElasticPressable shape="circle" onPress={() => send()} disabled={!draft.trim() && !pendingAttachments.length} accessibilityRole="button" accessibilityLabel={t('sendMessage')}>
                <View style={[styles.sendButton, { backgroundColor: colors.accent, opacity: draft.trim() || pendingAttachments.length ? 1 : 0.45 }]}><PaperAirplaneIcon size={20} color={colors.background} /></View>
              </ElasticPressable>
            </View>
          </View>

          <Animated.View pointerEvents={historyOpen ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, styles.drawerLayer, { opacity: drawerProgress }]}>
            <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} onPress={() => animateDrawer(false)} />
            <Animated.View style={[styles.drawer, { width: drawerWidth, paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 8), backgroundColor: colors.card, transform: [{ translateX: drawerProgress.interpolate({ inputRange: [0, 1], outputRange: [-drawerWidth, 0] }) }] }]}> 
              <Text style={[styles.drawerTitle, { color: colors.textPrimary }, type(19, 'bold', 24)]}>MoeAI</Text>
              <FlatList
                style={styles.historyScroll}
                data={historyItems}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.historyList}
                keyboardShouldPersistTaps="always"
                onScrollBeginDrag={() => setActionThreadId(null)}
                renderItem={({ item }) => item.kind === 'section' ? (
                  <Text style={[styles.sectionTitle, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }, type(10, 'bold', 14)]}>{item.title}</Text>
                ) : (
                  <View style={[styles.historyItemWrap, actionThreadId === item.id && styles.historyItemWrapActive]}>
                    <ElasticPressable
                      shape="pill"
                      onPress={() => actionThreadId === item.id ? setActionThreadId(null) : selectThread(item.id)}
                      onLongPress={() => setActionThreadId(item.id)}
                      delayLongPress={280}
                      accessibilityRole="button"
                    >
                      <View style={[styles.historyItem, { backgroundColor: item.id === threadId ? colors.cardButtonPressed : colors.cardButton }]}> 
                        <Text numberOfLines={2} style={[{ color: item.id === threadId ? colors.accent : colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(11, item.id === threadId ? 'bold' : 'semiBold', 15)]}>{item.title}</Text>
                      </View>
                    </ElasticPressable>
                    {actionThreadId === item.id && (
                      <ChatActionPill pinned={item.pinned} onRename={() => { setActionThreadId(null); setRenameTarget(item); }} onTogglePin={() => togglePin(item)} />
                    )}
                  </View>
                )}
                showsVerticalScrollIndicator={false}
              />
              <View style={styles.drawerFooter}>
                <ElasticPressable shape="pill" style={styles.newChatWrap} onPress={newChat} accessibilityRole="button">
                  <View style={[styles.newChatButton, { backgroundColor: colors.cardButton }]}><PencilSquareIcon size={18} color={colors.accent} /><Text numberOfLines={1} style={[{ color: colors.accent }, type(12, 'bold', 16)]}>{t('newChat')}</Text></View>
                </ElasticPressable>
                <View>
                  <ElasticPressable shape="pill" onPress={() => { setActionThreadId(null); setProfileOpen((open) => !open); }} accessibilityRole="button" accessibilityLabel={t('profileMenu')} accessibilityState={{ expanded: profileOpen }}>
                    <ProfilePill backgroundColor={colors.cardButton} />
                  </ElasticPressable>
                </View>
              </View>
              <ProfileMenu visible={profileOpen} placement="above" positionStyle={{ right: 0, bottom: 58 }} onClose={() => setProfileOpen(false)} onSelect={selectProfileItem} />
            </Animated.View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
      <ChatAttachmentPreview visible={!!preview} attachments={preview?.attachments || []} initialIndex={preview?.index || 0} onClose={() => setPreview(null)} />
      <SubjectEditorModal visible={!!renameTarget} title={t('renameChat')} initialValue={renameTarget?.title || ''} placeholder={t('chatName')} onCancel={() => setRenameTarget(null)} onConfirm={saveRename} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: Spacing.md, paddingBottom: 9, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerButton: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, alignItems: 'center' },
  headerTitle: { textAlign: 'center' },
  headerSubtitle: { textAlign: 'center', marginTop: 1 },
  messageList: { flex: 1 },
  messages: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  emptyMessages: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center', maxWidth: 250 },
  messageRow: { width: '100%', marginBottom: 10 },
  userRow: { alignItems: 'flex-end' },
  assistantRow: { alignItems: 'flex-start' },
  typingRow: { flexDirection: 'row', gap: 5, paddingVertical: 5 },
  typingDot: { width: 6, height: 6, borderRadius: 3 },
  messageColumn: { maxWidth: '82%' },
  aiLabel: { marginBottom: 3, marginHorizontal: 7 },
  bubble: { borderRadius: 18, paddingHorizontal: 13, paddingVertical: 10 },
  sentAttachmentScroll: { maxWidth: 250, height: 80, flexGrow: 0 },
  sentAttachments: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sentImage: { width: 80, height: 80, borderRadius: Radius.md },
  messageAfterFiles: { marginTop: 4 },
  fileChip: { minWidth: 128, maxWidth: 210, minHeight: 42, borderRadius: Radius.sm, alignItems: 'center', gap: 7, paddingHorizontal: 9, paddingVertical: 6 },
  fileType: { alignItems: 'center', justifyContent: 'center', width: 28 },
  fileName: { flexShrink: 1 },
  copyButton: { alignSelf: 'flex-start', marginTop: 4, marginHorizontal: 7, padding: 2 },
  navigatorRail: { position: 'absolute', right: 5, top: '50%', zIndex: 18, padding: 5, gap: 5, alignItems: 'flex-end', transform: [{ translateY: -25 }] },
  navigatorDash: { width: 15, height: 3, borderRadius: Radius.pill, opacity: 0.42 },
  navigatorLayer: { zIndex: 24, elevation: 24 },
  navigatorMenu: { position: 'absolute', right: 12, top: '20%', bottom: '20%', width: '66%', maxWidth: 300, borderRadius: Radius.lg, padding: 8 },
  navigatorList: { gap: 6 },
  navigatorMessage: { minHeight: 42, borderRadius: Radius.md, justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 7 },
  composerDock: { paddingHorizontal: Spacing.md, paddingTop: 7, position: 'relative', zIndex: 20 },
  pendingTray: { gap: 8, paddingHorizontal: 2, paddingTop: 6, paddingBottom: 8 },
  pendingWrap: { position: 'relative' },
  pendingImage: { width: 80, height: 80, borderRadius: Radius.md },
  pendingFile: { width: 126, height: 80, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, gap: 3 },
  pendingFileName: { textAlign: 'center' },
  pendingRemove: { position: 'absolute', top: -5, right: -5, width: 23, height: 23, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', zIndex: 2, elevation: 2 },
  attachmentMenu: { position: 'absolute', left: Spacing.md, bottom: 61, minWidth: 150, borderRadius: Radius.lg, padding: 5, zIndex: 28, elevation: 28 },
  attachmentMenuWithPending: { bottom: 155 },
  attachmentOption: { minHeight: 40, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10 },
  composer: { minHeight: 52, maxHeight: 116, borderRadius: 28, flexDirection: 'row', alignItems: 'flex-end', padding: 6, gap: 7 },
  composerButton: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  sendButton: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  micButton: { width: 31, height: 40, alignItems: 'center', justifyContent: 'center' },
  micFill: { position: 'absolute', width: 34, height: 34, borderRadius: Radius.pill },
  input: { flex: 1, minHeight: 40, maxHeight: 96, paddingHorizontal: 4, paddingVertical: 9 },
  drawerLayer: { zIndex: 30, elevation: 30 },
  drawer: { height: '100%', paddingHorizontal: 10 },
  drawerTitle: { textAlign: 'center', marginBottom: Spacing.sm },
  drawerFooter: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: 7 },
  newChatWrap: { flex: 1 },
  newChatButton: { minHeight: 42, borderRadius: Radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 },
  historyList: { paddingBottom: Spacing.md },
  historyScroll: { flex: 1 },
  sectionTitle: { marginTop: 8, marginBottom: 5, paddingHorizontal: 7, textTransform: 'uppercase', letterSpacing: 0.7 },
  historyItemWrap: { position: 'relative', overflow: 'visible' },
  historyItemWrapActive: { zIndex: 10, elevation: 10 },
  historyItem: { minHeight: 48, borderRadius: Radius.md, justifyContent: 'center', paddingHorizontal: 11, paddingVertical: 8, marginBottom: 6 },
  chatActions: { position: 'absolute', top: -19, right: 4, flexDirection: 'row', alignItems: 'center', borderRadius: Radius.pill, padding: 2, gap: 1, zIndex: 12, elevation: 12 },
  chatAction: { width: 34, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
