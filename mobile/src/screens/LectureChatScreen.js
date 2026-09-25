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
import { Bars3Icon, CameraIcon, ClipboardDocumentIcon as SolidClipboardDocumentIcon, DocumentIcon, MicrophoneIcon, PaperAirplaneIcon, PaperClipIcon, PencilIcon, PencilSquareIcon, PhotoIcon, PlusIcon, StopIcon, TrashIcon, XMarkIcon } from 'react-native-heroicons/solid';
import { ArrowPathIcon, BookOpenIcon, ClipboardDocumentIcon as OutlineClipboardDocumentIcon, HandThumbDownIcon, HandThumbUpIcon, PencilIcon as OutlinePencilIcon, SpeakerWaveIcon, StopCircleIcon } from 'react-native-heroicons/outline';
import { HandThumbDownIcon as SolidThumbDown, HandThumbUpIcon as SolidThumbUp, SparklesIcon } from 'react-native-heroicons/solid';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useHoldToDictate from '../chat/useHoldToDictate';
import VoiceMode from '../chat/VoiceMode';
import LectureReader from '../chat/LectureReader';
import { speak as speakAloud, stop as stopSpeaking } from '../chat/speech';
import { API_BASE_URL, visibleText } from '../ai/client';
import { usePersonal } from '../personal/PersonalContext';
import { modelLabel, useAccount } from '../account/AccountContext';
import KaTeXMessage from '../chat/KaTeXMessage';
import RichMessage from '../chat/RichMessage';
import CalendarAlertModal from '../components/CalendarAlertModal';
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
const COPY_ICON_SIZE = 17;
const COPY_FILL_MAX = COPY_ICON_SIZE * 1.8;
const COPY_ICON_CENTER = COPY_ICON_SIZE / 2;

function LoadingDots() {
  const { colors, type, motion, t } = usePreferences();
  const dots = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  useEffect(() => {
    dots.forEach((dot) => dot.setValue(0));
    if (!motion) return undefined;
    const bounce = (dot) => Animated.sequence([
      Animated.timing(dot, { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }),
      Animated.timing(dot, { toValue: 0, duration: 170, easing: Easing.in(Easing.quad), useNativeDriver: true, isInteraction: false }),
    ]);
    const animation = Animated.loop(Animated.sequence([
      Animated.stagger(110, dots.map(bounce)),
      Animated.delay(500),
    ]));
    animation.start();
    return () => animation.stop();
  }, [dots, motion]);
  return (
    <View style={styles.loadingDots} accessible accessibilityRole="progressbar" accessibilityLabel={t('aiThinking')}>
      {dots.map((dot, index) => (
        <Animated.Text
          key={index}
          style={[styles.loadingDot, { color: colors.textPrimary, opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.58, 1] }), transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }, type(17, 'bold', 18)]}
        >.</Animated.Text>
      ))}
    </View>
  );
}

function CopyFeedback({ text, onCopy }) {
  const { colors, type, motion, isRTL, t } = usePreferences();
  const [copied, setCopied] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const resetTimer = useRef(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    progress.stopAnimation();
  }, [progress]);

  const copy = useCallback(() => {
    onCopy(text);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setCopied(true);
    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: 1,
      duration: motion ? 180 : 0,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    }).start();
    resetTimer.current = setTimeout(() => {
      progress.stopAnimation();
      Animated.timing(progress, {
        toValue: 0,
        duration: motion ? 180 : 0,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
        isInteraction: false,
      }).start(({ finished }) => {
        if (finished) setCopied(false);
      });
    }, 3000);
  }, [motion, onCopy, progress, text]);

  const outlineOpacity = progress.interpolate({
    inputRange: [0, 0.45, 0.7, 1],
    outputRange: [1, 0.55, 0, 0],
  });
  const fillOpacity = progress.interpolate({
    inputRange: [0, 0.06, 1],
    outputRange: [0, 1, 1],
  });
  return (
    <Pressable
      hitSlop={9}
      onPress={copy}
      style={[styles.copyButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      accessibilityRole="button"
      accessibilityLabel={copied ? t('copied') : t('copyMessage')}
    >
      <View style={styles.copyIconStack}>
        <Animated.View style={[styles.copyIconLayer, { opacity: outlineOpacity }]}>
          <OutlineClipboardDocumentIcon size={COPY_ICON_SIZE} color={colors.textMuted} />
        </Animated.View>
        <Animated.View style={[styles.copyFillMask, { opacity: fillOpacity, transform: [{ scale: progress }] }]}>
          <View style={styles.copyFillInner}>
            <SolidClipboardDocumentIcon size={COPY_ICON_SIZE} color={colors.accent} />
          </View>
        </Animated.View>
      </View>
      <Animated.Text
        pointerEvents="none"
        accessibilityLiveRegion="polite"
        style={[{ color: colors.accent, opacity: progress, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [isRTL ? 4 : -4, 0] }) }] }, type(11, 'semiBold', 15)]}
      >{t('copied')}</Animated.Text>
    </Pressable>
  );
}

