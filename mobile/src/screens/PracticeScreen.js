/** Study sessions, saved explanations, and the existing ranked arena. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, PanResponder, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AcademicCapIcon, ArchiveBoxIcon, ArrowLeftIcon, CheckCircleIcon, DocumentTextIcon, MagnifyingGlassIcon, PencilSquareIcon, RectangleStackIcon, Squares2X2Icon, XCircleIcon } from 'react-native-heroicons/outline';
import { API_BASE_URL } from '../ai/client';
import Card from '../components/Card';
import ElasticPressable from '../components/ElasticPressable';
import ProgressRing from '../components/ProgressRing';
import ScreenContainer from '../components/ScreenContainer';
import SiteFrame from '../components/SiteFrame';
import SubjectIcon from '../components/SubjectIcon';
import SwipeableBottomSheet from '../components/SwipeableBottomSheet';
import WheelPicker from '../components/WheelPicker';
import { Radius, Spacing, TabBar } from '../constants/layout';
import { DifficultyColors } from '../constants/colors';
import { usePreferences } from '../context/AppPreferences';
import { DAILY_LIMITS, QUESTION_TYPES, explainObjective, generateExamQuestions, generateFlashcards, generateQuestions, gradeEssay, gradeObjective } from '../practice/practiceEngine';
import { usePracticeStore } from '../practice/practiceStore';
import { useSubjectStore } from '../subjects/subjectStore';

const TYPE_NAMES = { mcq: 'Multiple Choice', essay: 'Essay', blank: 'Fill in the Blank', boolean: 'True / False' };
const TYPE_ICONS = { mcq: Squares2X2Icon, essay: PencilSquareIcon, blank: DocumentTextIcon, boolean: CheckCircleIcon };
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const DIFFICULTY_COLORS = [DifficultyColors.easy, DifficultyColors.medium, DifficultyColors.hard];
const HOURS = Array.from({ length: 24 }, (_, value) => ({ value, label: String(value).padStart(2, '0') }));
const MINUTES = Array.from({ length: 60 }, (_, value) => ({ value, label: String(value).padStart(2, '0') }));
const cap = (x, low, high) => Math.max(low, Math.min(high, x));

const clock = (value) => {
  const h = Math.floor(value / 3600);
  const m = Math.floor((value % 3600) / 60);
  const sec = String(value % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

/** The exam clock: time left, a bar that drains, and a color that warns in the last minutes. */
function ExamTimer({ seconds, total, index, count }) {
  const { colors, type } = usePreferences();
  const share = total ? cap(seconds / total, 0, 1) : 0;
  const urgent = seconds <= 60 || share <= 0.1;
  const warn = !urgent && (seconds <= 300 || share <= 0.25);
  const tone = urgent ? colors.danger : warn ? DifficultyColors.medium : colors.accent;
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!urgent) { pulse.setValue(1); return undefined; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.55, duration: 450, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse, urgent]);
  return (
    <View style={[s.timer, { backgroundColor: colors.cardButton }]} accessibilityRole="timer" accessibilityLabel={`Time left ${clock(seconds)}`}>
      <View style={s.timerRow}>
        <View>
          <Text style={[{ color: colors.textMuted }, type(11, 'bold', 14)]}>EXAM MODE · TIME LEFT</Text>
          <Animated.Text style={[{ color: tone, opacity: pulse, fontVariant: ['tabular-nums'] }, type(30, 'bold', 36)]}>{clock(seconds)}</Animated.Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[{ color: colors.textMuted }, type(11, 'bold', 14)]}>QUESTION</Text>
          <Text style={[{ color: colors.textPrimary }, type(20, 'bold', 26)]}>{index + 1}<Text style={[{ color: colors.textMuted }, type(14, 'semiBold', 26)]}> / {count}</Text></Text>
        </View>
      </View>
      <View style={[s.timerTrack, { backgroundColor: colors.track }]}>
        <View style={[s.timerFill, { width: `${share * 100}%`, backgroundColor: tone }]} />
      </View>
      {urgent ? <Text style={[{ color: colors.danger }, type(12, 'bold', 16)]}>Last minute. Your answers are submitted automatically when time runs out.</Text>
        : warn ? <Text style={[{ color: colors.textSecondary }, type(12, 'semiBold', 16)]}>Less than {Math.ceil(seconds / 60)} minutes left. Wrap up long answers.</Text> : null}
    </View>
  );
}

