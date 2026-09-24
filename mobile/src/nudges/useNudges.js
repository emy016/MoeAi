/**
 * MoeAI reaching out first.
 *
 * Signed in, the server writes these (new lecture material from the student's
 * staff, one practice question a day from the course brain, a misconception
 * due for review) and this reads them. Signed out, the app still notices the
 * one thing it can see on the device: a lecture left half finished.
 *
 * Each nudge has `body` (what the student reads) and `prompt` (what MoeAI is
 * asked if they tap it), which are deliberately different sentences.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../ai/client';
import { useAccount } from '../account/AccountContext';
import { AsyncStorage, readStoredValue, storageKey } from '../storage/persistedStorage';
import { lectureProgress } from '../subjects/subjectStore';

const DISMISSED_KEY = storageKey('nudges-dismissed-v1');
const today = () => new Date().toISOString().slice(0, 10);

/** The lecture closest to done without being done: the easiest win on the device. */
function localNudge(subjects, t) {
  let best = null;
  for (const subject of subjects) {
    for (const lecture of subject.lectures || []) {
      const progress = lectureProgress(lecture);
      if (progress > 0 && progress < 1 && (!best || progress > best.progress)) best = { subject, lecture, progress };
    }
  }
  if (!best) return null;
  const percent = Math.round(best.progress * 100);
  return {
    id: `local-${best.subject.id}-${best.lecture.id}-${today()}`,
    kind: 'resume',
    body: t('nudgeResume', { percent, lecture: best.lecture.title, subject: best.subject.name }),
    prompt: t('nudgeResumePrompt', { lecture: best.lecture.title, subject: best.subject.name }),
    subjectId: best.subject.id,
    lectureId: best.lecture.id,
  };
}

export function useNudges(subjects, t) {
  const { account, revision } = useAccount();
  const [remote, setRemote] = useState([]);
  const [dismissed, setDismissed] = useState(() => new Set());

  useEffect(() => {
    readStoredValue(DISMISSED_KEY).then((raw) => {
      try { const list = JSON.parse(raw || '[]'); if (Array.isArray(list)) setDismissed(new Set(list.slice(-200))); } catch (_) {}
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (account.status !== 'signedIn') { setRemote([]); return undefined; }
    let alive = true;
    fetch(`${API_BASE_URL}/api/nudges`, { credentials: 'include', headers: { Accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : { nudges: [] }))
      .then((data) => { if (alive) setRemote(Array.isArray(data?.nudges) ? data.nudges : []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [account.status, revision]);

  const nudge = useMemo(() => {
    const fromServer = remote.find((item) => !dismissed.has(item.id));
    if (fromServer) {
      const subject = fromServer.course_id ? subjects.find((s) => s.orgCourseId === fromServer.course_id) : null;
      const lecture = subject && (subject.lectures.find((l) => l.materialId === fromServer.material_id) || subject.lectures[0]);
      return { ...fromServer, subjectId: subject?.id, lectureId: lecture?.id };
    }
    const local = localNudge(subjects, t);
    return local && !dismissed.has(local.id) ? local : null;
  }, [dismissed, remote, subjects, t]);

  const dismiss = useCallback((item) => {
    if (!item) return;
    setDismissed((current) => {
      const next = new Set(current); next.add(item.id);
      AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify([...next].slice(-200))).catch(() => {});
      return next;
    });
    if (!String(item.id).startsWith('local-')) {
      fetch(`${API_BASE_URL}/api/nudges`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: item.id }),
      }).catch(() => {});
    }
  }, []);

  return { nudge, dismiss };
}