const FOLLOW_UPS = ['followExplain', 'followExample', 'followVisual', 'followQuiz'];

function FollowUps({ onPick }) {
  const { colors, type, isRTL, t } = usePreferences();
  return (
    <View style={[styles.followUps, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {FOLLOW_UPS.map((key) => (
        <ElasticPressable key={key} shape="pill" onPress={() => onPick(t(key))} accessibilityRole="button">
          <View style={[styles.followUp, { backgroundColor: colors.cardButton }]}><Text style={[{ color: colors.textSecondary }, type(11, 'semiBold', 15)]}>{t(key)}</Text></View>
        </ElasticPressable>
      ))}
    </View>
  );
}

/** Where a course-grounded answer came from: the lecturer's file and page, tap for the passage. */
function Sources({ items }) {
  const { colors, type, isRTL, t } = usePreferences();
  const [open, setOpen] = useState(-1);
  return (
    <View style={styles.sources}>
      <Text style={[{ color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }, type(10, 'bold', 13)]}>{t('fromYourCourse')}</Text>
      <View style={[styles.followUps, { marginTop: 4, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {items.map((item, index) => (
          <Pressable key={`${item.title}-${item.ref}-${index}`} onPress={() => setOpen(open === index ? -1 : index)} accessibilityRole="button"
            style={[styles.followUp, { backgroundColor: open === index ? colors.cardButtonPressed : colors.cardButton, flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%' }]}>
            <DocumentIcon size={12} color={colors.accent} />
            <Text numberOfLines={1} style={[{ color: colors.textSecondary, flexShrink: 1 }, type(11, 'semiBold', 15)]}>{item.title}{item.ref ? ` · ${item.ref}` : ''}</Text>
          </Pressable>
        ))}
      </View>
      {open >= 0 && items[open]?.excerpt ? (
        <Text style={[styles.sourceExcerpt, { color: colors.textSecondary, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }, type(12, 'regular', 17)]}>{items[open].excerpt}…</Text>
      ) : null}
    </View>
  );
}

/** Four bars: the voice-mode button, as in the chat bars students already know. */
function Waveform({ color }) {
  return (
    <View style={styles.wave} pointerEvents="none">
      {[9, 16, 12, 7].map((h, i) => <View key={i} style={[styles.waveBar, { height: h, backgroundColor: color }]} />)}
    </View>
  );
}

function IconAction({ onPress, label, children }) {
  return (
    <Pressable hitSlop={8} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.iconAction}>{children}</Pressable>
  );
}

const SUGGESTIONS = ['suggestSummary', 'suggestExplain', 'suggestExample', 'suggestQuiz'];

/** A new chat: what this MoeAI is, and good first questions about this lecture. */
function ChatEmptyState({ lecture, subject, model, onPick, onRead }) {
  const { colors, type, t, isRTL } = usePreferences();
  const grounded = Boolean(subject?.orgCourseId);
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyMark, { backgroundColor: colors.card }]}><SparklesIcon size={26} color={colors.accent} /></View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }, type(20, 'bold', 26)]}>{lecture?.title || t('newChat')}</Text>
      {model ? (
        <View style={[styles.modelChip, { backgroundColor: colors.card }]}>
          <View style={[styles.liveDot, { backgroundColor: colors.accent }]} />
          <Text style={[{ color: colors.textSecondary }, type(11, 'bold', 15)]}>{model}</Text>
        </View>
      ) : null}
      <Text style={[styles.emptyText, { color: colors.textMuted }, type(13, 'regular', 19)]}>{grounded ? t('groundedNote') : t('emptyChat')}</Text>
      <View style={[styles.suggestions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {SUGGESTIONS.map((key) => (
          <ElasticPressable key={key} shape="pill" onPress={() => onPick(t(key))} accessibilityRole="button">
            <View style={[styles.suggestion, { backgroundColor: colors.card }]}><Text style={[{ color: colors.textPrimary }, type(12, 'semiBold', 17)]}>{t(key)}</Text></View>
          </ElasticPressable>
        ))}
      </View>
      {lecture?.materialId ? (
        <ElasticPressable shape="pill" onPress={onRead} accessibilityRole="button">
          <View style={[styles.readButton, { backgroundColor: colors.cardButton, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <BookOpenIcon size={17} color={colors.accent} />
            <Text style={[{ color: colors.accent }, type(13, 'bold', 17)]}>{t('readLecture')}</Text>
          </View>
        </ElasticPressable>
      ) : null}
    </View>
  );
}

/** MoeAI kept something from this reply; tapping shows exactly what, and lets the student change it. */
function MemoryChip({ items }) {
  const { colors, type, t, isRTL } = usePreferences();
  const { openPanel } = usePersonal();
  const summary = items.slice(0, 2).map((m) => String(m.key || '').replace(/_/g, ' ')).join(', ');
  return (
    <Pressable onPress={() => openPanel(items.some((m) => m.skill) ? 'skills' : 'memory')} accessibilityRole="button" accessibilityLabel={t('memoryUpdated')} style={[styles.memoryChip, { backgroundColor: colors.cardButton, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <SparklesIcon size={12} color={colors.accent} />
      <Text numberOfLines={1} style={[{ color: colors.textSecondary, flexShrink: 1 }, type(11, 'semiBold', 15)]}>{t('memoryUpdated')}{summary ? ` · ${summary}` : ''}</Text>
    </Pressable>
  );
}

const ChatBubble = React.memo(function ChatBubble({ message, onPreview, onCopy, isLast, isLastUser, canEdit, onRegenerate, onFix, onFollowUp, speaking, onSpeak, onFeedback, onEdit }) {
  const { colors, type, isRTL, motion, t } = usePreferences();
  const { width } = useWindowDimensions();
  const user = message.role === 'user';
  const pending = !user && (message.status === 'pending' || (message.status === 'streaming' && !message.text));
  const streaming = !user && message.status === 'streaming' && !!message.text;
  const messageTextStyle = type(14, 'regular', 20);
  const availableWidth = Math.max(0, width - Spacing.md * 2);
  const columnWidth = user
    ? Math.min(440, Math.floor(availableWidth * 0.82))
    : Math.min(760, availableWidth);
  const messageTextWidth = Math.max(1, columnWidth - (user ? 26 : 14));
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
      <View style={[styles.messageColumn, user ? styles.userMessageColumn : styles.assistantMessageColumn]}>
        {!user && <Text style={[styles.aiLabel, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }, type(10, 'bold', 13)]}>MoeAI</Text>}
        <View style={user
          ? [styles.userBubble, { backgroundColor: colors.accent, borderBottomRightRadius: 5 }]
          : styles.assistantContent}
        >
          {!!message.files?.length && <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} style={styles.sentAttachmentScroll} contentContainerStyle={styles.sentAttachments}>{message.files.map((file, index) => imageFile(file) ? (
            <Pressable key={file.id || file.name} onPress={() => onPreview(message.files, index)}><Image source={{ uri: file.uri }} style={styles.sentImage} /></Pressable>
          ) : (
            <Pressable key={file.id || file.name} onPress={() => onPreview(message.files, index)} style={[styles.fileChip, { backgroundColor: user ? 'rgba(255,255,255,0.16)' : colors.card, flexDirection: isRTL ? 'row-reverse' : 'row' }]}> 
              <View style={styles.fileType}><DocumentIcon size={16} color={user ? colors.white : colors.accent} /><Text style={[{ color: user ? colors.white : colors.accent }, type(7, 'bold', 9)]}>{fileExtension(file.name)}</Text></View>
              <Text numberOfLines={1} style={[styles.fileName, { color: user ? colors.white : colors.textPrimary }, type(11, 'semiBold', 15)]}>{file.name}</Text>
            </Pressable>
          ))}</ScrollView>}
          {pending ? (
            <View style={message.files?.length && styles.messageAfterFiles}><LoadingDots /></View>
          ) : !!message.text && (user ? (
            <KaTeXMessage
              text={message.text}
              color={colors.white}
              textAlign={isRTL ? 'right' : 'left'}
              fontStyle={messageTextStyle}
              maxWidth={messageTextWidth}
              style={message.files?.length && styles.messageAfterFiles}
            />
          ) : (
            <RichMessage
              text={message.text}
              color={message.status === 'failed' ? colors.danger : colors.textPrimary}
              textAlign={isRTL ? 'right' : 'left'}
              fontStyle={messageTextStyle}
              maxWidth={messageTextWidth}
              style={message.files?.length && styles.messageAfterFiles}
              onFix={onFix}
            />
          ))}
          {streaming ? <View style={styles.streamingDots}><LoadingDots /></View> : null}
        </View>
        {user && isLastUser && canEdit && !!message.text ? (
          <Pressable hitSlop={8} onPress={() => onEdit(message)} accessibilityRole="button" accessibilityLabel={t('editMessage')} style={[styles.editButton, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <OutlinePencilIcon size={13} color={colors.textMuted} />
            <Text style={[{ color: colors.textMuted }, type(11, 'semiBold', 15)]}>{message.editedAt ? t('editedEdit') : t('editMessage')}</Text>
          </Pressable>
        ) : null}
        {!user && !pending && !!message.citations?.length ? <Sources items={message.citations} /> : null}
        {!user && !pending && !streaming && !!message.remembered?.length ? <MemoryChip items={message.remembered} /> : null}
        {!user && !pending && !streaming && !!message.text && (
          <View style={[styles.replyActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {message.status !== 'failed' ? <CopyFeedback text={message.text} onCopy={onCopy} /> : null}
            {message.status !== 'failed' ? (
              <IconAction onPress={() => onSpeak(message)} label={speaking ? t('stopReading') : t('readAloud')}>
                {speaking ? <StopCircleIcon size={COPY_ICON_SIZE + 1} color={colors.accent} /> : <SpeakerWaveIcon size={COPY_ICON_SIZE} color={colors.textMuted} />}
              </IconAction>
            ) : null}
            {message.status !== 'failed' ? (
              <IconAction onPress={() => onFeedback(message, message.feedback === 1 ? 0 : 1)} label={t('goodAnswer')}>
                {message.feedback === 1 ? <SolidThumbUp size={COPY_ICON_SIZE} color={colors.accent} /> : <HandThumbUpIcon size={COPY_ICON_SIZE} color={colors.textMuted} />}
              </IconAction>
            ) : null}
            {message.status !== 'failed' ? (
              <IconAction onPress={() => onFeedback(message, message.feedback === -1 ? 0 : -1)} label={t('badAnswer')}>
                {message.feedback === -1 ? <SolidThumbDown size={COPY_ICON_SIZE} color={colors.accent} /> : <HandThumbDownIcon size={COPY_ICON_SIZE} color={colors.textMuted} />}
              </IconAction>
            ) : null}
            {isLast ? (
              <Pressable hitSlop={9} onPress={onRegenerate} accessibilityRole="button" accessibilityLabel={t('regenerate')} style={[styles.regenerate, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <ArrowPathIcon size={COPY_ICON_SIZE} color={colors.textMuted} />
                {message.status === 'failed' || message.status === 'stopped' ? <Text style={[{ color: colors.textMuted }, type(11, 'semiBold', 15)]}>{t(message.status === 'failed' ? 'tryAgain' : 'replyStopped')}</Text> : null}
              </Pressable>
            ) : null}
          </View>
        )}
        {isLast && !user && message.status === 'complete' && !!message.text ? <FollowUps onPick={onFollowUp} /> : null}
      </View>
    </Animated.View>
  );
});

function ChatActionPill({ pinned, onRename, onTogglePin, onDelete }) {
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
      <ElasticPressable shape="circle" onPress={onDelete} accessibilityRole="button" accessibilityLabel={t('deleteChat')}>
        <View style={styles.chatAction}><TrashIcon size={18} color={colors.danger} /></View>
      </ElasticPressable>
    </Animated.View>
  );
}

export default function LectureChatScreen({ visible, subject, lecture, threads, onClose, onStartChat, onSend, onStop, onRegenerate, onEditResend, onFeedback, onRenameChat, onTogglePinChat, onDeleteChat, onProfileSelect }) {
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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [micHeld, setMicHeld] = useState(false);
  const [navigatorUnlocked, setNavigatorUnlocked] = useState(false);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [webInputHeight, setWebInputHeight] = useState(40);
  const [speakingId, setSpeakingId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);
  const { account } = useAccount();
  const model = modelLabel(account);
  const screenProgress = useRef(new Animated.Value(visible && !motion ? 1 : 0)).current;
  const drawerProgress = useRef(new Animated.Value(0)).current;
  const plusProgress = useRef(new Animated.Value(0)).current;
  const micProgress = useRef(new Animated.Value(0)).current;
  const navigatorProgress = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  const pendingThreadId = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
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
  const replying = messages.some((message) => message.role === 'assistant' && (message.status === 'pending' || message.status === 'streaming'));
  const lastText = messages[messages.length - 1]?.text || '';
  const nearBottom = useRef(true);
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
  const updateDraft = useCallback((text) => {
    setDraft(text);
    if (Platform.OS !== 'web') return;
    // Reset before measuring so an input that previously reached its maximum
    // height can shrink again after text is deleted or sent.
    setWebInputHeight(40);
    requestAnimationFrame(() => {
      const nextHeight = Math.min(96, Math.max(40, Math.ceil(inputRef.current?.scrollHeight || 40)));
      setWebInputHeight(nextHeight);
    });
  }, []);
  const { listening, start: startDictation, stop: stopDictation } = useHoldToDictate({ value: draft, onChange: updateDraft, language, onUnavailable: dictationUnavailable });

  useEffect(() => {
    if (Platform.OS === 'web' && !draft) setWebInputHeight(40);
  }, [draft]);

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
      setDeleteTarget(null);
      drawerProgress.setValue(0);
    }
  }, [drawerProgress, visible]);

  useEffect(() => {
    if (!messages.length) return;
    const id = requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: motion }));
    return () => cancelAnimationFrame(id);
  }, [messages.length, motion]);

  // Follow a reply as it streams in, but only while the student is already
  // at the bottom; scrolling up to reread something must not be yanked back.
  useEffect(() => {
    if (!replying || !nearBottom.current) return undefined;
    const id = requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
    return () => cancelAnimationFrame(id);
  }, [lastText.length, replying]);

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
    stopSpeaking();
    setSpeakingId(null);
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
    if (editing && threadId) {
      if (!clean) return;
      onEditResend?.(threadId, editing.id, clean);
      setEditing(null);
      setDraft('');
      return;
    }
    if (!clean && !files.length) return;
    const targetId = threadId || onStartChat();
    if (!threadId) setThreadId(targetId);
    onSend(targetId, { text: clean, files });
    setDraft('');
    setPendingAttachments([]);
    setAttachmentOpen(false);
  }, [draft, editing, onEditResend, onSend, onStartChat, pendingAttachments, threadId]);

  const stopReplying = useCallback(() => { if (threadId) onStop?.(threadId); }, [onStop, threadId]);
  const regenerate = useCallback(() => { if (threadId && !replying) onRegenerate?.(threadId); }, [onRegenerate, replying, threadId]);
  // Follow-ups and "fix it" requests send on their own, leaving the draft alone.
  const sendText = useCallback((text) => {
    const clean = String(text || '').trim();
    if (replying || !clean) return;
    const targetId = threadId || onStartChat();
    if (!threadId) setThreadId(targetId);
    onSend(targetId, { text: clean, files: [] });
  }, [onSend, onStartChat, replying, threadId]);

  const sendFromComposer = useCallback(() => {
    if (replying) return;
    send();
    // Mobile browsers may try to blur the textarea when the adjacent send
    // control is tapped. Focusing during the same gesture keeps the virtual
    // keyboard open; the animation-frame focus covers browsers that resize
    // their visual viewport immediately after the tap.
    inputRef.current?.focus();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [send]);

  const keepComposerFocused = useCallback((event) => {
    if (Platform.OS === 'web') event?.preventDefault?.();
    inputRef.current?.focus();
  }, []);

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
  const copyMessage = useCallback((text) => Clipboard.setStringAsync(visibleText(text)).catch(() => {}), []);
  const speakMessage = useCallback((message) => {
    if (speakingId === message.id) { stopSpeaking(); setSpeakingId(null); return; }
    setSpeakingId(message.id);
    speakAloud(message.text, { language, onDone: () => setSpeakingId((id) => (id === message.id ? null : id)) });
  }, [language, speakingId]);
  useEffect(() => () => stopSpeaking(), []);
  const rateMessage = useCallback((message, rating) => {
    if (!threadId) return;
    onFeedback?.(threadId, message.id, rating);
    if (!rating) return;
    // Stored against the student's account (and visible to course staff); signed out it stays on the device.
    fetch(`${API_BASE_URL}/api/feedback`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: message.id, rating, courseId: subject?.orgCourseId || null, excerpt: String(message.text || '').slice(0, 600) }),
    }).catch(() => {});
  }, [onFeedback, subject?.orgCourseId, threadId]);
  const startEdit = useCallback((message) => {
    setEditing({ id: message.id });
    updateDraft(message.text);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [updateDraft]);
  const cancelEdit = useCallback(() => { setEditing(null); updateDraft(''); }, [updateDraft]);
  const askAboutPage = useCallback((page) => {
    setReaderOpen(false);
    const heading = String(page.content || '').split('\n').map((line) => line.replace(/^[#*\s]+|[*]+$/g, '').trim()).find(Boolean) || '';
    sendText(t('askPagePrompt').replace('{n}', String(page.page)).replace('{heading}', heading.slice(0, 80)));
  }, [sendText, t]);

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

  const requestDelete = useCallback((thread) => {
    setActionThreadId(null);
    setDeleteTarget(thread);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    const nextThread = threads.find((thread) => thread.id !== deleteTarget.id) || null;
    onDeleteChat?.(deleteTarget.id);
    if (threadId === deleteTarget.id) {
      const nextId = nextThread?.id || onStartChat();
      pendingThreadId.current = nextThread ? null : nextId;
      setThreadId(nextId);
    }
    setDeleteTarget(null);
  }, [deleteTarget, onDeleteChat, onStartChat, threadId, threads]);

  const selectProfileItem = useCallback((id) => {
    setProfileOpen(false);
    onProfileSelect?.(id);
  }, [onProfileSelect]);

  const lastId = messages[messages.length - 1]?.id;
  const lastUserId = userMessages[userMessages.length - 1]?.id;
  const renderMessage = useCallback(({ item }) => (
    <ChatBubble
      message={item}
      onPreview={openPreview}
      onCopy={copyMessage}
      isLast={item.id === lastId}
      isLastUser={item.id === lastUserId}
      canEdit={!replying && !!onEditResend}
      onRegenerate={regenerate}
      onFix={sendText}
      onFollowUp={sendText}
      speaking={speakingId === item.id}
      onSpeak={speakMessage}
      onFeedback={rateMessage}
      onEdit={startEdit}
    />
  ), [copyMessage, lastId, lastUserId, onEditResend, openPreview, rateMessage, regenerate, replying, sendText, speakMessage, speakingId, startEdit]);
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
        <KeyboardAvoidingView
          style={styles.root}
          behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
        >
          <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
            <ElasticPressable shape="circle" onPress={() => animateDrawer(true)} accessibilityRole="button" accessibilityLabel={t('openChatHistory')}>
              <View style={[styles.headerButton, { backgroundColor: colors.cardButton }]}><Bars3Icon size={23} color={colors.textPrimary} /></View>
            </ElasticPressable>
            <View style={styles.headerCopy}>
              <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.textPrimary }, type(16, 'bold', 21)]}>{lecture?.title || t('newChat')}</Text>
              <Text numberOfLines={1} style={[styles.headerSubtitle, { color: colors.textMuted }, type(10, 'semiBold', 13)]}>{[subject?.code, subject?.name].filter(Boolean).join(' · ') || 'MoeAI'}{model && subject?.orgCourseId ? `  ·  ${model}` : ''}</Text>
            </View>
            {lecture?.materialId ? (
              <ElasticPressable shape="circle" onPress={() => setReaderOpen(true)} accessibilityRole="button" accessibilityLabel={t('readLecture')}>
                <View style={[styles.headerButton, { backgroundColor: colors.cardButton }]}><BookOpenIcon size={21} color={colors.textPrimary} /></View>
              </ElasticPressable>
            ) : null}
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
            ListEmptyComponent={<ChatEmptyState lecture={lecture} subject={subject} model={model} onPick={sendText} onRead={() => setReaderOpen(true)} />}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="interactive"
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
            onScrollBeginDrag={() => { setAttachmentOpen(false); setNavigatorOpen(false); }}
            onScroll={(event) => {
              const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
              nearBottom.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 140;
            }}
            scrollEventThrottle={100}
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
            {editing ? (
              <View style={[styles.editingBar, { backgroundColor: colors.card }]}>
                <OutlinePencilIcon size={14} color={colors.accent} />
                <Text style={[{ color: colors.textSecondary, flex: 1 }, type(12, 'semiBold', 16)]}>{t('editingMessage')}</Text>
                <Pressable onPress={cancelEdit} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('cancel')}><XMarkIcon size={16} color={colors.textMuted} /></Pressable>
              </View>
            ) : null}
            <View style={[styles.composer, { backgroundColor: colors.card }]}> 
              <ElasticPressable shape="circle" onPress={() => setAttachmentOpen((open) => !open)} accessibilityRole="button" accessibilityLabel={t('attachFiles')}>
                <View style={[styles.composerButton, { backgroundColor: colors.cardButton }]}><PlusIcon size={21} color={colors.textPrimary} /></View>
              </ElasticPressable>
              <TextInput
                ref={inputRef}
                value={draft}
                onChangeText={updateDraft}
                placeholder={t('messagePlaceholder')}
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.accent}
                multiline
                {...(Platform.OS === 'web' ? { rows: 1 } : {})}
                returnKeyType="send"
                enterKeyHint="send"
                submitBehavior="submit"
                blurOnSubmit={false}
                style={[styles.input, Platform.OS === 'web' && { height: webInputHeight }, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(14, 'regular', 20)]}
                onFocus={() => setAttachmentOpen(false)}
                onSubmitEditing={sendFromComposer}
              />
              <Pressable onPressIn={() => { setMicHeld(true); startDictation(); }} onPressOut={() => { setMicHeld(false); stopDictation(); }} onTouchCancel={() => { setMicHeld(false); stopDictation(); }} hitSlop={7} style={styles.micButton} accessibilityRole="button" accessibilityLabel={t('holdToDictate')}>
                <Animated.View pointerEvents="none" style={[styles.micFill, { backgroundColor: colors.accent, opacity: micProgress, transform: [{ scale: micProgress.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }]} />
                <MicrophoneIcon size={20} color={listening || micHeld ? colors.background : colors.textSecondary} />
              </Pressable>
              {replying ? (
                <ElasticPressable shape="circle" onPress={stopReplying} accessibilityRole="button" accessibilityLabel={t('stopReply')}>
                  <View style={[styles.sendButton, { backgroundColor: colors.accent }]}><StopIcon size={18} color={colors.background} /></View>
                </ElasticPressable>
              ) : !draft.trim() && !pendingAttachments.length && !editing ? (
                <ElasticPressable shape="circle" onPress={() => { stopSpeaking(); setSpeakingId(null); setVoiceOpen(true); }} accessibilityRole="button" accessibilityLabel={t('voiceMode')}>
                  <View style={[styles.sendButton, { backgroundColor: colors.accent }]}><Waveform color={colors.background} /></View>
                </ElasticPressable>
              ) : (
                <ElasticPressable
                  shape="circle"
                  onPressIn={keepComposerFocused}
                  onPress={sendFromComposer}
                  disabled={!draft.trim() && !pendingAttachments.length}
                  accessibilityRole="button"
                  accessibilityLabel={t('sendMessage')}
                >
                  <View style={[styles.sendButton, { backgroundColor: colors.accent, opacity: draft.trim() || pendingAttachments.length ? 1 : 0.45 }]}><PaperAirplaneIcon size={20} color={colors.background} /></View>
                </ElasticPressable>
              )}
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
                      <ChatActionPill pinned={item.pinned} onRename={() => { setActionThreadId(null); setRenameTarget(item); }} onTogglePin={() => togglePin(item)} onDelete={() => requestDelete(item)} />
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
      <VoiceMode visible={voiceOpen} messages={messages} onSend={sendText} onClose={() => setVoiceOpen(false)} title={lecture?.title} />
      {lecture?.materialId ? <LectureReader visible={readerOpen} materialId={lecture.materialId} title={lecture.title} onClose={() => setReaderOpen(false)} onAsk={askAboutPage} /> : null}
      <ChatAttachmentPreview visible={!!preview} attachments={preview?.attachments || []} initialIndex={preview?.index || 0} onClose={() => setPreview(null)} />
      <SubjectEditorModal visible={!!renameTarget} title={t('renameChat')} initialValue={renameTarget?.title || ''} placeholder={t('chatName')} onCancel={() => setRenameTarget(null)} onConfirm={saveRename} />
      <CalendarAlertModal visible={!!deleteTarget} title={t('deleteChat')} message={t('deleteChatConfirm')} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} destructive />
    </Modal>
  );
}

