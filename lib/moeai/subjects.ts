/**
 * Courses and lectures — ported from the mobile app's subject store.
 *
 * The shape and the progress arithmetic are Youssef's, kept exactly: a lecture
 * carries a fractional `progress`, a completion *override* is stored separately
 * from the lecture so ticking one off never edits shared course material, and a
 * course's progress is the mean of its lectures rather than the ratio of
 * completed ones — so a half-read lecture counts for something, which is the
 * point.
 *
 * What changed is the content, not the model: the seeded courses are EduMoe's
 * eight first-year subjects instead of the app's generic fixtures.
 */

export type Lecture = {
  id: string;
  title: string;
  /** 0..1. A lecture can be partly done without being ticked off. */
  progress: number;
  createdAt: string;
  /** Titles of material attached to this lecture, for the tutor's context. */
  files: string[];
  /** Set from the overrides map, never stored on the lecture itself. */
  completedOverride?: boolean;
};

export type Subject = {
  id: string;
  name: string;
  /** "seed" courses ship with EduMoe; "user" ones the student made. */
  owner: "seed" | "user";
  /** Drives the icon and, one day, retrieval scoping. */
  iconQuery: string;
  createdAt: string;
  lectures: Lecture[];
};

export type SubjectStats = { total: number; completed: number; progress: number };

const clamp01 = (value: number) => Math.max(0, Math.min(1, Number(value) || 0));

/** An override wins outright; otherwise the lecture's own fraction. */
export function lectureProgress(lecture: Lecture): number {
  return lecture.completedOverride ? 1 : clamp01(lecture.progress);
}

export function completionKey(subjectId: string, lectureId: string) {
  return `${subjectId}:${lectureId}`;
}

export function subjectStats(subject: Subject): SubjectStats {
  const total = subject.lectures.length;
  const completed = subject.lectures.reduce((sum, item) => sum + (lectureProgress(item) >= 1 ? 1 : 0), 0);
  const accumulated = subject.lectures.reduce((sum, item) => sum + lectureProgress(item), 0);
  return { total, completed, progress: total ? accumulated / total : 0 };
}

/** Totals across every course. Counts lectures, not courses. */
export function combinedSubjectStats(subjects: Subject[]) {
  return subjects.reduce(
    (result, subject) => {
      const stats = subjectStats(subject);
      result.total += stats.total;
      result.completed += stats.completed;
      return result;
    },
    { total: 0, completed: 0 },
  );
}

export function normalizeSubject(subject: Partial<Subject> & { id: string; name: string }): Subject {
  return {
    id: String(subject.id),
    name: String(subject.name || "").trim(),
    owner: subject.owner === "seed" ? "seed" : "user",
    iconQuery: String(subject.iconQuery || subject.name || "").trim(),
    createdAt: subject.createdAt || new Date().toISOString(),
    lectures: Array.isArray(subject.lectures)
      ? subject.lectures.map(item => ({
          id: String(item.id),
          title: String(item.title || "").trim(),
          progress: clamp01(item.progress),
          createdAt: item.createdAt || new Date().toISOString(),
          files: Array.isArray(item.files) ? item.files.map(String).slice(0, 20) : [],
        }))
      : [],
  };
}

/** Applies the overrides map, exactly as the app does before rendering. */
export function withCompletions(subjects: Subject[], overrides: Record<string, boolean>): Subject[] {
  return subjects.map(subject => ({
    ...subject,
    lectures: subject.lectures.map(lecture => ({
      ...lecture,
      completedOverride: Boolean(overrides[completionKey(subject.id, lecture.id)]),
    })),
  }));
}

const lecture = (id: string, title: string, progress: number, day: number, files: string[] = []): Lecture => ({
  id, title, progress, createdAt: `2026-09-${String(day).padStart(2, "0")}T09:00:00.000Z`, files,
});

/**
 * The eight courses on the EduMoe cover. Seeded so the dashboard is never an
 * empty grid — a student who has added nothing still sees their own semester.
 */
