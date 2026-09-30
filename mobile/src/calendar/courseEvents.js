/**
 * The course staff's calendar, for a university student: quizzes,
 * assignments, exams, lectures and holidays from tutor mode. Shown on the
 * Home calendar next to the student's own events, and in Assignments and
 * Quizzes. Read-only here; staff edit them in tutor mode.
 */
import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '../ai/client';
import { useAccount } from '../account/AccountContext';
import { CalendarKind } from './calendarModel';

export const ASSIGNMENT_KINDS = ['assignment', 'project', 'deadline'];
export const QUIZ_KINDS = ['quiz', 'midterm', 'final'];
const KIND_LABEL = { assignment: 'Assignment', project: 'Project', deadline: 'Deadline', quiz: 'Quiz', midterm: 'Midterm', final: 'Final exam', lecture: 'Lecture', lab: 'Lab', tutorial: 'Tutorial', holiday: 'Holiday', announcement: 'Announcement', other: 'Event' };
export const kindLabel = (kind) => KIND_LABEL[kind] || 'Event';

export const courseLabel = (o) => {
  const c = Array.isArray(o.course) ? o.course[0] : o.course;
  if (!c) return '';
  return c.code_verified && c.code ? `${c.code} ${c.title}` : c.title;
};

/** One occurrence as a Home calendar object (same shape as the student's own events). */
export function toCalendarObject(o) {
  const start = new Date(o.at);
  const end = o.end ? new Date(o.end) : new Date(start.getTime() + (ASSIGNMENT_KINDS.includes(o.kind) ? 0 : 60 * 60000));
  const kind = ASSIGNMENT_KINDS.includes(o.kind) ? CalendarKind.ASSIGNMENT_DUE : QUIZ_KINDS.includes(o.kind) ? CalendarKind.EXAM : CalendarKind.EVENT;
  const course = courseLabel(o);
  return {
    id: `course-${o.id}-${o.occurrence || 0}`,
    kind,
    courseEvent: true,
    title: course ? `${o.title} · ${course}` : o.title,
    description: [o.details, o.location ? `Room: ${o.location}` : null, o.weight ? `Weight: ${o.weight}` : null].filter(Boolean).join('\n') || kindLabel(o.kind),
    start,
    end: end < start ? start : end,
    point: !o.end,
  };
}

export function useCourseCalendar(active = true) {
  const { account } = useAccount();
  const [occurrences, setOccurrences] = useState([]);
  const load = useCallback(async () => {
    if (account.status !== 'signedIn' || !account.org) { setOccurrences([]); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/calendar`, { credentials: 'include', headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const data = await res.json();
      setOccurrences(Array.isArray(data?.occurrences) ? data.occurrences : []);
    } catch (_) {}
  }, [account.status, account.org]);
  useEffect(() => { if (active) load(); }, [active, load]);
  return { occurrences, reload: load };
}