function Label({ children, muted, style }) {
  const { colors, type } = usePreferences();
  return <Text style={[{ color: muted ? colors.textMuted : colors.textPrimary }, type(13, 'bold', 18), style]}>{children}</Text>;
}
function Button({ children, onPress, secondary, disabled, style, icon: Icon }) {
  const { colors, type } = usePreferences();
  return <ElasticPressable shape="pill" onPress={onPress} disabled={disabled} style={style} pressableStyle={[s.button, { backgroundColor: disabled ? colors.track : secondary ? colors.cardButton : colors.accent }]} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }}>{Icon ? <Icon size={19} color={secondary ? colors.danger : colors.white}/> : null}<Text style={[{ color: disabled ? colors.textMuted : secondary ? colors.textPrimary : colors.white }, type(13, 'bold', 18)]}>{children}</Text></ElasticPressable>;
}
function Chip({ selected, onPress, children, subject }) {
  const { colors, type } = usePreferences();
  return <ElasticPressable shape="pill" onPress={onPress} pressableStyle={[s.chip, { backgroundColor: selected ? colors.accent : colors.cardButton }]} accessibilityRole="button" accessibilityState={{ selected }}>
    {subject ? <SubjectIcon name={subject.name} query={subject.iconQuery} size={18} color={selected ? colors.white : colors.textMuted}/> : null}
    <Text numberOfLines={1} style={[{ color: selected ? colors.white : colors.textPrimary }, type(12, 'semiBold', 16)]}>{children}</Text>
  </ElasticPressable>;
}
function SubjectSelector({ subjects, value, onChange }) {
  return <ScrollView horizontal style={s.horizontal} contentContainerStyle={s.row} showsHorizontalScrollIndicator={false}><Chip selected={!value} onPress={() => onChange(null)}>All</Chip>{subjects.map((subject) => <Chip key={subject.id} subject={subject} selected={value === subject.id} onPress={() => onChange(subject.id)}>{subject.name}</Chip>)}</ScrollView>;
}
function Difficulty({ value, onChange }) {
  const { colors, type, motion } = usePreferences();
  const progress = useRef(new Animated.Value(value / 2)).current;
  const [width, setWidth] = useState(1);
  const widthRef = useRef(1);
  const pageX = useRef(0);
  const last = useRef(value / 2);
  const ref = useRef(null);
  useEffect(() => { progress.setValue(value / 2); last.current = value / 2; }, [progress, value]);
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { progress.stopAnimation(); ref.current?.measureInWindow((x) => { pageX.current = x; }); },
    onPanResponderMove: (event, gesture) => { last.current = cap(((gesture.moveX || event.nativeEvent.pageX) - pageX.current) / widthRef.current, 0, 1); progress.setValue(last.current); },
    onPanResponderRelease: () => { const next = Math.round(last.current * 2); onChange(next); if (motion) Animated.spring(progress, { toValue: next / 2, stiffness: 420, damping: 32, mass: 0.6, useNativeDriver: false, isInteraction: false }).start(); else progress.setValue(next / 2); },
  }), [motion, onChange, progress]);
  return <><View ref={ref} onLayout={(event) => { widthRef.current = event.nativeEvent.layout.width; setWidth(widthRef.current); ref.current?.measureInWindow((x) => { pageX.current = x; }); }} style={s.slider} {...pan.panHandlers} accessibilityRole="adjustable" accessibilityLabel="Difficulty" accessibilityValue={{ text: DIFFICULTIES[value] }}><View style={[s.track, { backgroundColor: colors.track }]}/><Animated.View style={[s.fill, { backgroundColor: DIFFICULTY_COLORS[value], width: progress.interpolate({ inputRange: [0, 1], outputRange: [0, width] }) }]}/><Animated.View style={[s.thumb, { backgroundColor: DIFFICULTY_COLORS[value], transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, width] }) }] }]}/></View><View style={s.sliderLabels}>{DIFFICULTIES.map((name, index) => <Text key={name} onPress={() => onChange(index)} style={[{ color: value === index ? DIFFICULTY_COLORS[index] : colors.textMuted }, type(11, 'semiBold', 15)]}>{name}</Text>)}</View></>;
}
function Setup({ mode, close, archive, start, subjects, store, busy, error }) {
  const { colors, type } = usePreferences();
  const [subjectId, setSubjectId] = useState(null);
  const [lectureId, setLectureId] = useState(null);
  const [difficulty, setDifficulty] = useState(1);
  const [types, setTypes] = useState(['mcq']);
  const [counts, setCounts] = useState({ mcq: 5, essay: 0, blank: 0, boolean: 0 });
  const [minutes, setMinutes] = useState(30);
  const subject = subjects.find((item) => item.id === subjectId) || null;
  const lecture = subject?.lectures.find((item) => item.id === lectureId) || null;
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const kind = mode === 'exam' ? 'exams' : mode;
  const amount = mode === 'questions' ? 2 : mode === 'exam' ? 1 : 10;
  const settings = { mode, subject, lecture, difficulty: DIFFICULTIES[difficulty], types, counts, minutes };
  const toggle = (id) => setTypes((old) => old.includes(id) ? old.length > 1 ? old.filter((item) => item !== id) : old : [...old, id]);
  return <SwipeableBottomSheet visible={!!mode} title={mode === 'exam' ? 'Exam' : mode === 'flashcards' ? 'Flashcards' : 'Questions'} onClose={close}>
    <ScrollView style={s.setupScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={s.subjectHeading}>{mode !== 'flashcards' ? <ElasticPressable shape="circle" onPress={archive} accessibilityRole="button" accessibilityLabel="Solved questions archive"><ArchiveBoxIcon size={24} color={colors.textPrimary}/></ElasticPressable> : null}<Label>Subject</Label></View>
      <SubjectSelector subjects={subjects} value={subjectId} onChange={(id) => { setSubjectId(id); setLectureId(null); }}/>
      {subject ? <><Label style={s.section}>Lecture</Label><ScrollView horizontal contentContainerStyle={s.row} showsHorizontalScrollIndicator={false}><Chip selected={!lectureId} onPress={() => setLectureId(null)}>All</Chip>{subject.lectures.map((item) => <Chip key={item.id} selected={lectureId === item.id} onPress={() => setLectureId(item.id)}>{item.title}</Chip>)}</ScrollView></> : null}
      {mode === 'questions' ? <><Label style={s.section}>Question types</Label><View style={s.typeGrid}>{QUESTION_TYPES.map((id) => { const Icon = TYPE_ICONS[id]; const selected = types.includes(id); return <ElasticPressable key={id} onPress={() => toggle(id)} style={s.typeCell} pressableStyle={[s.typeTile, { backgroundColor: selected ? colors.accent : colors.cardButton }]} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}><Icon size={22} color={selected ? colors.white : colors.textPrimary}/><Text style={[{ color: selected ? colors.white : colors.textPrimary }, type(12, 'semiBold', 16)]}>{TYPE_NAMES[id]}</Text></ElasticPressable>; })}</View></> : null}
      {mode === 'exam' ? <><Label style={s.section}>Questions by type · {total} total</Label>{QUESTION_TYPES.map((id) => <View key={id} style={[s.countRow, { backgroundColor: colors.cardButton }]}><Text style={[{ color: colors.textPrimary }, type(12, 'semiBold', 16)]}>{TYPE_NAMES[id]}</Text><View style={s.row}><Text onPress={() => setCounts((old) => ({ ...old, [id]: Math.max(0, old[id] - 1) }))} style={[s.counter, { color: colors.accent }]}>−</Text><Label>{counts[id]}</Label><Text onPress={() => setCounts((old) => ({ ...old, [id]: Math.min(50, old[id] + 1) }))} style={[s.counter, { color: colors.accent }]}>+</Text></View></View>)}<Label style={s.section}>Time limit</Label><View style={s.row}>{[10, 30, 60].map((value) => <Chip key={value} selected={minutes === value} onPress={() => setMinutes(value)}>{value === 60 ? '1h' : `${value}m`}</Chip>)}</View><View style={s.wheels}><WheelPicker items={HOURS} value={Math.floor(minutes / 60)} onChange={(hour) => setMinutes(Math.max(1, hour * 60 + minutes % 60))} accessibilityLabel="Hours"/><WheelPicker items={MINUTES} value={minutes % 60} onChange={(minute) => setMinutes(Math.max(1, Math.floor(minutes / 60) * 60 + minute))} accessibilityLabel="Minutes"/></View></> : null}
      <Label style={s.section}>Difficulty</Label><Difficulty value={difficulty} onChange={setDifficulty}/>
      <Text style={[{ color: colors.textMuted, marginBottom: Spacing.md }, type(11)]}>{store.used(kind)} / {DAILY_LIMITS[kind]} {kind} generated today</Text>
      {error ? <Text style={{ color: colors.danger, marginBottom: Spacing.sm }}>{error}</Text> : null}
      <Button disabled={busy || !store.canGenerate(kind, amount) || (mode === 'exam' && (total < 1 || total > 50))} onPress={() => start(settings)}>{busy ? 'Loading…' : 'Start'}</Button>
    </ScrollView>
  </SwipeableBottomSheet>;
}
function Archive({ entries, subjects, close }) {
  const { colors, type } = usePreferences();
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [exam, setExam] = useState(null);
  const matches = entries.filter((entry) => (!selected || entry.subjectId === selected) && (!search || `${entry.question?.prompt || ''} ${entry.questions?.map((question) => question.prompt).join(' ') || ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())));
  return <ScreenContainer><View style={s.heading}><ElasticPressable shape="circle" onPress={exam ? () => setExam(null) : close} accessibilityRole="button" accessibilityLabel="Back"><ArrowLeftIcon size={23} color={colors.textPrimary}/></ElasticPressable><Text style={[{ color: colors.textPrimary }, type(20, 'bold', 26)]}>{exam ? 'Exam questions' : 'Archive'}</Text></View>
    {exam ? exam.questions.map((item, index) => <Card key={index}><Label>{index + 1}. {item.prompt}</Label><Text style={{ color: item.correct ? colors.accent : colors.danger }}>{item.correct ? '✓ Correct' : '✕ Incorrect'} · {item.response || 'Unanswered'}</Text><Text style={[{ color: colors.textSecondary }, type(12, 'regular', 18)]}>Answer: {item.answer}{'\n'}{item.feedback || item.explanation}</Text></Card>) : <><View style={[s.search, { backgroundColor: colors.card }]}><MagnifyingGlassIcon size={20} color={colors.textMuted}/><TextInput value={search} onChangeText={setSearch} placeholder="Search solved questions" placeholderTextColor={colors.textMuted} style={[{ flex: 1, color: colors.textPrimary }, type(13)]}/></View><SubjectSelector subjects={subjects} value={selected} onChange={setSelected}/>{matches.map((entry) => <ElasticPressable key={entry.id} onPress={entry.kind === 'exam' ? () => setExam(entry) : undefined} accessibilityRole="button"><Card style={{ gap: Spacing.sm }}><View style={s.row}>{entry.correct ? <CheckCircleIcon size={22} color={colors.accent}/> : <XCircleIcon size={22} color={colors.danger}/>}<Label style={{ flex: 1 }}>{entry.kind === 'exam' ? `Exam · ${entry.questions.length} questions` : entry.question.prompt}</Label></View><Text style={[{ color: colors.textMuted }, type(11)]}>{entry.subjectName} · {new Date(entry.at).toLocaleDateString()}</Text>{entry.kind === 'question' ? <Text style={[{ color: colors.textSecondary }, type(12, 'regular', 18)]}>Your answer: {entry.response}{'\n'}Answer: {entry.question.answer}{'\n'}{entry.feedback || entry.question.explanation}</Text> : <Label muted>Tap to see all questions</Label>}</Card></ElasticPressable>)}{!matches.length ? <Label muted style={{ textAlign: 'center', marginTop: Spacing.xl }}>No solved questions found.</Label> : null}</>}
  </ScreenContainer>;
}
function Question({ question, response, setResponse, feedback, exam }) {
  const { colors, type } = usePreferences();
  const choices = question.type === 'mcq' ? question.options : question.type === 'boolean' ? ['True', 'False'] : null;
  return <><Label style={{ fontSize: 16, marginBottom: Spacing.md }}>{question.prompt}</Label>{choices ? choices.map((option, index) => { const value = question.type === 'mcq' ? index : option; return <ElasticPressable key={index} onPress={() => setResponse(value)} disabled={!!feedback} pressableStyle={[s.option, { backgroundColor: response === value ? colors.accent : colors.cardButton }]} accessibilityRole="radio" accessibilityState={{ checked: response === value }}><Text style={[{ color: response === value ? colors.white : colors.textPrimary }, type(13)]}>{option}</Text></ElasticPressable>; }) : <TextInput multiline value={typeof response === 'string' ? response : ''} onChangeText={setResponse} editable={!feedback} placeholder={question.type === 'essay' ? 'Write your answer' : 'Fill in the blank'} placeholderTextColor={colors.textMuted} style={[s.input, { backgroundColor: colors.cardButton, color: colors.textPrimary }, type(13)]}/>}{feedback && !exam ? <View style={[s.feedback, { backgroundColor: colors.cardButton }]}>{feedback.correct ? <CheckCircleIcon size={22} color={colors.accent}/> : <XCircleIcon size={22} color={colors.danger}/>}<Text style={[{ color: colors.textPrimary, flex: 1 }, type(12, 'regular', 18)]}>{feedback.explanation}</Text></View> : null}</>;
}
function Flashcard({ card, flipped, progress, onFlip }) {
  const { colors, type } = usePreferences();
  const front = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const back = progress.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  return <ElasticPressable onPress={onFlip} pressableStyle={[s.flash, { backgroundColor: colors.card }]} accessibilityRole="button" accessibilityLabel="Flip flashcard">
    <Animated.View style={[s.flashFace, { transform: [{ rotateY: front }] }]}><Label muted>QUESTION · tap to flip</Label><Text style={[s.flashText, { color: colors.textPrimary }, type(20, 'bold', 27)]}>{card.front}</Text></Animated.View>
    <Animated.View style={[s.flashFace, { transform: [{ rotateY: back }] }]}><Label muted>ANSWER · tap to flip</Label><Text style={[s.flashText, { color: colors.textPrimary }, type(20, 'bold', 27)]}>{card.back}</Text></Animated.View>
  </ElasticPressable>;
}
function Arena({ active, onStats }) {
  const { colors, type } = usePreferences();
  const insets = useSafeAreaInsets();
  const [opened, setOpened] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { if (active) setOpened(true); }, [active]);
  useEffect(() => { if (!active) return undefined; let alive = true; fetch(`${API_BASE_URL}/api/dashboard`, { credentials: 'include' }).then((res) => res.json()).then((data) => { if (alive) onStats?.(data.stats || null); }).catch(() => {}); return () => { alive = false; }; }, [active, onStats]);
  const palette = `bg=${encodeURIComponent(colors.background)}&card=${encodeURIComponent(colors.card)}&accent=${encodeURIComponent(colors.accent)}&text=${encodeURIComponent(colors.textPrimary)}&muted=${encodeURIComponent(colors.textMuted)}`;
  return <View style={[s.arena, { backgroundColor: colors.background, paddingBottom: Platform.OS === 'web' ? TabBar.HEIGHT + TabBar.PILL_MARGIN_BOTTOM + insets.bottom : 0 }]}><View style={[s.arenaHeading, { backgroundColor: colors.card }]}><AcademicCapIcon size={24} color={colors.accent}/><Text style={[{ color: colors.textPrimary }, type(14, 'bold', 20)]}>Ranked Arena</Text></View>{opened ? <SiteFrame url={`${API_BASE_URL}/ranked?embed=1&${palette}`} title="MoeAI Arena" onLoad={() => setLoaded(true)}/> : null}{!loaded ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.center]}><ActivityIndicator color={colors.accent}/></View> : null}</View>;
}

export default function PracticeScreen({ active = false, onInnerTabChange, onArenaStats }) {
  const { colors, type, motion } = usePreferences();
  const { subjects } = useSubjectStore();
  const store = usePracticeStore();
  const [inner, setInner] = useState('Studying');
  const [mode, setMode] = useState(null);
  const [view, setView] = useState('home');
  const [session, setSession] = useState(null);
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [feedback, setFeedback] = useState({});
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState(null);
  const tabProgress = useRef(new Animated.Value(0)).current;
  const flipProgress = useRef(new Animated.Value(0)).current;
  const wasActive = useRef(false);
  const finishing = useRef(false);
  const timeoutSubmitted = useRef(false);
  const generating = useRef(false);
  const answering = useRef(false);
  useEffect(() => { if (active && !wasActive.current) { setInner('Studying'); onInnerTabChange?.('Studying'); tabProgress.setValue(0); } wasActive.current = active; }, [active, onInnerTabChange, tabProgress]);
  const switchInner = (next) => { setInner(next); onInnerTabChange?.(next); if (motion) Animated.spring(tabProgress, { toValue: next === 'Arena' ? 1 : 0, stiffness: 320, damping: 28, mass: 0.72, useNativeDriver: true, isInteraction: false }).start(); else tabProgress.setValue(next === 'Arena' ? 1 : 0); };
  const start = async (settings) => {
    const kind = settings.mode === 'exam' ? 'exams' : settings.mode;
    const amount = settings.mode === 'questions' ? 2 : settings.mode === 'exam' ? 1 : 10;
    if (!store.canGenerate(kind, amount) || generating.current) return;
    generating.current = true;
    setBusy(true); setError('');
    try {
      const items = settings.mode === 'flashcards' ? await generateFlashcards(settings) : settings.mode === 'exam' ? await generateExamQuestions(settings) : await generateQuestions(settings, 2);
      if (!store.recordGeneration(kind, amount)) throw new Error('Daily limit reached.');
      timeoutSubmitted.current = false; setSession({ mode: settings.mode, settings, items, deadline: Date.now() + settings.minutes * 60000 }); setIndex(0); setResponses({}); setFeedback({}); setFlipped(false); flipProgress.setValue(0); setSeconds(settings.minutes * 60); setMode(null); setView('session');
    } catch (cause) { setError(cause?.message || 'Could not start. Please try again.'); } finally { generating.current = false; setBusy(false); }
  };
  const finish = useCallback(async () => {
    if (!session || finishing.current) return;
    finishing.current = true; setBusy(true);
    const graded = { ...feedback };
    try {
      if (session.mode === 'exam') {
        for (let i = 0; i < session.items.length; i += 1) {
          const question = session.items[i];
          const response = responses[i];
          if ((question.type === 'essay' || question.type === 'blank') && String(response || '').trim()) {
            try { graded[i] = await gradeEssay(question, response, session.settings); }
            catch (_) { graded[i] = { correct: false, explanation: question.explanation }; }
          } else graded[i] = { correct: response !== undefined && response !== '' && gradeObjective(question, response), explanation: question.explanation };
        }
        store.archiveExam({ subjectId: session.settings.subject?.id || null, subjectName: session.settings.subject?.name || 'All subjects', correct: Object.values(graded).every((item) => item.correct), questions: session.items.map((question, i) => ({ ...question, response: question.type === 'mcq' ? question.options[responses[i]] : responses[i], correct: graded[i].correct, feedback: graded[i].explanation })) });
      }
      setResult({ correct: Object.values(graded).filter((item) => item.correct).length, total: session.mode === 'exam' ? session.items.length : Object.keys(graded).length, answers: session.mode === 'exam' ? session.items.map((question, i) => ({ question, response: question.type === 'mcq' ? question.options[responses[i]] : responses[i], ...graded[i] })) : null }); setView('result');
    } catch (cause) { setError(cause?.message || 'Could not grade the exam. Please try again.'); } finally { setBusy(false); finishing.current = false; }
  }, [feedback, responses, session, store]);
  useEffect(() => { if (view !== 'session' || session?.mode !== 'exam') return undefined; const remaining = Math.max(0, Math.ceil((session.deadline - Date.now()) / 1000)); if (remaining !== seconds) setSeconds(remaining); if (remaining === 0) { if (!timeoutSubmitted.current) { timeoutSubmitted.current = true; finish(); } return undefined; } const timer = setTimeout(() => setSeconds(Math.max(0, Math.ceil((session.deadline - Date.now()) / 1000))), 1000); return () => clearTimeout(timer); }, [view, session, seconds, finish]);
  const question = session?.items[index];
  const response = responses[index];
  const answer = async () => {
    if (!question || response === undefined || String(response).trim() === '' || answering.current || feedback[index]) return;
    answering.current = true;
    setBusy(true); setError('');
    try {
      let graded;
      if (question.type === 'essay' || question.type === 'blank') graded = await gradeEssay(question, response, session.settings);
      else {
        let explanation = question.explanation;
        try { explanation = await explainObjective(question, response, session.settings); } catch (_) { /* the saved AI explanation from generation remains available */ }
        graded = { correct: gradeObjective(question, response), explanation };
      }
      setFeedback((old) => ({ ...old, [index]: graded }));
      store.archiveQuestion({ subjectId: session.settings.subject?.id || null, subjectName: session.settings.subject?.name || 'All subjects', lectureId: session.settings.lecture?.id || null, question, response: question.type === 'mcq' ? question.options[response] : response, correct: graded.correct, feedback: graded.explanation });
    } catch (cause) { setError(cause?.message || 'Could not grade this answer.'); } finally { answering.current = false; setBusy(false); }
  };
  const next = async () => {
    if (!feedback[index] || generating.current) return;
    if (index < session.items.length - 1) { setIndex(index + 1); return; }
    if (!store.canGenerate('questions', 2)) { finish(); return; }
    generating.current = true; setBusy(true); setError('');
    try { const items = await generateQuestions(session.settings, 2); if (!store.recordGeneration('questions', 2)) throw new Error('Daily limit reached.'); setSession((old) => ({ ...old, items: [...old.items, ...items] })); setIndex(index + 1); }
    catch (cause) { setError(cause?.message || 'Could not load questions.'); } finally { generating.current = false; setBusy(false); }
  };
  const tally = (correct) => { const nextFeedback = { ...feedback, [index]: { correct } }; setFeedback(nextFeedback); setFlipped(false); flipProgress.setValue(0); if (index + 1 < session.items.length) setIndex(index + 1); else { setResult({ correct: Object.values(nextFeedback).filter((item) => item.correct).length, total: session.items.length }); setView('result'); } };
  const closeResult = () => { setView('home'); setSession(null); setResult(null); setError(''); };
  return <View style={[s.root, { backgroundColor: colors.background }]}>
    {view === 'home' ? <><View style={[s.tabs, { backgroundColor: colors.cardButton }]}><Animated.View pointerEvents="none" style={[s.indicator, { backgroundColor: colors.accent, transform: [{ translateX: tabProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 144] }) }] }]}/>{['Studying', 'Arena'].map((name) => <ElasticPressable key={name} shape="pill" onPress={() => switchInner(name)} style={s.tab} pressableStyle={s.tabButton} accessibilityRole="tab" accessibilityState={{ selected: inner === name }}><Text style={[{ color: inner === name ? colors.white : colors.textMuted }, type(13, 'bold', 18)]}>{name}</Text></ElasticPressable>)}</View>{inner === 'Arena' ? <Arena active={active} onStats={onArenaStats}/> : <ScreenContainer><View style={s.cards}><ElasticPressable onPress={() => { setError(''); setMode('questions'); }} style={s.square} pressableStyle={[s.tile, { backgroundColor: colors.card }]} accessibilityRole="button" accessibilityLabel="Questions"><AcademicCapIcon size={42} color={colors.accent}/><Label style={s.tileTitle}>Questions</Label></ElasticPressable><ElasticPressable onPress={() => { setError(''); setMode('exam'); }} style={s.square} pressableStyle={[s.tile, { backgroundColor: colors.card }]} accessibilityRole="button" accessibilityLabel="Exam"><DocumentTextIcon size={42} color={colors.accent}/><Label style={s.tileTitle}>Exam</Label></ElasticPressable><ElasticPressable onPress={() => { setError(''); setMode('flashcards'); }} style={s.wide} pressableStyle={[s.tile, { backgroundColor: colors.card }]} accessibilityRole="button" accessibilityLabel="Flashcards"><RectangleStackIcon size={42} color={colors.accent}/><Label style={s.tileTitle}>Flashcards</Label></ElasticPressable></View></ScreenContainer>}</> : null}
    {view === 'archive' ? <Archive entries={store.archive} subjects={subjects} close={() => setView('home')}/> : null}
    {view === 'session' && session ? <ScreenContainer>{session.mode === 'exam' ? <ExamTimer seconds={seconds} total={session.settings.minutes * 60} index={index} count={session.items.length} /> : <View style={s.heading}><Label>{session.mode === 'flashcards' ? 'Flashcards' : 'Questions'}</Label><Label muted>{index + 1} / {session.items.length}</Label></View>}{session.mode === 'flashcards' ? <><Flashcard card={question} flipped={flipped} progress={flipProgress} onFlip={() => { setFlipped((old) => !old); if (motion) Animated.spring(flipProgress, { toValue: flipped ? 0 : 1, stiffness: 220, damping: 22, mass: 0.75, useNativeDriver: true }).start(); else flipProgress.setValue(flipped ? 0 : 1); }}/><View style={s.footer}><Button secondary icon={XCircleIcon} onPress={() => tally(false)} style={s.flex}>Wrong</Button><Button icon={CheckCircleIcon} onPress={() => tally(true)} style={s.flex}>Right</Button></View><Button secondary onPress={finish}>Quit</Button></> : <><Card><Question question={question} response={responses[index]} setResponse={(value) => setResponses((old) => ({ ...old, [index]: value }))} feedback={feedback[index]} exam={session.mode === 'exam'}/></Card>{error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}{session.mode === 'exam' ? <><View style={s.footer}><Button secondary onPress={() => setIndex(Math.max(0, index - 1))} disabled={index === 0} style={s.flex}>← Previous</Button><Button secondary onPress={() => setIndex(Math.min(session.items.length - 1, index + 1))} disabled={index === session.items.length - 1} style={s.flex}>Next →</Button></View><Button onPress={finish} disabled={busy}>{busy ? 'Grading…' : 'Submit exam'}</Button></> : <>{!feedback[index] ? <Button onPress={answer} disabled={busy || response === undefined || String(response).trim() === ''}>{busy ? 'Checking…' : 'Check answer'}</Button> : null}<View style={s.footer}><Button secondary onPress={finish} style={s.flex}>Quit</Button><Button onPress={next} disabled={!feedback[index] || busy} style={s.flex}>{busy ? 'Loading…' : 'Next'}</Button></View></>}</>}</ScreenContainer> : null}
    {view === 'result' && result ? <Modal visible animationType={motion ? 'fade' : 'none'} presentationStyle="fullScreen" onRequestClose={closeResult}><ScreenContainer><View style={s.result}><Text style={[{ color: colors.textPrimary }, type(24, 'bold', 30)]}>{session?.mode === 'exam' ? 'Exam result' : 'Session result'}</Text><View style={s.ring}><ProgressRing completed={result.correct} total={result.total} active size={210}/><Text style={[s.score, { color: colors.textPrimary }, type(31, 'bold', 38)]}>{result.correct}/{result.total}</Text></View><Label muted>answered correctly</Label>{result.answers ? result.answers.map((item, i) => <Card key={item.question.id} style={{ width: '100%' }}><Label>{i + 1}. {item.question.prompt}</Label><Text style={{ color: item.correct ? colors.accent : colors.danger }}>{item.correct ? '✓ Correct' : '✕ Incorrect'}</Text><Text style={[{ color: colors.textSecondary }, type(12, 'regular', 18)]}>Your answer: {item.response || 'Unanswered'}{'\n'}Answer: {item.question.answer}{'\n'}{item.explanation}</Text></Card>) : null}<Button onPress={closeResult} style={{ width: '100%' }}>Done</Button></View></ScreenContainer></Modal> : null}
    <Setup key={mode || 'closed'} mode={mode} close={() => setMode(null)} archive={() => { setMode(null); setView('archive'); }} start={start} subjects={subjects} store={store} busy={busy} error={error}/>
  </View>;
}

const s = StyleSheet.create({
  timer: { borderRadius: Radius.lg || 18, padding: 14, gap: 10, marginBottom: Spacing.sm },
  timerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  timerTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  timerFill: { height: 6, borderRadius: 3 },
  root: { flex: 1 }, center: { alignItems: 'center', justifyContent: 'center' }, row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }, heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md }, subjectHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  tabs: { width: 292, height: 45, alignSelf: 'center', borderRadius: Radius.pill, padding: 4, flexDirection: 'row', marginBottom: Spacing.md, overflow: 'hidden' }, indicator: { position: 'absolute', top: 4, left: 4, bottom: 4, width: 140, borderRadius: Radius.pill }, tab: { width: 144, zIndex: 1 }, tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cards: { width: '100%', maxWidth: 460, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.md }, square: { width: '47%', aspectRatio: 1 }, wide: { width: '100%', height: 138 }, tile: { flex: 1, borderRadius: Radius.lg, padding: Spacing.md, justifyContent: 'space-between' }, tileTitle: { fontSize: 18 },
  arena: { flex: 1 }, arenaHeading: { marginHorizontal: Spacing.md, padding: Spacing.sm, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  horizontal: { flexGrow: 0, marginVertical: Spacing.sm }, chip: { minHeight: 36, paddingHorizontal: 13, borderRadius: Radius.pill, flexDirection: 'row', alignItems: 'center', gap: 6 }, setupScroll: { maxHeight: 560 }, section: { marginTop: Spacing.lg, marginBottom: Spacing.sm }, typeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.sm }, typeCell: { width: '48%', height: 74 }, typeTile: { flex: 1, borderRadius: Radius.md, padding: Spacing.sm, justifyContent: 'space-between' }, countRow: { minHeight: 44, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm }, counter: { fontSize: 24, minWidth: 24, textAlign: 'center' }, wheels: { height: 230, flexDirection: 'row', width: '70%', alignSelf: 'center' },
  slider: { height: 44, marginHorizontal: 12, justifyContent: 'center' }, track: { position: 'absolute', left: 0, right: 0, height: 10, borderRadius: 5 }, fill: { height: 10, borderRadius: 5 }, thumb: { position: 'absolute', left: -12, width: 24, height: 24, borderRadius: 12 }, sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md }, button: { minHeight: 45, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  search: { minHeight: 46, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.md }, option: { minHeight: 48, padding: Spacing.md, marginBottom: Spacing.sm, borderRadius: Radius.md, justifyContent: 'center' }, input: { minHeight: 90, padding: Spacing.md, borderRadius: Radius.md, textAlignVertical: 'top' }, feedback: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, marginTop: Spacing.md }, footer: { flexDirection: 'row', gap: Spacing.sm, marginVertical: Spacing.md }, flex: { flex: 1 }, flash: { minHeight: 270, padding: Spacing.lg, borderRadius: Radius.lg, justifyContent: 'center' },
  flashFace: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, padding: Spacing.lg, justifyContent: 'center', backfaceVisibility: 'hidden' }, flashText: { marginTop: Spacing.lg },
  result: { alignItems: 'center', gap: Spacing.lg, paddingTop: Spacing.xl }, ring: { alignItems: 'center', justifyContent: 'center' }, score: { position: 'absolute' },
});