const styles = StyleSheet.create({
  memoryChip: { alignSelf: 'flex-start', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginTop: 6, maxWidth: '100%' },
  replyActions: { alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  iconAction: { padding: 3, marginTop: 4 },
  editButton: { alignSelf: 'flex-end', alignItems: 'center', gap: 4, marginTop: 4, marginHorizontal: 4, padding: 2 },
  editingBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6 },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 2.5, height: 18 },
  waveBar: { width: 3, borderRadius: 2 },
  empty: { alignItems: 'center', paddingHorizontal: Spacing.md, maxWidth: 560, gap: 10 },
  emptyMark: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  emptyTitle: { textAlign: 'center' },
  modelChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  suggestions: { flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 6 },
  suggestion: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: Radius.pill },
  readButton: { alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.pill, marginTop: 4 },
  regenerate: { alignItems: 'center', gap: 5, paddingVertical: 4 },
  streamingDots: { marginTop: 2 },
  followUps: { flexWrap: 'wrap', gap: 6, marginTop: 8 },
  followUp: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
  sources: { marginTop: 6, marginBottom: 2, marginHorizontal: 4 },
  sourceExcerpt: { marginTop: 6, padding: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  root: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: Spacing.md, paddingBottom: 9, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerButton: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, alignItems: 'center' },
  headerTitle: { textAlign: 'center' },
  headerSubtitle: { textAlign: 'center', marginTop: 1 },
  messageList: { flex: 1 },
  messages: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  emptyMessages: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center', maxWidth: 380 },
  messageRow: { width: '100%', marginBottom: 10 },
  userRow: { alignItems: 'flex-end' },
  assistantRow: { alignItems: 'flex-start' },
  messageColumn: { minWidth: 0, flexShrink: 1 },
  userMessageColumn: { maxWidth: '82%' },
  assistantMessageColumn: { width: '100%', maxWidth: 760 },
  aiLabel: { marginBottom: 3, marginHorizontal: 7 },
  userBubble: { maxWidth: '100%', minWidth: 0, flexShrink: 1, overflow: 'hidden', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 10 },
  assistantContent: { maxWidth: '100%', minWidth: 0, flexShrink: 1, paddingHorizontal: 7, paddingVertical: 3 },
  loadingDots: { minWidth: 35, height: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 2 },
  loadingDot: { textAlign: 'center' },
  sentAttachmentScroll: { maxWidth: '100%', height: 80, flexGrow: 0 },
  sentAttachments: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sentImage: { width: 80, height: 80, borderRadius: Radius.md },
  messageAfterFiles: { marginTop: 4 },
  fileChip: { minWidth: 128, maxWidth: 210, minHeight: 42, borderRadius: Radius.sm, alignItems: 'center', gap: 7, paddingHorizontal: 9, paddingVertical: 6 },
  fileType: { alignItems: 'center', justifyContent: 'center', width: 28 },
  fileName: { flexShrink: 1 },
  copyButton: { alignSelf: 'flex-start', marginTop: 4, marginHorizontal: 7, padding: 2, alignItems: 'center', gap: 5 },
  copyIconStack: { width: COPY_ICON_SIZE, height: COPY_ICON_SIZE, alignItems: 'center', justifyContent: 'center' },
  copyIconLayer: { alignItems: 'center', justifyContent: 'center' },
  copyFillMask: { position: 'absolute', left: COPY_ICON_CENTER - COPY_FILL_MAX / 2, top: COPY_ICON_CENTER - COPY_FILL_MAX / 2, width: COPY_FILL_MAX, height: COPY_FILL_MAX, borderRadius: Radius.pill, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  copyFillInner: { width: COPY_ICON_SIZE, height: COPY_ICON_SIZE, alignItems: 'center', justifyContent: 'center' },
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
  composer: { width: '100%', maxWidth: '100%', minWidth: 0, minHeight: 52, maxHeight: 116, borderRadius: 28, flexDirection: 'row', alignItems: 'flex-end', padding: 6, gap: 7 },
  composerButton: { width: 40, height: 40, flexShrink: 0, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  sendButton: { width: 40, height: 40, flexShrink: 0, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  micButton: { width: 31, height: 40, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  micFill: { position: 'absolute', width: 34, height: 34, borderRadius: Radius.pill },
  input: { flex: 1, minWidth: 0, minHeight: 40, maxHeight: 96, paddingHorizontal: 4, paddingVertical: 9 },
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
