"use client";
import { useMemo, useState } from "react";
import {
  ArrowUpRight, Binary, BookOpen, Check, ChevronDown, CircuitBoard, Cpu, FileText,
  FunctionSquare, Plus, Share2, Sigma, Trash2, Waves, Zap,
} from "lucide-react";
import { ProgressBar, ProgressRing } from "./progress-ring";
import {
  combinedSubjectStats, completionKey, lectureProgress, normalizeSubject, SEED_SUBJECTS,
  subjectStats, withCompletions, type Lecture, type Subject,
} from "@/lib/moeai/subjects";

/**
 * The semester, as a dashboard — ported from the mobile app's home screen.
 *
 * The structure is Youssef's: one ring for the whole semester, a grid of course
 * cards each with its own bar, and a course opens into its lectures. What the
 * web adds is the thing the tutor is for — every lecture can be handed to Moe,
 * and the handover says which lecture and which course, so the answer is
 * grounded instead of generic.
 */

/** Matched against the course's iconQuery, the way the app matches Noun Project terms. */
const ICONS: [RegExp, typeof BookOpen][] = [
  [/code|program/i, Binary],
  [/circuit|logic/i, CircuitBoard],
  [/computer|comput/i, Cpu],
  [/graph|discrete/i, Share2],
  [/curve|calculus/i, FunctionSquare],
  [/chart|probab|statis/i, Sigma],
  [/wave|differential/i, Waves],
  [/bolt|electro/i, Zap],
];
function iconFor(subject: Subject) {
  return ICONS.find(([pattern]) => pattern.test(`${subject.iconQuery} ${subject.name}`))?.[1] ?? BookOpen;
}

