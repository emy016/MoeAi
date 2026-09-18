/**
 * The calendar's date logic, ported from the mobile app.
 *
 * Worth testing because every bug here is invisible until a specific date:
 * an exclusive end that swallows the next day, a week-long break painting a
 * marker on every day it touches, a Monday-first week that starts on Sunday
 * for anyone west of here.
 */
import {
  addDays, CalendarKind, dateKey, isMultiDay, isoWeekNumber, markerKindsForDay,
  minutesIntoDay, objectsForDay, sameDay, splitDayObjects, startOfWeek, touchesDay,
  weekNumber, type CalendarObject,
} from "../lib/moeai/calendar.ts";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) { failures++; console.log(`FAIL  ${name}\n      got      ${JSON.stringify(actual)}\n      expected ${JSON.stringify(expected)}`); }
  else console.log(`ok    ${name}`);
}

const at = (iso: string) => new Date(iso);
const object = (over: Partial<CalendarObject>): CalendarObject => ({
  id: "o", title: "T", kind: CalendarKind.EVENT, start: "2026-09-16T10:00:00", ...over,
});

// ── Week and day arithmetic ────────────────────────────────────────────────
check("the week starts on Monday",
  startOfWeek(at("2026-09-20T23:00:00")).getDay(), 1);       // that Sunday belongs to the week before
check("a Monday is its own week start",
  dateKey(startOfWeek(at("2026-09-14T08:00:00"))), "2026-09-14");
check("adding days crosses a month end",
  dateKey(addDays(at("2026-09-30T12:00:00"), 1)), "2026-10-01");
check("adding days crosses a leap day",
  dateKey(addDays(at("2028-02-28T12:00:00"), 1)), "2028-02-29");
check("same day ignores the time",
  sameDay(at("2026-09-16T00:00:00"), at("2026-09-16T23:59:59")), true);
check("same day is not the same week",
  sameDay(at("2026-09-16T23:59:59"), at("2026-09-17T00:00:00")), false);
check("minutes into the day are fractional",
  minutesIntoDay(at("2026-09-16T10:30:30")), 630.5);
check("an ISO week number is the year's, not the month's",
  isoWeekNumber(at("2026-01-04T12:00:00")) >= 1, true);
check("an academic year start renumbers the same date to week 1",
  weekNumber(at("2026-09-16T12:00:00"), at("2026-09-14T00:00:00")), 1);
check("and to week 3 a fortnight later",
  weekNumber(at("2026-09-30T12:00:00"), at("2026-09-14T00:00:00")), 3);

// ── Half-open ranges ───────────────────────────────────────────────────────
const exam = object({ kind: CalendarKind.EXAM, start: "2026-09-16T09:00:00", end: "2026-09-16T11:00:00" });
const breakWeek = object({ id: "b", title: "Break", start: "2026-09-21T00:00:00", end: "2026-09-26T00:00:00", allDay: true });
const deadline = object({ id: "d", title: "Essay", kind: CalendarKind.ASSIGNMENT_DUE, start: "2026-09-18T23:59:00", point: true });

check("an exclusive end does not spill into the next day",
  touchesDay(breakWeek, at("2026-09-26T09:00:00")), false);
check("but the day before it does",
  touchesDay(breakWeek, at("2026-09-25T09:00:00")), true);
check("a two-hour exam is not multi-day",
  isMultiDay(exam), false);
check("a five-day break is",
  isMultiDay(breakWeek), true);
check("a point is never multi-day, whatever else it carries",
  isMultiDay({ ...deadline, end: "2026-09-30T00:00:00" }), false);

// ── Markers ────────────────────────────────────────────────────────────────
const all = [exam, breakWeek, deadline];
check("a day with nothing on it has no markers",
  markerKindsForDay(all, at("2026-09-17T12:00:00")), []);
check("the exam's day shows the exam",
  markerKindsForDay(all, at("2026-09-16T12:00:00")), [CalendarKind.EXAM]);
check("a break marks its first day",
  markerKindsForDay(all, at("2026-09-21T12:00:00")), [CalendarKind.EVENT]);
check("and its last, which is the day before its exclusive end",
  markerKindsForDay(all, at("2026-09-25T12:00:00")), [CalendarKind.EVENT]);
check("but not the days in between — otherwise the strip means nothing",
  markerKindsForDay(all, at("2026-09-23T12:00:00")), []);
check("markers do not repeat a kind",
  markerKindsForDay([exam, { ...exam, id: "e2" }], at("2026-09-16T12:00:00")), [CalendarKind.EXAM]);

// ── The day view ───────────────────────────────────────────────────────────
const day = splitDayObjects([...all, object({ id: "l", title: "Lecture", kind: CalendarKind.LECTURE, start: "2026-09-16T08:00:00", end: "2026-09-16T09:00:00" })], at("2026-09-16T00:00:00"));
check("timed things are placed, in order",
  day.timed.map(o => o.title), ["Lecture", "T"]);
check("nothing all-day is on this day",
  day.allDay.length, 0);
check("a break docks above the timeline rather than filling it",
  splitDayObjects(all, at("2026-09-23T00:00:00")).allDay.map(o => o.title), ["Break"]);
check("a day query finds the break it sits inside",
  objectsForDay(all, at("2026-09-23T00:00:00")).length, 1);

console.log(failures ? `\n${failures} failing` : "\nAll calendar checks passed.");
process.exit(failures ? 1 : 0);
