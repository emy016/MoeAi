/** Persistent user-created subjects and lecture/chat metadata. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AsyncStorage, readStoredValue, storageKey } from '../storage/persistedStorage';
import { SUBJECT_EXAMPLES } from './subjectExamples';

const STORAGE_KEY = storageKey('user-subjects-v1');
const COMPLETION_KEY = storageKey('lecture-completion-overrides-v1');
const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const completionKey = (subjectId, lectureId) => `${subjectId}:${lectureId}`;

export function lectureProgress(lecture) {
  return lecture.completedOverride ? 1 : Math.max(0, Math.min(1, Number(lecture.progress) || 0));
}

function normalizeSubject(subject) {
  return {
    id: String(subject.id),
    name: String(subject.name || '').trim(),
    owner: 'user',
    iconQuery: String(subject.iconQuery || subject.name || '').trim(),
    createdAt: subject.createdAt || new Date().toISOString(),
    lectures: Array.isArray(subject.lectures) ? subject.lectures.map((item) => ({
      ...item,
      id: String(item.id),
      title: String(item.title || '').trim(),
      progress: Math.max(0, Math.min(1, Number(item.progress) || 0)),
      files: Array.isArray(item.files) ? item.files : [],
    })) : [],
  };
}

export function subjectStats(subject) {
  const total = subject.lectures.length;
  const completed = subject.lectures.reduce((sum, item) => sum + (lectureProgress(item) >= 1 ? 1 : 0), 0);
  const accumulatedProgress = subject.lectures.reduce((sum, item) => sum + lectureProgress(item), 0);
  return { total, completed, progress: total ? accumulatedProgress / total : 0 };
}

export function combinedSubjectStats(subjects) {
  return subjects.reduce((result, subject) => {
    const stats = subjectStats(subject);
    result.total += stats.total;
    result.completed += stats.completed;
    return result;
  }, { total: 0, completed: 0 });
}

export function useSubjectStore() {
  const [userSubjects, setUserSubjects] = useState([]);
  const [completionOverrides, setCompletionOverrides] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([readStoredValue(STORAGE_KEY), readStoredValue(COMPLETION_KEY)]).then(([rawSubjects, rawCompletions]) => {
      if (!alive) return;
      let parsed = [];
      let parsedCompletions = {};
      try { parsed = rawSubjects ? JSON.parse(rawSubjects) : []; } catch (_) {}
      try { parsedCompletions = rawCompletions ? JSON.parse(rawCompletions) : {}; } catch (_) {}
      setUserSubjects(Array.isArray(parsed) ? parsed.map(normalizeSubject).filter((item) => item.name) : []);
      setCompletionOverrides(parsedCompletions && typeof parsedCompletions === 'object' && !Array.isArray(parsedCompletions) ? parsedCompletions : {});
      setReady(true);
    }).catch(() => alive && setReady(true));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => Promise.all([
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userSubjects)),
      AsyncStorage.setItem(COMPLETION_KEY, JSON.stringify(completionOverrides)),
    ]).catch(() => {}), 0);
    return () => clearTimeout(timer);
  }, [completionOverrides, ready, userSubjects]);

  const commit = useCallback((recipe) => {
    setUserSubjects((current) => recipe(current));
  }, []);

  const addSubject = useCallback((name) => {
    const clean = String(name || '').trim();
    if (!clean) return null;
    const next = normalizeSubject({ id: makeId('subject'), name: clean, iconQuery: clean, lectures: [], createdAt: new Date().toISOString() });
    commit((current) => [...current, next]);
    return next;
  }, [commit]);

  const renameSubject = useCallback((id, name) => {
    const clean = String(name || '').trim();
    if (!clean) return;
    commit((current) => current.map((subject) => subject.id === id ? { ...subject, name: clean, iconQuery: clean } : subject));
  }, [commit]);

  const removeSubject = useCallback((id) => {
    commit((current) => current.filter((subject) => subject.id !== id));
    setCompletionOverrides((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${id}:`))));
  }, [commit]);

  const addLecture = useCallback((subjectId, { name, files = [] }) => {
    const clean = String(name || '').trim();
    if (!clean) return null;
    const nextLecture = { id: makeId('lecture'), title: clean, progress: 0, createdAt: new Date().toISOString(), files };
    commit((current) => current.map((subject) => subject.id === subjectId ? { ...subject, lectures: [...subject.lectures, nextLecture] } : subject));
    return nextLecture;
  }, [commit]);

  const removeLecture = useCallback((subjectId, lectureId) => {
    commit((current) => current.map((subject) => subject.id === subjectId ? { ...subject, lectures: subject.lectures.filter((item) => item.id !== lectureId) } : subject));
    setCompletionOverrides((current) => {
      const key = completionKey(subjectId, lectureId);
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, [commit]);

  const toggleLectureComplete = useCallback((subjectId, lectureId) => {
    const key = completionKey(subjectId, lectureId);
    setCompletionOverrides((current) => {
      if (!current[key]) return { ...current, [key]: true };
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const subjects = useMemo(() => [...SUBJECT_EXAMPLES, ...userSubjects].map((subject) => ({
    ...subject,
    lectures: subject.lectures.map((lecture) => ({ ...lecture, completedOverride: Boolean(completionOverrides[completionKey(subject.id, lecture.id)]) })),
  })), [completionOverrides, userSubjects]);
  return { subjects, userSubjects, ready, addSubject, renameSubject, removeSubject, addLecture, removeLecture, toggleLectureComplete };
}
