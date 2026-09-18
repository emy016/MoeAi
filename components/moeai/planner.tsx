"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight, Bell, CalendarDays, Check, ChevronLeft, ChevronRight,
  FileUp, FlaskConical, GraduationCap, Plus, Star, Trash2, Upload,
} from "lucide-react";
import {
  addDays, CalendarKind, dateKey, formatTime, markerKindsForDay, minutesIntoDay,
  sameDay, splitDayObjects, startOfDay, startOfWeek, weekNumber,
  type CalendarObject, type Kind,
} from "@/lib/moeai/calendar";

/**
 * The study plan, rebuilt on the app's calendar model.
 *
 * It was a flat list of titles and dates. Now it carries the same kinds the
 * app does — a lecture is not a deadline is not an exam — over a Monday-first
 * week strip whose markers follow his rule that a thing spanning dates marks
 * only its first and last day, and a proportional day timeline with all-day
 * items docked above it rather than stretched across it.
 */

const KINDS: { id: Kind; label: string; icon: typeof CalendarDays; hint: string }[] = [
  { id: CalendarKind.ASSIGNMENT_DUE, label: "Due", icon: FileUp, hint: "A deadline — a moment, not a span" },
  { id: CalendarKind.EXAM, label: "Exam", icon: GraduationCap, hint: "Sat at a time, for a length" },
  { id: CalendarKind.LECTURE, label: "Lecture", icon: FlaskConical, hint: "Recurring teaching" },
  { id: CalendarKind.EVENT, label: "Event", icon: Star, hint: "Anything else worth knowing" },
  { id: CalendarKind.ASSIGNMENT_SUBMITTED, label: "Submitted", icon: Check, hint: "Handed in — a receipt" },
  { id: CalendarKind.ASSIGNMENT_UPLOADED, label: "Posted", icon: Upload, hint: "Material appeared" },
];
const KIND_BY_ID = Object.fromEntries(KINDS.map(k => [k.id, k]));

const HOUR_HEIGHT = 46;

