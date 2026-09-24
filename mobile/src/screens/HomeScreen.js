/** Home calendar plus the live subject and lecture progress dashboard. */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useUserCalendarEvents } from '../calendar/userCalendarEvents';
import CalendarAlertModal from '../components/CalendarAlertModal';
import CalendarStrip from '../components/CalendarStrip';
import DayTimelineModal from '../components/DayTimelineModal';
import EventEditorModal from '../components/EventEditorModal';
import ScreenContainer from '../components/ScreenContainer';
import SubjectActionOverlay from '../components/SubjectActionOverlay';
import SubjectDashboard from '../components/SubjectDashboard';
import SubjectEditorModal from '../components/SubjectEditorModal';
import SubjectSheet, { LectureInfoSheet } from '../components/SubjectSheet';
import { Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import { lectureChatKey, useLectureChatStore } from '../subjects/lectureChatStore';
import { useSubjectStore } from '../subjects/subjectStore';
import FullCalendarScreen from './FullCalendarScreen';
import LectureChatScreen from './LectureChatScreen';
import { useAccount } from '../account/AccountContext';

export default function HomeScreen({ registerCurrentWeekReset, active = false, onOpenSettings }) {
  const { t } = usePreferences();
  const [timelineTarget, setTimelineTarget] = useState(null);
  const [fullCalendarOpen, setFullCalendarOpen] = useState(false);
  const [editorDate, setEditorDate] = useState(null);
  const [deleteCalendarTarget, setDeleteCalendarTarget] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [subjectEditor, setSubjectEditor] = useState(null);
  const [lectureEditorSubjectId, setLectureEditorSubjectId] = useState(null);
  const [lectureInfo, setLectureInfo] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [subjectActions, setSubjectActions] = useState(null);
  const [chatTarget, setChatTarget] = useState(null);
  const { events: userEvents, addEvent, removeEvent } = useUserCalendarEvents();
  const { subjects, addSubject, renameSubject, removeSubject, addLecture, removeLecture, toggleLectureComplete } = useSubjectStore();
  const { chats, startChat, sendMessage, stopReply, regenerateReply, renameChat, togglePinChat, removeChat, removeLectureChats, removeSubjectChats } = useLectureChatStore();
  const objects = userEvents;
  const selectedSubject = useMemo(() => subjects.find((subject) => subject.id === selectedSubjectId) || null, [selectedSubjectId, subjects]);
  const chatSubject = useMemo(() => subjects.find((subject) => subject.id === chatTarget?.subjectId) || null, [chatTarget?.subjectId, subjects]);
  const chatLecture = useMemo(() => chatSubject?.lectures.find((lecture) => lecture.id === chatTarget?.lectureId) || null, [chatSubject, chatTarget?.lectureId]);
  const chatThreads = chatTarget ? (chats[lectureChatKey(chatTarget.subjectId, chatTarget.lectureId)] || []) : [];

  useEffect(() => { if (!active) setSubjectActions(null); }, [active]);
  useEffect(() => { if (selectedSubjectId && !selectedSubject) setSelectedSubjectId(null); }, [selectedSubject, selectedSubjectId]);

  const openFullCalendar = useCallback(() => setFullCalendarOpen(true), []);
  const closeFullCalendar = useCallback(() => setFullCalendarOpen(false), []);
  const openTimeline = useCallback((date, focusTime = null) => setTimelineTarget({ date, focusTime }), []);
  const closeTimeline = useCallback(() => setTimelineTarget(null), []);
  const openMonthFromTimeline = useCallback(() => { setTimelineTarget(null); setFullCalendarOpen(true); }, []);
  const openEditor = useCallback((date) => setEditorDate(new Date(date)), []);
  const closeEditor = useCallback(() => setEditorDate(null), []);
  const saveEvent = useCallback((draft) => { addEvent(draft); setEditorDate(null); }, [addEvent]);
  const requestCalendarDelete = useCallback((object) => setDeleteCalendarTarget(object), []);
  const confirmCalendarDelete = useCallback(() => {
    if (deleteCalendarTarget) removeEvent(deleteCalendarTarget.id);
    setDeleteCalendarTarget(null);
  }, [deleteCalendarTarget, removeEvent]);

  const openSubject = useCallback((subject) => { setSubjectActions(null); setSelectedSubjectId(subject.id); }, []);
  const longPressSubject = useCallback((subject, anchor) => setSubjectActions({ subject, anchor }), []);
  const startCreateSubject = useCallback(() => { setSubjectActions(null); setSubjectEditor({ mode: 'create', subject: null }); }, []);
  const startRenameSubject = useCallback(() => setSubjectEditor({ mode: 'rename', subject: subjectActions?.subject }), [subjectActions]);
  const requestSubjectDelete = useCallback(() => {
    if (subjectActions?.subject) setDeleteTarget({ type: 'subject', subject: subjectActions.subject });
  }, [subjectActions]);
  const saveSubject = useCallback(({ name }) => {
    if (subjectEditor?.mode === 'rename') renameSubject(subjectEditor.subject.id, name);
    else addSubject(name);
    setSubjectEditor(null);
  }, [addSubject, renameSubject, subjectEditor]);
  const startLecture = useCallback(() => selectedSubject && setLectureEditorSubjectId(selectedSubject.id), [selectedSubject]);
  const saveLecture = useCallback((draft) => {
    if (lectureEditorSubjectId) addLecture(lectureEditorSubjectId, draft);
    setLectureEditorSubjectId(null);
  }, [addLecture, lectureEditorSubjectId]);
  const requestLectureDelete = useCallback((lecture) => {
    if (selectedSubject) setDeleteTarget({ type: 'lecture', subject: selectedSubject, lecture });
  }, [selectedSubject]);
  const openLectureChat = useCallback((lecture) => {
    if (!selectedSubject) return;
    setChatTarget({ subjectId: selectedSubject.id, lectureId: lecture.id });
    setSelectedSubjectId(null);
  }, [selectedSubject]);
  const closeLectureChat = useCallback(() => setChatTarget(null), []);
  const startLectureChat = useCallback(() => chatTarget ? startChat(chatTarget.subjectId, chatTarget.lectureId, t('newChat')) : null, [chatTarget, startChat, t]);
  const sendLectureMessage = useCallback((threadId, draft) => {
    if (chatTarget) sendMessage(chatTarget.subjectId, chatTarget.lectureId, threadId, {
      ...draft,
      subject: chatSubject,
      lecture: chatLecture,
    });
  }, [chatLecture, chatSubject, chatTarget, sendMessage]);
  const stopLectureReply = useCallback((threadId) => {
    if (chatTarget) stopReply(chatTarget.subjectId, chatTarget.lectureId, threadId);
  }, [chatTarget, stopReply]);
  const regenerateLectureReply = useCallback((threadId) => {
    if (chatTarget) regenerateReply(chatTarget.subjectId, chatTarget.lectureId, threadId, { subject: chatSubject, lecture: chatLecture });
  }, [chatLecture, chatSubject, chatTarget, regenerateReply]);
  const renameLectureChat = useCallback((threadId, title) => {
    if (chatTarget) renameChat(chatTarget.subjectId, chatTarget.lectureId, threadId, title);
  }, [chatTarget, renameChat]);
  const toggleLectureChatPin = useCallback((threadId) => {
    if (chatTarget) togglePinChat(chatTarget.subjectId, chatTarget.lectureId, threadId);
  }, [chatTarget, togglePinChat]);
  const deleteLectureChat = useCallback((threadId) => {
    if (chatTarget) removeChat(chatTarget.subjectId, chatTarget.lectureId, threadId);
  }, [chatTarget, removeChat]);
  const { openAccount } = useAccount();
  const selectChatProfileItem = useCallback((id) => {
    if (id === 'profile') { openAccount(); return; }
    if (id !== 'settings') return;
    setChatTarget(null);
    requestAnimationFrame(() => onOpenSettings?.());
  }, [onOpenSettings, openAccount]);
  const confirmContentDelete = useCallback(() => {
    if (deleteTarget?.type === 'subject') {
      removeSubjectChats(deleteTarget.subject.id);
      removeSubject(deleteTarget.subject.id);
      if (selectedSubjectId === deleteTarget.subject.id) setSelectedSubjectId(null);
    } else if (deleteTarget?.type === 'lecture') {
      removeLectureChats(deleteTarget.subject.id, deleteTarget.lecture.id);
      removeLecture(deleteTarget.subject.id, deleteTarget.lecture.id);
    }
    setDeleteTarget(null);
  }, [deleteTarget, removeLecture, removeLectureChats, removeSubject, removeSubjectChats, selectedSubjectId]);

  return (
    <ScreenContainer>
      <View style={styles.calendarSection}>
        <CalendarStrip registerReset={registerCurrentWeekReset} objects={objects} onSelectDay={openTimeline} onOpenMonth={openFullCalendar} />
      </View>
      <SubjectDashboard subjects={subjects} active={active} onOpenSubject={openSubject} onCreateSubject={startCreateSubject} onLongPressSubject={longPressSubject} />

      <FullCalendarScreen visible={fullCalendarOpen} objects={objects} onClose={closeFullCalendar} onSelectDay={openTimeline} onCreateEvent={openEditor} onDeleteEvent={requestCalendarDelete} />
      <DayTimelineModal visible={!!timelineTarget} date={timelineTarget?.date} focusTime={timelineTarget?.focusTime} objects={objects} onClose={closeTimeline} onOpenMonth={openMonthFromTimeline} onCreateEvent={openEditor} onDeleteEvent={requestCalendarDelete} />
      <EventEditorModal visible={!!editorDate} initialDate={editorDate} onCancel={closeEditor} onSave={saveEvent} />
      <CalendarAlertModal visible={!!deleteCalendarTarget} title={t('deleteEvent')} message={t('deleteEventConfirm')} onClose={() => setDeleteCalendarTarget(null)} onConfirm={confirmCalendarDelete} destructive />

      <SubjectSheet visible={!!selectedSubject} subject={selectedSubject} onClose={() => setSelectedSubjectId(null)} onCreateLecture={startLecture} onDeleteLecture={requestLectureDelete} onToggleLecture={(lecture) => selectedSubject && toggleLectureComplete(selectedSubject.id, lecture.id)} onOpenChat={openLectureChat} onOpenLecture={setLectureInfo} />
      <LectureInfoSheet visible={!!lectureInfo} lecture={lectureInfo} onClose={() => setLectureInfo(null)} />
      <SubjectEditorModal visible={!!subjectEditor} title={subjectEditor?.mode === 'rename' ? t('renameSubject') : t('createSubject')} initialValue={subjectEditor?.subject?.name || ''} placeholder={t('subjectName')} onCancel={() => setSubjectEditor(null)} onConfirm={saveSubject} />
      <SubjectEditorModal visible={!!lectureEditorSubjectId} title={t('newLectureChat')} placeholder={t('lectureName')} allowFiles onCancel={() => setLectureEditorSubjectId(null)} onConfirm={saveLecture} />
      <SubjectActionOverlay visible={!!subjectActions} anchor={subjectActions?.anchor} onClose={() => setSubjectActions(null)} onRename={startRenameSubject} onDelete={requestSubjectDelete} />
      <CalendarAlertModal visible={!!deleteTarget} title={deleteTarget?.type === 'subject' ? t('deleteSubject') : t('deleteLecture')} message={deleteTarget?.type === 'subject' ? t('deleteSubjectConfirm') : t('deleteLectureConfirm')} onClose={() => setDeleteTarget(null)} onConfirm={confirmContentDelete} destructive />
      <LectureChatScreen key={chatTarget ? lectureChatKey(chatTarget.subjectId, chatTarget.lectureId) : 'closed-chat'} visible={!!chatTarget && !!chatLecture} subject={chatSubject} lecture={chatLecture} threads={chatThreads} onClose={closeLectureChat} onStartChat={startLectureChat} onSend={sendLectureMessage} onStop={stopLectureReply} onRegenerate={regenerateLectureReply} onRenameChat={renameLectureChat} onTogglePinChat={toggleLectureChatPin} onDeleteChat={deleteLectureChat} onProfileSelect={selectChatProfileItem} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  calendarSection: { marginBottom: Spacing.md },
});
