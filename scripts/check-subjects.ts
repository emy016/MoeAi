/**
 * The course progress arithmetic, ported from the mobile app.
 *
 * Worth testing because it is quietly opinionated: a course's progress is the
 * mean of its lectures, not the fraction that are finished, and a completion
 * override beats the stored fraction without overwriting it. Get either wrong
 * and the dashboard lies to the student about where they are.
 */
import { combinedSubjectStats, completionKey, lectureProgress, normalizeSubject, SEED_SUBJECTS, subjectStats, withCompletions, type Subject } from "../lib/moeai/subjects.ts";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) { failures++; console.log(`FAIL  ${name}\n      got      ${JSON.stringify(actual)}\n      expected ${JSON.stringify(expected)}`); }
  else console.log(`ok    ${name}`);
}

const course = (progresses: number[]): Subject => normalizeSubject({
  id: "s", name: "Test", owner: "user",
  lectures: progresses.map((p, i) => ({ id: `l${i}`, title: `L${i}`, progress: p, createdAt: "", files: [] })),
});

check("an empty course is not divided by zero",
  subjectStats(course([])), { total: 0, completed: 0, progress: 0 });

check("progress is the mean, not the completed ratio",
  subjectStats(course([1, 0.5, 0])).progress, 0.5);

check("that same course counts one lecture as completed",
  subjectStats(course([1, 0.5, 0])).completed, 1);

check("a fraction out of range is clamped",
  subjectStats(course([2, -1])), { total: 2, completed: 1, progress: 0.5 });

check("an override beats the stored fraction",
  lectureProgress({ id: "l", title: "L", progress: 0.2, createdAt: "", files: [], completedOverride: true }), 1);

check("and does not overwrite it",
  withCompletions([course([0.2])], { [completionKey("s", "l0")]: true })[0].lectures[0].progress, 0.2);

check("an override lifts the course's progress to full",
  subjectStats(withCompletions([course([0.2, 1])], { [completionKey("s", "l0")]: true })[0]),
  { total: 2, completed: 2, progress: 1 });

check("totals count lectures across courses, not courses",
  combinedSubjectStats([course([1, 1]), course([1, 0, 0])]), { total: 5, completed: 3 });

check("normalising rejects junk without throwing",
  normalizeSubject({ id: "x", name: "  Spaced  ", lectures: "nope" as never }),
  { id: "x", name: "Spaced", owner: "user", iconQuery: "Spaced", createdAt: normalizeSubject({ id: "x", name: "Spaced" }).createdAt, lectures: [] });

check("every seeded course has lectures",
  SEED_SUBJECTS.every(s => s.lectures.length > 0), true);

check("seeded lecture ids are unique across the catalogue",
  new Set(SEED_SUBJECTS.flatMap(s => s.lectures.map(l => `${s.id}:${l.id}`))).size,
  SEED_SUBJECTS.reduce((n, s) => n + s.lectures.length, 0));

const seeded = combinedSubjectStats(SEED_SUBJECTS);
check("the seeded semester is partly done, not empty and not finished",
  seeded.completed > 0 && seeded.completed < seeded.total, true);

console.log(failures ? `\n${failures} failing` : "\nAll course checks passed.");
process.exit(failures ? 1 : 0);