export const SEED_SUBJECTS: Subject[] = [
  { id: "seed-structured-programming", name: "Structured Programming", owner: "seed", iconQuery: "code", createdAt: "2026-09-01T09:00:00.000Z", lectures: [
    lecture("sp-1", "Variables, types and I/O", 1, 1),
    lecture("sp-2", "Control flow and loops", 1, 3),
    lecture("sp-3", "Functions and scope", 1, 6, ["functions.pdf"]),
    lecture("sp-4", "Arrays and strings", 0.55, 9),
    lecture("sp-5", "Pointers and memory", 0.15, 12, ["pointers.pdf"]),
    lecture("sp-6", "Structs and file handling", 0, 15),
  ]},
  { id: "seed-logic-design", name: "Logic Design", owner: "seed", iconQuery: "circuit", createdAt: "2026-09-01T09:00:00.000Z", lectures: [
    lecture("ld-1", "Number systems", 1, 2),
    lecture("ld-2", "Boolean algebra", 1, 5),
    lecture("ld-3", "Truth tables and gates", 0.8, 8),
    lecture("ld-4", "Karnaugh maps", 0.35, 11, ["kmaps.pdf"]),
    lecture("ld-5", "Combinational circuits", 0, 14),
  ]},
  { id: "seed-discrete-mathematics", name: "Discrete Mathematics", owner: "seed", iconQuery: "graph", createdAt: "2026-09-01T09:00:00.000Z", lectures: [
    lecture("dm-1", "Propositional logic", 1, 2),
    lecture("dm-2", "Sets and relations", 0.7, 6),
    lecture("dm-3", "Functions and induction", 0.2, 10),
    lecture("dm-4", "Graphs and trees", 0, 13),
  ]},
  { id: "seed-calculus", name: "Calculus", owner: "seed", iconQuery: "curve", createdAt: "2026-09-01T09:00:00.000Z", lectures: [
    lecture("cal-1", "Functions and graphs", 1, 1),
    lecture("cal-2", "Limits and continuity", 1, 4),
    lecture("cal-3", "Differentiation", 0.6, 7, ["differentiation.pdf"]),
    lecture("cal-4", "Applications of derivatives", 0.1, 10),
    lecture("cal-5", "Integration", 0, 13),
  ]},
  { id: "seed-computing-fundamentals", name: "Computing Fundamentals", owner: "seed", iconQuery: "computer", createdAt: "2026-09-01T09:00:00.000Z", lectures: [
    lecture("cf-1", "How a computer represents data", 1, 1),
    lecture("cf-2", "Algorithms and flowcharts", 0.9, 4),
    lecture("cf-3", "Data structures, informally", 0.3, 8),
    lecture("cf-4", "Systems thinking", 0, 12),
  ]},
  { id: "seed-probability-statistics", name: "Probability & Statistics", owner: "seed", iconQuery: "chart", createdAt: "2026-09-01T09:00:00.000Z", lectures: [
    lecture("ps-1", "Counting and probability", 1, 3),
    lecture("ps-2", "Conditional probability", 0.5, 7, ["bayes.pdf"]),
    lecture("ps-3", "Random variables", 0.1, 11),
    lecture("ps-4", "Distributions", 0, 14),
  ]},
  { id: "seed-differential-equations", name: "Differential Equations", owner: "seed", iconQuery: "wave", createdAt: "2026-09-01T09:00:00.000Z", lectures: [
    lecture("de-1", "First-order equations", 0.75, 5),
    lecture("de-2", "Second-order equations", 0.2, 9),
    lecture("de-3", "Modelling and simulation", 0, 12),
  ]},
  { id: "seed-electrodynamics", name: "Electrodynamics", owner: "seed", iconQuery: "bolt", createdAt: "2026-09-01T09:00:00.000Z", lectures: [
    lecture("ed-1", "Electrostatics", 0.85, 4),
    lecture("ed-2", "Gauss's law", 0.25, 8),
    lecture("ed-3", "Magnetic fields", 0, 11),
    lecture("ed-4", "Maxwell's equations", 0, 15),
  ]},
];