export function Planner({
  events, onChange, onAsk,
}: {
  events: CalendarObject[];
  onChange: (events: CalendarObject[]) => void;
  onAsk: (text: string) => void;
}) {
  const [anchor, setAnchor] = useState(() => startOfDay(Date.now()));
  const [kind, setKind] = useState<Kind>(CalendarKind.ASSIGNMENT_DUE);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");

  const week = useMemo(() => {
    const first = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, index) => addDays(first, index));
  }, [anchor]);
  const day = useMemo(() => splitDayObjects(events, anchor), [events, anchor]);
  const today = startOfDay(Date.now());
  const timeline = useRef<HTMLDivElement>(null);

  // A day is 24 hours tall and most of it is night. Open on the first thing
  // that happens, or on the morning when nothing does, so the useful part of
  // the day is what you see.
  useEffect(() => {
    const el = timeline.current;
    if (!el) return;
    const firstHour = day.timed.length ? minutesIntoDay(day.timed[0].start) / 60 : 8;
    el.scrollTop = Math.max(0, (firstHour - 0.6) * HOUR_HEIGHT);
  }, [day.timed, anchor]);

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    const start = new Date(date);
    const point = kind === CalendarKind.ASSIGNMENT_DUE
      || kind === CalendarKind.ASSIGNMENT_SUBMITTED
      || kind === CalendarKind.ASSIGNMENT_UPLOADED;
    onChange([
      ...events,
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        kind,
        start: start.toISOString(),
        // A deadline is a moment; everything else gets an hour, exclusive at its end.
        ...(point ? { point: true } : { end: new Date(start.getTime() + 60 * 60 * 1000).toISOString() }),
        done: false,
      },
    ]);
    setTitle(""); setDate("");
    setAnchor(startOfDay(start));
  }

  return (
    <section className="mx-planner">
      <div className="mx-view-title">
        <div>
          <span className="mx-eyebrow">A PLAN YOU CAN ACTUALLY FOLLOW</span>
          <h1>Your week.</h1>
          <p>Deadlines, exams and lectures are different things, so they look different here.</p>
        </div>
        <div className="mx-week-nav">
          <button className="mx-icon" aria-label="Previous week" onClick={() => setAnchor(a => addDays(a, -7))}><ChevronLeft size={17}/></button>
          <span>Week {weekNumber(anchor)}</span>
          <button className="mx-icon" aria-label="Next week" onClick={() => setAnchor(a => addDays(a, 7))}><ChevronRight size={17}/></button>
        </div>
      </div>

      <div className="mx-week-strip" role="tablist" aria-label="Days of the week">
        {week.map(date => {
          const markers = markerKindsForDay(events, date);
          const selected = sameDay(date, anchor);
          return (
            <button
              key={dateKey(date)}
              role="tab"
              aria-selected={selected}
              className={`mx-day-pill ${selected ? "selected" : ""} ${sameDay(date, today) ? "today" : ""}`}
              onClick={() => setAnchor(startOfDay(date))}
            >
              <small>{new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date)}</small>
              <strong>{date.getDate()}</strong>
              <span className="mx-day-markers">
                {markers.slice(0, 3).map(marker => <i key={marker} data-kind={marker} />)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mx-day-view">
        <header>
          <h2>{new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(anchor)}</h2>
          {day.timed.length + day.allDay.length > 0 && (
            <button className="mx-text-button" onClick={() => onAsk(planPrompt(anchor, [...day.allDay, ...day.timed]))}>
              Plan this day with Moe <ArrowUpRight size={14}/>
            </button>
          )}
        </header>

        <div className="mx-allday-dock">
          <span className="mx-eyebrow">ALL DAY</span>
          {day.allDay.length
            ? day.allDay.map(object => <Entry key={object.id} object={object} events={events} onChange={onChange} onAsk={onAsk}/>)
            : <p className="mx-muted">Nothing running all day.</p>}
        </div>

        {day.timed.length ? (
          <div className="mx-timeline" ref={timeline}><div className="mx-timeline-inner" style={{ height: 24 * HOUR_HEIGHT }}>
            {Array.from({ length: 24 }, (_, hour) => (
              <div className="mx-timeline-hour" key={hour} style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}>
                <span>{String(hour).padStart(2, "0")}:00</span>
              </div>
            ))}
            {day.timed.map(object => {
              const top = (minutesIntoDay(object.start) / 60) * HOUR_HEIGHT;
              const minutes = object.end
                ? Math.max(30, (new Date(object.end).getTime() - new Date(object.start).getTime()) / 60000)
                : 30;
              const Icon = KIND_BY_ID[object.kind]?.icon ?? CalendarDays;
              return (
                <div
                  key={object.id}
                  className={`mx-timeline-block ${object.done ? "done" : ""}`}
                  data-kind={object.kind}
                  style={{ top, height: object.point ? 34 : (minutes / 60) * HOUR_HEIGHT }}
                >
                  <Icon size={13}/>
                  <strong>{object.title}</strong>
                  <span>{formatTime(object.start)}{object.point ? "" : object.end ? `–${formatTime(object.end)}` : ""}</span>
                  <button className="mx-icon" aria-label={`Delete ${object.title}`} onClick={() => onChange(events.filter(e => e.id !== object.id))}><Trash2 size={13}/></button>
                </div>
              );
            })}
          </div></div>
        ) : (
          <div className="mx-library-empty">
            <CalendarDays size={32}/>
            <h2>Nothing scheduled.</h2>
            <p>Add a deadline or an exam below, and Moe can turn it into a plan.</p>
          </div>
        )}
      </div>

      <form className="mx-event-form" onSubmit={add}>
        <div className="mx-kind-picker" role="radiogroup" aria-label="What kind of thing is this?">
          {KINDS.map(item => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={kind === item.id}
              title={item.hint}
              className={kind === item.id ? "active" : ""}
              data-kind={item.id}
              onClick={() => setKind(item.id)}
            >
              <item.icon size={14}/> {item.label}
            </button>
          ))}
        </div>
        <label className="mx-field">What&rsquo;s coming up?
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Logic Design midterm" maxLength={150} required/>
        </label>
        <label className="mx-field">Date &amp; time
          <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} required/>
        </label>
        <button className="mx-primary" type="submit"><Plus size={16}/> Add to the week</button>
      </form>

      <div className="mx-planner-info">
        <Bell size={18}/>
        <p>Moe brings a deadline up when you open the workspace. Reminders stay in the app — nothing is emailed or pushed while it is closed.</p>
      </div>
    </section>
  );
}

function planPrompt(day: Date, objects: CalendarObject[]) {
  const listing = objects
    .map(o => `${KIND_BY_ID[o.kind]?.label ?? "Item"}: ${o.title}${o.point || !o.end ? "" : ` at ${formatTime(o.start)}`}`)
    .join("; ");
  return `Help me plan ${new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(day)}. Here is what is on it — ${listing}. Ask me how much time I actually have before you suggest an order.`;
}

function Entry({
  object, events, onChange, onAsk,
}: {
  object: CalendarObject;
  events: CalendarObject[];
  onChange: (events: CalendarObject[]) => void;
  onAsk: (text: string) => void;
}) {
  const Icon = KIND_BY_ID[object.kind]?.icon ?? CalendarDays;
  return (
    <div className={`mx-event ${object.done ? "done" : ""}`} data-kind={object.kind}>
      <button
        className="mx-source-check"
        aria-label={`Mark ${object.title} ${object.done ? "not done" : "done"}`}
        aria-pressed={Boolean(object.done)}
        onClick={() => onChange(events.map(e => e.id === object.id ? { ...e, done: !e.done } : e))}
      >
        {object.done ? <Check size={15}/> : <Icon size={15}/>}
      </button>
      <div>
        <strong>{object.title}</strong>
        <span>{KIND_BY_ID[object.kind]?.label}</span>
      </div>
      <button className="mx-text-button" onClick={() => onAsk(`Help me prepare for ${object.title}. Ask me what it covers and how long I have.`)}>
        Make a plan <ArrowUpRight size={13}/>
      </button>
      <button className="mx-icon" aria-label={`Delete ${object.title}`} onClick={() => onChange(events.filter(e => e.id !== object.id))}><Trash2 size={14}/></button>
    </div>
  );
}