export function Courses({
  userSubjects, completions, onChange, onAsk,
}: {
  userSubjects: Subject[];
  completions: Record<string, boolean>;
  onChange: (next: { userSubjects?: Subject[]; completions?: Record<string, boolean> }) => void;
  onAsk: (text: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const subjects = useMemo(
    () => withCompletions([...SEED_SUBJECTS, ...userSubjects], completions),
    [userSubjects, completions],
  );
  const totals = combinedSubjectStats(subjects);
  const active = subjects.find(s => s.id === open) ?? null;

  function toggleLecture(subject: Subject, lecture: Lecture) {
    const key = completionKey(subject.id, lecture.id);
    const next = { ...completions };
    if (next[key]) delete next[key];
    else next[key] = true;
    onChange({ completions: next });
  }

  function addSubject(name: string) {
    const clean = name.trim();
    if (!clean) return;
    const subject = normalizeSubject({
      id: `course-${Date.now().toString(36)}`, name: clean, owner: "user", iconQuery: clean, lectures: [],
    });
    onChange({ userSubjects: [...userSubjects, subject] });
    setDraft(""); setAdding(false); setOpen(subject.id);
  }

  function addLecture(subject: Subject, title: string) {
    const clean = title.trim();
    if (!clean) return;
    const lecture: Lecture = {
      id: `lec-${Date.now().toString(36)}`, title: clean, progress: 0,
      createdAt: new Date().toISOString(), files: [],
    };
    onChange({
      userSubjects: userSubjects.map(s => s.id === subject.id ? { ...s, lectures: [...s.lectures, lecture] } : s),
    });
  }

  return (
    <section className="mx-courses">
      <div className="mx-view-title">
        <div>
          <span className="mx-eyebrow">WHERE YOU ACTUALLY ARE</span>
          <h1>Your semester.</h1>
          <p>Eight first-year courses. Tick a lecture off when it clicks, and hand any of them to Moe.</p>
        </div>
      </div>

      <div className="mx-semester">
        <ProgressRing completed={totals.completed} total={totals.total} />
        <div className="mx-semester-copy">
          <span className="mx-eyebrow">TOTAL PROGRESS</span>
          <p>
            {totals.completed} of {totals.total} lectures finished across {subjects.length} courses.
            {totals.completed < totals.total && " The bars below are the mean of each course's lectures, so a half-read lecture still counts."}
          </p>
          <div className="mx-inline">
            <button className="mx-secondary" onClick={() => onAsk(weakestPrompt(subjects))}>
              Start with what&rsquo;s furthest behind <ArrowUpRight size={14}/>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-course-grid">
        {subjects.map(subject => {
          const stats = subjectStats(subject);
          const Icon = iconFor(subject);
          return (
            <button
              key={subject.id}
              className={`mx-course-card ${open === subject.id ? "open" : ""}`}
              onClick={() => setOpen(open === subject.id ? null : subject.id)}
              aria-expanded={open === subject.id}
            >
              <div className="mx-course-top">
                <span>{subject.name}</span>
                <Icon size={22}/>
              </div>
              <div className="mx-course-bottom">
                <ProgressBar progress={stats.progress}/>
                <strong>{Math.round(stats.progress * 100)}%</strong>
              </div>
              <small>{stats.completed}/{stats.total} lectures{subject.owner === "user" ? " · yours" : ""}</small>
            </button>
          );
        })}
        <button className="mx-course-card mx-course-add" onClick={() => setAdding(true)}>
          <Plus size={20}/>
          <span>Add a course</span>
          <small>One you are taking that is not listed</small>
        </button>
      </div>

      {adding && (
        <form className="mx-course-form" onSubmit={e => { e.preventDefault(); addSubject(draft); }}>
          <label className="mx-field">Course name
            <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} maxLength={60} placeholder="e.g. Linear Algebra"/>
          </label>
          <div className="mx-inline">
            <button className="mx-primary" type="submit" disabled={!draft.trim()}>Add course</button>
            <button className="mx-secondary" type="button" onClick={() => { setAdding(false); setDraft(""); }}>Cancel</button>
          </div>
        </form>
      )}

      {active && <LectureList
        subject={active}
        onToggle={lecture => toggleLecture(active, lecture)}
        onAsk={onAsk}
        onAddLecture={title => addLecture(active, title)}
        onRemove={active.owner === "user" ? () => {
          onChange({ userSubjects: userSubjects.filter(s => s.id !== active.id) });
          setOpen(null);
        } : undefined}
      />}
    </section>
  );
}

/** The course furthest from done, which is usually the honest place to start. */
function weakestPrompt(subjects: Subject[]) {
  const ranked = subjects
    .filter(s => s.lectures.length)
    .map(s => ({ name: s.name, progress: subjectStats(s).progress }))
    .sort((a, b) => a.progress - b.progress);
  const worst = ranked[0];
  if (!worst) return "Ask me what I am studying, then help me make a plan for this week.";
  return `I am furthest behind in ${worst.name} — about ${Math.round(worst.progress * 100)}% through it. Ask me what I already understand, then start me on the next thing.`;
}

function LectureList({
  subject, onToggle, onAsk, onAddLecture, onRemove,
}: {
  subject: Subject;
  onToggle: (lecture: Lecture) => void;
  onAsk: (text: string) => void;
  onAddLecture: (title: string) => void;
  onRemove?: () => void;
}) {
  const [draft, setDraft] = useState("");
  const stats = subjectStats(subject);
  return (
    <div className="mx-lectures">
      <header>
        <div>
          <span className="mx-eyebrow">{subject.name.toUpperCase()}</span>
          <h2>{stats.completed} of {stats.total} done</h2>
        </div>
        <div className="mx-inline">
          <button className="mx-secondary" onClick={() => onAsk(`Give me a five-minute overview of ${subject.name}: the spine of the course and how the topics connect. I have done ${stats.completed} of ${stats.total} lectures.`)}>
            <BookOpen size={15}/> Overview
          </button>
          {onRemove && (
            <button className="mx-icon" aria-label={`Remove ${subject.name}`} onClick={onRemove}><Trash2 size={16}/></button>
          )}
        </div>
      </header>

      <ol className="mx-lecture-list">
        {subject.lectures.map((lecture, index) => {
          const progress = lectureProgress(lecture);
          const done = progress >= 1;
          return (
            <li key={lecture.id} className={done ? "done" : ""}>
              <button
                className="mx-lecture-check"
                aria-label={done ? `Mark ${lecture.title} unfinished` : `Mark ${lecture.title} finished`}
                aria-pressed={done}
                onClick={() => onToggle(lecture)}
              >
                {done ? <Check size={14}/> : <span>{index + 1}</span>}
              </button>
              <div className="mx-lecture-body">
                <strong>{lecture.title}</strong>
                <div className="mx-lecture-meta">
                  <ProgressBar progress={progress}/>
                  <small>{done ? "Finished" : progress > 0 ? `${Math.round(progress * 100)}%` : "Not started"}</small>
                  {lecture.files.map(file => <span key={file} className="mx-lecture-file"><FileText size={11}/>{file}</span>)}
                </div>
              </div>
              <button
                className="mx-lecture-ask"
                onClick={() => onAsk(`Teach me “${lecture.title}” from ${subject.name}. Start by asking me one question to find out what I already know, then build from there.`)}
              >
                Study this <ArrowUpRight size={13}/>
              </button>
            </li>
          );
        })}
      </ol>

      {subject.owner === "user" && (
        <form className="mx-lecture-add" onSubmit={e => { e.preventDefault(); onAddLecture(draft); setDraft(""); }}>
          <input value={draft} onChange={e => setDraft(e.target.value)} maxLength={80} placeholder="Add a lecture to this course…"/>
          <button className="mx-secondary" type="submit" disabled={!draft.trim()}><Plus size={14}/> Add</button>
        </form>
      )}

      <button className="mx-lecture-collapse" onClick={() => onAsk(`Quiz me on ${subject.name}. One question at a time, starting with the lectures I have marked finished, and wait for my answer.`)}>
        <ChevronDown size={13}/> Quiz me on everything I have finished
      </button>
    </div>
  );
}
