/**
 * Calendar domain model and Gregorian-date helpers.
 *
 * Calendar objects use real Date values and half-open ranges: `start` is
 * inclusive and `end` is exclusive. Point-in-time assignment markers set
 * `point: true`; birthdays and full-day events set `allDay: true`. Nothing here is
 * tied to a particular year, month length, or weekday, so leap years and all
 * future Gregorian dates are calculated by the JavaScript date engine.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MINUTES_PER_DAY = 24 * 60;

// Null means an independent user and therefore the Gregorian year's ISO week.
// Supplying an organization's academic-year start switches the exact same UI
// to week 1 + elapsed whole weeks, ready for the future membership flow.
export const ORGANIZATION_ACADEMIC_YEAR_START = null;

export const CalendarKind = Object.freeze({
  ASSIGNMENT_UPLOADED: 'assignmentUploaded',
  ASSIGNMENT_SUBMITTED: 'assignmentSubmitted',
  ASSIGNMENT_DUE: 'assignmentDue',
  EXAM: 'exam',
  EVENT: 'event',
  BIRTHDAY: 'birthday',
});

const LOCALES = { en: 'en-US', ar: 'ar-SA', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', zh: 'zh-CN', hi: 'hi-IN' };
const FORMATTER_CACHE = new Map();

function formatter(language, options) {
  const locale = calendarLocale(language);
  const key = `${locale}:${JSON.stringify(options)}`;
  let value = FORMATTER_CACHE.get(key);
  if (!value) {
    value = new Intl.DateTimeFormat(locale, { calendar: 'gregory', ...options });
    FORMATTER_CACHE.set(key, value);
  }
  return value;
}

export const calendarLocale = (language = 'en') => LOCALES[language] || LOCALES.en;

export function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(value, amount) {
  const date = startOfDay(value);
  date.setDate(date.getDate() + amount);
  return date;
}

export function addMonths(value, amount) {
  const date = startOfDay(value);
  date.setDate(1);
  date.setMonth(date.getMonth() + amount);
  return date;
}

export function sameDay(a, b) {
  const left = new Date(a);
  const right = new Date(b);
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

export function dateKey(value) {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function startOfWeek(value) {
  const date = startOfDay(value);
  const mondayOffset = (date.getDay() + 6) % 7;
  return addDays(date, -mondayOffset);
}

export function isoWeekNumber(value) {
  const date = new Date(value);
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil((((utc - yearStart) / DAY_MS) + 1) / 7);
}

export function currentWeekNumber(value, academicYearStart = ORGANIZATION_ACADEMIC_YEAR_START) {
  if (!academicYearStart) return isoWeekNumber(value);
  const selectedWeek = startOfWeek(value);
  const firstWeek = startOfWeek(academicYearStart);
  return Math.max(1, Math.floor((selectedWeek.getTime() - firstWeek.getTime()) / (7 * DAY_MS)) + 1);
}

export function monthGrid(anchor) {
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  // A stable six-week, Monday-first grid keeps every date in its real weekday
  // column while preserving enough adjacent-month context for every month.
  const gridStart = startOfWeek(monthStart);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function formatWeekday(value, language, style = 'short') {
  return formatter(language, { weekday: style }).format(new Date(value));
}

export function formatMonthYear(value, language) {
  return formatter(language, { month: 'long', year: 'numeric' }).format(new Date(value));
}

export function formatMonthMarker(value, language) {
  return formatter(language, { month: 'short' }).format(new Date(value)).replace('.', '').toUpperCase();
}

export function formatTime(value, language) {
  return formatter(language, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

export function formatDate(value, language) {
  return formatter(language, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function formatNumericDate(value) {
  const date = new Date(value);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

export function minutesIntoDay(value) {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

export function objectTouchesDay(object, day) {
  const dayStart = startOfDay(day);
  if (object.recurrence === 'yearly') {
    return dayStart.getMonth() === object.month && dayStart.getDate() === object.day;
  }
  if (object.submissionDate && sameDay(object.submissionDate, dayStart)) return true;
  if (object.rangeMarkerTimes?.end && sameDay(object.rangeMarkerTimes.end, dayStart)) return true;
  const dayEnd = addDays(dayStart, 1);
  if (object.point) return sameDay(object.start, dayStart);
  return new Date(object.start) < dayEnd && new Date(object.end) > dayStart;
}

export function isMultiDay(object) {
  if (object.point || object.recurrence) return false;
  return !sameDay(object.start, new Date(new Date(object.end).getTime() - 1));
}

export function objectsForDay(objects, day) {
  return objects.filter((object) => objectTouchesDay(object, day));
}

export function markerKindsForDay(objects, day) {
  const onDay = objectsForDay(objects, day);
  const markers = [];

  onDay.forEach((object) => {
    if (object.submissionDate && sameDay(object.submissionDate, day)) {
      markers.push(CalendarKind.ASSIGNMENT_SUBMITTED);
    }
    if (object.rangeMarkers) {
      // A user-created event owns every day in its selected date range. Keep
      // its timeline representation endpoint-only, but expose the event star
      // on every calendar cell the range touches.
      if (object.userCreated && object.kind === CalendarKind.EVENT && isMultiDay(object)) {
        markers.push(CalendarKind.EVENT);
        return;
      }
      const finalInstant = object.rangeMarkerTimes?.end || new Date(new Date(object.end).getTime() - 1);
      if (sameDay(object.start, day)) markers.push(object.rangeMarkers.start);
      if (sameDay(finalInstant, day)) markers.push(object.rangeMarkers.end);
      return;
    }
    // Objects that span dates expose markers only on their first and final day.
    if (isMultiDay(object)) {
      const finalDay = new Date(new Date(object.end).getTime() - 1);
      if (!sameDay(object.start, day) && !sameDay(finalDay, day)) return;
    }
    markers.push(object.kind);
  });

  return [...new Set(markers)];
}

export function markerKindsForObjectOnDay(object, day) {
  const kinds = markerKindsForDay([object], day);
  return kinds.length ? kinds : [object.kind];
}

export function splitDayObjects(objects, day) {
  const onDay = objectsForDay(objects, day);
  const rangeEndpoints = onDay.flatMap((object) => {
    const endpoints = [];
    if (object.rangeMarkers) {
      const finalInstant = object.rangeMarkerTimes?.end || new Date(new Date(object.end).getTime() - 1);
      if (sameDay(object.start, day)) endpoints.push({ ...object, id: `${object.id}-range-start`, kind: object.rangeMarkers.start, start: object.rangeMarkerTimes?.start || object.start, allDay: false, point: true, rangeEndpoint: 'start' });
      if (sameDay(finalInstant, day)) endpoints.push({ ...object, id: `${object.id}-range-end`, kind: object.rangeMarkers.end, start: finalInstant, allDay: false, point: true, rangeEndpoint: 'end' });
    }
    if (object.submissionDate && sameDay(object.submissionDate, day)) {
      endpoints.push({ ...object, id: `${object.id}-submission`, kind: CalendarKind.ASSIGNMENT_SUBMITTED, start: new Date(object.submissionDate), allDay: false, point: true, rangeEndpoint: 'submission' });
    }
    return endpoints;
  });
  return {
    timed: onDay.filter((object) => !object.allDay && !object.point && !object.lineOnly),
    deadlines: [...onDay.filter((object) => object.point), ...rangeEndpoints],
    allDay: onDay.filter((object) => object.allDay),
  };
}

export function clippedMinutes(object, day) {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = addDays(day, 1).getTime();
  const start = Math.max(new Date(object.start).getTime(), dayStart);
  const end = Math.min(new Date(object.end).getTime(), dayEnd);
  return { startMinute: (start - dayStart) / 60000, endMinute: (end - dayStart) / 60000 };
}

// Greedy interval partitioning. Every overlapping group receives columns of
// equal width, ensuring an event can never completely cover another event.
export function layoutTimedObjects(objects, day, minimumDurationMinutes = 0, preparedDayObjects = null) {
  const items = (preparedDayObjects || splitDayObjects(objects, day)).timed
    .map((object) => {
      const clipped = clippedMinutes(object, day);
      return { object, ...clipped, visualEndMinute: Math.max(clipped.endMinute, clipped.startMinute + minimumDurationMinutes) };
    })
    .sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);
  const groups = [];
  let activeGroup = null;

  items.forEach((item) => {
    if (!activeGroup || item.startMinute >= activeGroup.maxEnd) {
      activeGroup = { items: [], columnEnds: [], maxEnd: item.visualEndMinute };
      groups.push(activeGroup);
    }
    let column = activeGroup.columnEnds.findIndex((end) => end <= item.startMinute);
    if (column < 0) column = activeGroup.columnEnds.length;
    activeGroup.columnEnds[column] = item.visualEndMinute;
    activeGroup.maxEnd = Math.max(activeGroup.maxEnd, item.visualEndMinute);
    activeGroup.items.push({ ...item, column });
  });

  return groups.flatMap((group) => {
    const columns = Math.max(1, group.columnEnds.length);
    return group.items.map((item) => ({ ...item, columns }));
  });
}
