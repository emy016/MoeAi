/**
 * The calendar's domain model, ported from the mobile app.
 *
 * The conventions are Youssef's and they are load-bearing, so they are kept
 * exactly: ranges are half-open — `start` inclusive, `end` exclusive — a
 * moment in time sets `point`, and a day-long thing sets `allDay`. Nothing is
 * tied to a year, a month length or a weekday; the date engine handles leap
 * years and everything after them.
 *
 * `ACADEMIC_YEAR_START` is the same hook his model leaves open: null means an
 * independent student, and therefore the ISO week of the Gregorian year. Give
 * it a university's term start and the identical UI counts week 1 onward,
 * which is what a verified organisation will want.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MINUTES_PER_DAY = 24 * 60;
export const ACADEMIC_YEAR_START: Date | null = null;

export const CalendarKind = {
  ASSIGNMENT_UPLOADED: "assignmentUploaded",
  ASSIGNMENT_SUBMITTED: "assignmentSubmitted",
  ASSIGNMENT_DUE: "assignmentDue",
  EXAM: "exam",
  LECTURE: "lecture",
  EVENT: "event",
} as const;
export type Kind = (typeof CalendarKind)[keyof typeof CalendarKind];

export type CalendarObject = {
  id: string;
  title: string;
  kind: Kind;
  /** ISO. Inclusive. */
  start: string;
  /** ISO. Exclusive. Absent for a point in time. */
  end?: string;
  /** A moment rather than a span: a deadline, a submission. */
  point?: boolean;
  /** Occupies the day without a time: a holiday, a deadline with no hour. */
  allDay?: boolean;
  done?: boolean;
  note?: string;
};

export function startOfDay(value: string | number | Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(value: string | number | Date, amount: number): Date {
  const date = startOfDay(value);
  date.setDate(date.getDate() + amount);
  return date;
}

export function sameDay(a: string | number | Date, b: string | number | Date): boolean {
  const left = new Date(a), right = new Date(b);
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

/** Monday-first, like the app's week strip. */
export function startOfWeek(value: string | number | Date): Date {
  const date = startOfDay(value);
  return addDays(date, -((date.getDay() + 6) % 7));
}

export function dateKey(value: string | number | Date): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isoWeekNumber(value: string | number | Date): number {
  const date = new Date(value);
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil(((utc.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
}

export function weekNumber(value: string | number | Date, academicYearStart = ACADEMIC_YEAR_START): number {
  if (!academicYearStart) return isoWeekNumber(value);
  const selected = startOfWeek(value), first = startOfWeek(academicYearStart);
  return Math.max(1, Math.floor((selected.getTime() - first.getTime()) / (7 * DAY_MS)) + 1);
}

/** Fractional minutes since midnight — what positions a block on a day. */
export function minutesIntoDay(value: string | number | Date): number {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

/** Spans more than one calendar day. A point never does, whatever its end. */
export function isMultiDay(object: CalendarObject): boolean {
  if (object.point || !object.end) return false;
  // The end is exclusive, so the last instant it occupies is one millisecond before it.
  return !sameDay(object.start, new Date(new Date(object.end).getTime() - 1));
}

export function touchesDay(object: CalendarObject, day: string | number | Date): boolean {
  const dayStart = startOfDay(day);
  if (object.point || !object.end) return sameDay(object.start, dayStart);
  const dayEnd = addDays(dayStart, 1);
  return new Date(object.start) < dayEnd && new Date(object.end) > dayStart;
}

export function objectsForDay(objects: CalendarObject[], day: string | number | Date): CalendarObject[] {
  return objects.filter(object => touchesDay(object, day));
}

/**
 * Which markers a day's cell shows. A thing spanning dates marks only its
 * first and last day — otherwise a week-long break paints five identical dots
 * and the strip stops meaning anything.
 */
export function markerKindsForDay(objects: CalendarObject[], day: string | number | Date): Kind[] {
  const markers: Kind[] = [];
  for (const object of objectsForDay(objects, day)) {
    if (isMultiDay(object)) {
      const finalDay = new Date(new Date(object.end!).getTime() - 1);
      if (!sameDay(object.start, day) && !sameDay(finalDay, day)) continue;
    }
    markers.push(object.kind);
  }
  return [...new Set(markers)];
}

/** All-day things dock above the timeline; timed ones are placed on it. */
export function splitDayObjects(objects: CalendarObject[], day: string | number | Date) {
  const onDay = objectsForDay(objects, day);
  return {
    allDay: onDay.filter(object => object.allDay || isMultiDay(object)),
    timed: onDay
      .filter(object => !object.allDay && !isMultiDay(object))
      .sort((a, b) => minutesIntoDay(a.start) - minutesIntoDay(b.start)),
  };
}

export function formatTime(value: string | number | Date, locale?: string) {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function formatDayLabel(value: string | number | Date, locale?: string) {
  return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(new Date(value));
}
