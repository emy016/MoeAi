/** Subject lecture/chat grid plus the nested lecture-information sheet. */
import React, { useCallback } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowDownTrayIcon, CheckIcon, PlusIcon, XMarkIcon } from 'react-native-heroicons/solid';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import { lectureProgress } from '../subjects/subjectStore';
import ElasticPressable from './ElasticPressable';
import SwipeableBottomSheet from './SwipeableBottomSheet';

function LectureProgress({ value }) {
  const { colors, type } = usePreferences();
  const progress = Math.max(0, Math.min(1, Number(value) || 0));
  return (
    <View style={styles.progressRow}>
      <View style={[styles.progressTrack, { backgroundColor: colors.track }]}><View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${progress * 100}%` }]} /></View>
      <Text style={[styles.progressPercent, { color: colors.textPrimary }, type(11, 'bold', 14)]}>{Math.round(progress * 100)}%</Text>
    </View>
  );
}

const LectureTile = React.memo(function LectureTile({ lecture, index, canDelete, onDelete, onToggleComplete, onOpenChat, onLongPress }) {
  const { colors, type, t, isRTL } = usePreferences();
  const progress = lectureProgress(lecture);
  return (
    <View style={[styles.tileWrap, { backgroundColor: colors.cardButton }]}>
      <ElasticPressable shape="pill" style={styles.tilePressable} pressableStyle={styles.tileHit} onPress={() => onOpenChat(lecture)} onLongPress={() => onLongPress(lecture)} delayLongPress={320} accessibilityRole="button">
        <>
          <View style={[styles.lectureCopy, { paddingRight: isRTL ? 0 : (canDelete ? 68 : 32), paddingLeft: isRTL ? (canDelete ? 68 : 32) : 0 }]}>
            <Text numberOfLines={1} style={[{ color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }, type(10, 'semiBold', 13)]}>{t('lectureNumber', { number: index + 1 })}</Text>
            <Text numberOfLines={2} style={[styles.lectureTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(13, 'bold', 17)]}>{lecture.title}</Text>
          </View>
          <LectureProgress value={progress} />
        </>
      </ElasticPressable>
      <View style={[styles.lectureActions, isRTL && styles.lectureActionsRTL]}>
        <ElasticPressable shape="circle" onPress={() => onToggleComplete?.(lecture)} accessibilityRole="checkbox" accessibilityState={{ checked: lecture.completedOverride }}>
          <View style={[styles.tileActionCircle, { backgroundColor: lecture.completedOverride ? colors.accent : colors.card }]}><CheckIcon size={14} color={lecture.completedOverride ? colors.background : colors.accent} /></View>
        </ElasticPressable>
        {canDelete && <ElasticPressable shape="circle" onPress={() => onDelete(lecture)} accessibilityRole="button"><View style={[styles.tileActionCircle, { backgroundColor: colors.card }]}><XMarkIcon size={14} color={colors.danger} /></View></ElasticPressable>}
      </View>
    </View>
  );
});

export function LectureInfoSheet({ visible, lecture, onClose }) {
  const { colors, type, t, language, isRTL } = usePreferences();
  const download = useCallback((file) => { if (file.uri) Linking.openURL(file.uri).catch(() => {}); }, []);
  if (!lecture && !visible) return null;
  const created = lecture?.createdAt ? new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lecture.createdAt)) : t('notAvailable');
  return (
    <SwipeableBottomSheet visible={visible} title={lecture?.title || ''} onClose={onClose}>
      <Text style={[{ color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }, type(11, 'bold', 15)]}>{t('lectureCreated')}</Text>
      <Text style={[styles.infoValue, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(13, 'semiBold', 18)]}>{created}</Text>
      <Text style={[styles.filesTitle, { color: colors.textMuted, textAlign: isRTL ? 'right' : 'left' }, type(11, 'bold', 15)]}>{t('lectureFiles')}</Text>
      {lecture?.files?.length ? lecture.files.map((file) => (
        <View key={file.id || file.name} style={[styles.fileRow, { backgroundColor: colors.cardButton, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text numberOfLines={1} style={[styles.fileCopy, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, type(12, 'semiBold', 16)]}>{file.name}</Text>
          <ElasticPressable shape="circle" onPress={() => download(file)} disabled={!file.uri} accessibilityRole="button">
            <View style={[styles.downloadButton, { backgroundColor: file.uri ? colors.accent : colors.track, opacity: file.uri ? 1 : 0.55 }]}><ArrowDownTrayIcon size={17} color={colors.background} /></View>
          </ElasticPressable>
        </View>
      )) : <Text style={[{ color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }, type(13, 'regular', 18)]}>{t('noFiles')}</Text>}
    </SwipeableBottomSheet>
  );
}

export default function SubjectSheet({ visible, subject, onClose, onCreateLecture, onDeleteLecture, onToggleLecture, onOpenChat, onOpenLecture }) {
  const { colors, type, t, isRTL } = usePreferences();
  const userOwned = subject?.owner === 'user';
  if (!subject && !visible) return null;
  return (
    <SwipeableBottomSheet visible={visible} title={subject?.name || ''} onClose={onClose} sheetStyle={styles.sheet}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.grid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {subject?.lectures?.map((lecture, index) => <LectureTile key={lecture.id} lecture={lecture} index={index} canDelete={userOwned} onDelete={onDeleteLecture} onToggleComplete={onToggleLecture} onOpenChat={onOpenChat} onLongPress={onOpenLecture} />)}
        {userOwned && (
          <ElasticPressable shape="pill" style={styles.newChatWrap} pressableStyle={[styles.newChat, { borderColor: colors.track }]} onPress={onCreateLecture} accessibilityRole="button">
            <View style={styles.newChatContent}>
              <View style={[styles.newChatIcon, { backgroundColor: colors.cardButton }]}><PlusIcon size={20} color={colors.textPrimary} /></View>
              <Text numberOfLines={2} style={[styles.newChatText, { color: colors.textPrimary }, type(12, 'bold', 16)]}>{t('startNewChat')}</Text>
            </View>
          </ElasticPressable>
        )}
      </ScrollView>
    </SwipeableBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { minHeight: 300 },
  scroll: { maxHeight: 480 },
  grid: { flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.sm, paddingBottom: Spacing.sm },
  tileWrap: { width: '48%', minHeight: 96, borderRadius: Radius.md, overflow: 'hidden', position: 'relative' },
  tilePressable: { flex: 1 },
  tileHit: { flex: 1, minHeight: 96, padding: 12, justifyContent: 'flex-start' },
  lectureCopy: { flex: 1 },
  lectureTitle: { marginTop: 2 },
  lectureActions: { position: 'absolute', top: 7, right: 7, flexDirection: 'row', gap: 4 },
  lectureActionsRTL: { right: undefined, left: 7, flexDirection: 'row-reverse' },
  tileActionCircle: { width: 25, height: 25, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: Spacing.sm },
  progressTrack: { flex: 1, height: 7, borderRadius: Radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radius.pill },
  progressPercent: { minWidth: 31, textAlign: 'right' },
  newChatWrap: { width: '48%', minHeight: 96 },
  newChat: { flex: 1, minHeight: 96, borderRadius: 28, borderWidth: 2, borderStyle: 'dashed', backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  newChatContent: { alignItems: 'center', justifyContent: 'center', padding: Spacing.sm },
  newChatIcon: { width: 38, height: 38, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  newChatText: { textAlign: 'center' },
  infoValue: { marginTop: 3 },
  filesTitle: { marginTop: Spacing.lg, marginBottom: Spacing.sm },
  fileRow: { minHeight: 48, borderRadius: Radius.md, alignItems: 'center', paddingLeft: 13, paddingRight: 6, marginBottom: Spacing.sm, gap: Spacing.sm },
  fileCopy: { flex: 1 },
  downloadButton: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
