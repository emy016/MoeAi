/**
 * Tutor mode's calendar: the dated things MoeAI is aware of. Quizzes,
 * assignments, exams, weekly lectures and labs, holidays. Students see them
 * on Home and in Assignments/Quizzes, and MoeAI brings them up when they are
 * close. A pasted schedule becomes draft events MoeAI reads for you.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { CalendarDaysIcon, ClipboardDocumentListIcon, PlusIcon, TrashIcon } from 'react-native-heroicons/outline';
import ScreenContainer from '../components/ScreenContainer';
import DateTimePickerModal from '../components/DateTimePickerModal';
import CalendarAlertModal from '../components/CalendarAlertModal';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import { tutorApi } from './tutorApi';
import { Banner, Btn, Chip, Empty, Field, FullPage, IconBtn, SectionTitle, Segmented } from './ui';

export const EVENT_KINDS = [
  { id: 'quiz', label: 'Quiz', tone: 'warn' },
  { id: 'assignment', label: 'Assignment', tone: 'accent' },
  { id: 'midterm', label: 'Midterm', tone: 'bad' },
  { id: 'final', label: 'Final', tone: 'bad' },
  { id: 'project', label: 'Project', tone: 'accent' },
  { id: 'deadline', label: 'Deadline', tone: 'warn' },
  { id: 'lecture', label: 'Lecture', tone: 'muted' },
  { id: 'lab', label: 'Lab', tone: 'muted' },
  { id: 'tutorial', label: 'Tutorial', tone: 'muted' },
  { id: 'holiday', label: 'Holiday', tone: 'good' },
  { id: 'announcement', label: 'Announcement', tone: 'muted' },
  { id: 'other', label: 'Other', tone: 'muted' },
];
export const kindOf = (id) => EVENT_KINDS.find((k) => k.id === id) || EVENT_KINDS[EVENT_KINDS.length - 1];
const DURATIONS = [{ id: 0, label: 'No end' }, { id: 60, label: '1 h' }, { id: 90, label: '1.5 h' }, { id: 120, label: '2 h' }, { id: 180, label: '3 h' }];
const courseName = (c) => (c ? (c.code_verified && c.code ? `${c.code} ${c.title}` : c.title) : 'Everyone');

export function whenLabel(iso, allDay) {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  if (allDay) return date;
  return `${date} · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}
export function untilLabel(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  const past = ms < 0;
  const m = Math.abs(ms) / 60000;
  const days = Math.round(m / 1440);
  if (m >= 1440 && days === 1) return past ? 'yesterday' : 'tomorrow';
  const text = m < 60 ? `${Math.round(m)} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${days} days`;
  return past ? `${text} ago` : `in ${text}`;
}

function Chips({ options, value, onChange }) {
  const { colors, type } = usePreferences();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={String(o.id)} onPress={() => onChange(o.id)} style={[s.pick, { backgroundColor: on ? colors.accent : colors.cardButton }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
            <Text numberOfLines={1} style={[{ color: on ? '#fff' : colors.textSecondary }, type(12, 'bold', 16)]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function EventSheet({ initial, courses, onClose, onSaved }) {
  const { colors, type } = usePreferences();
  const editing = Boolean(initial?.id);
  const [draft, setDraft] = useState(() => {
    const start = initial?.starts_at ? new Date(initial.starts_at) : (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d; })();
    const dur = initial?.ends_at ? Math.round((new Date(initial.ends_at) - start) / 60000) : 0;
    return {
      kind: initial?.kind || 'quiz', course_id: initial?.course_id ?? courses[0]?.id ?? null, title: initial?.title || '', details: initial?.details || '',
      start, duration: DURATIONS.some((x) => x.id === dur) ? dur : 0, location: initial?.location || '', weight: initial?.weight || '',
      all_day: Boolean(initial?.all_day), weekly: Boolean(initial?.repeat_weekly_until),
      until: initial?.repeat_weekly_until ? new Date(`${initial.repeat_weekly_until}T12:00:00`) : new Date(Date.now() + 90 * 86400000),
    };
  });
  const [picker, setPicker] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const repeatable = ['lecture', 'lab', 'tutorial'].includes(draft.kind);

  const save = async () => {
    if (!draft.title.trim()) { setError('Give the event a title, e.g. "Quiz 2" or "Assignment 3: Flip-flops".'); return; }
    setBusy(true); setError('');
    const event = {
      kind: draft.kind, course_id: draft.course_id, title: draft.title.trim(), details: draft.details.trim() || null,
      starts_at: draft.start.toISOString(), ends_at: draft.duration ? new Date(draft.start.getTime() + draft.duration * 60000).toISOString() : null,
      all_day: draft.all_day, location: draft.location.trim() || null, weight: draft.weight.trim() || null,
      repeat_weekly_until: repeatable && draft.weekly ? draft.until.toISOString().slice(0, 10) : null,
    };
    try {
      if (editing) await tutorApi('/api/calendar', { body: { action: 'update', id: initial.id, patch: event } });
      else await tutorApi('/api/calendar', { body: { action: 'create', event } });
      onSaved();
    } catch (e) { setError(e.message); setBusy(false); }
  };
  const remove = async () => {
    setConfirm(false); setBusy(true);
    try { await tutorApi('/api/calendar', { body: { action: 'delete', id: initial.id } }); onSaved(); } catch (e) { setError(e.message); setBusy(false); }
  };

  return (
    <FullPage visible title={editing ? 'Edit event' : 'New event'} onClose={onClose} right={editing ? <IconBtn icon={TrashIcon} tone="danger" onPress={() => setConfirm(true)} label="Delete event" /> : null}>
      <Banner message={error} onClose={() => setError('')} />
      <SectionTitle title="What" />
      <Chips options={EVENT_KINDS} value={draft.kind} onChange={(kind) => set({ kind })} />
      <SectionTitle title="Course" />
      <Chips options={[...courses.map((c) => ({ id: c.id, label: courseName(c) })), { id: null, label: 'Whole university' }]} value={draft.course_id} onChange={(course_id) => set({ course_id })} />
      <Field label="Title" value={draft.title} onChangeText={(title) => set({ title })} placeholder={draft.kind === 'lecture' ? 'Lecture' : `${kindOf(draft.kind).label} 1`} />
      <SectionTitle title="When" />
      <View style={s.whenRow}>
        <Btn label={whenLabel(draft.start.toISOString(), draft.all_day)} icon={CalendarDaysIcon} tone="ghost" onPress={() => setPicker('start')} style={{ flex: 1 }} />
      </View>
      <View style={[s.toggle, { backgroundColor: colors.card }]}>
        <Text style={[{ color: colors.textPrimary, flex: 1 }, type(13.5, 'bold', 18)]}>All day</Text>
        <Switch value={draft.all_day} onValueChange={(all_day) => set({ all_day })} trackColor={{ true: colors.accent }} />
      </View>
      {!draft.all_day ? <Chips options={DURATIONS} value={draft.duration} onChange={(duration) => set({ duration })} /> : null}
      {repeatable ? (
        <View style={[s.toggle, { backgroundColor: colors.card }]}>
          <View style={{ flex: 1 }}>
            <Text style={[{ color: colors.textPrimary }, type(13.5, 'bold', 18)]}>Every week</Text>
            {draft.weekly ? <Pressable onPress={() => setPicker('until')}><Text style={[{ color: colors.accent }, type(12.5, 'bold', 17)]}>Until {draft.until.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</Text></Pressable> : null}
          </View>
          <Switch value={draft.weekly} onValueChange={(weekly) => set({ weekly })} trackColor={{ true: colors.accent }} />
        </View>
      ) : null}
      <Field label="Details" value={draft.details} onChangeText={(details) => set({ details })} multiline placeholder="Topics covered, rules, what to bring, submission link…" />
      <View style={s.whenRow}>
        <Field label="Room" value={draft.location} onChangeText={(location) => set({ location })} placeholder="e.g. B204" style={{ flex: 1 }} />
        <Field label="Weight" value={draft.weight} onChangeText={(weight) => set({ weight })} placeholder="e.g. 10%" style={{ flex: 1 }} />
      </View>
      <Btn label={editing ? 'Save changes' : 'Add to calendar'} onPress={save} busy={busy} />
      <DateTimePickerModal visible={picker === 'start'} title="Date and time" value={draft.start} onCancel={() => setPicker(null)} onConfirm={(start) => { set({ start }); setPicker(null); }} />
      <DateTimePickerModal visible={picker === 'until'} title="Repeat until" value={draft.until} onCancel={() => setPicker(null)} onConfirm={(until) => { set({ until }); setPicker(null); }} />
      <CalendarAlertModal visible={confirm} title="Delete this event?" message={draft.weekly ? 'Every week of it will be removed.' : 'Students stop seeing it and MoeAI forgets it.'} destructive onClose={() => setConfirm(false)} onConfirm={remove} />
    </FullPage>
  );
}

function PasteSheet({ courses, onClose, onSaved }) {
  const { colors, type } = usePreferences();
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState(null);
  const [keep, setKeep] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const read = async () => {
    setBusy(true); setError('');
    try {
      const d = await tutorApi('/api/calendar', { body: { action: 'parse', text, tzOffsetMinutes: new Date().getTimezoneOffset() } });
      setDrafts(d.drafts || []); setKeep(Object.fromEntries((d.drafts || []).map((_, i) => [i, true])));
      if (!(d.drafts || []).length) setError('MoeAI found no dated events in that text.');
    } catch (e) { setError(e.message); }
    setBusy(false);
  };
  const add = async () => {
    const events = (drafts || []).filter((_, i) => keep[i]);
    if (!events.length) return;
    setBusy(true); setError('');
    try { await tutorApi('/api/calendar', { body: { action: 'createMany', events } }); onSaved(); } catch (e) { setError(e.message); setBusy(false); }
  };
  const byId = Object.fromEntries(courses.map((c) => [c.id, c]));
  const count = Object.values(keep).filter(Boolean).length;
  return (
    <FullPage visible title="Import a schedule" subtitle="Paste it the way you would send it to students" onClose={onClose}>
      <Banner message={error} onClose={() => setError('')} />
      {!drafts ? (
        <>
          <Field value={text} onChangeText={setText} multiline inputStyle={{ minHeight: 220 }} placeholder={'Logic Design quiz 2, Sunday 5 Oct, 10:00, room B204, chapters 4-5\nDiscrete assignment 3 due Thursday 11:59 pm\nPhysics lectures every Monday 9-11 until 15 Jan'} />
          <Btn label="Read with MoeAI" onPress={read} busy={busy} disabled={text.trim().length < 5} />
        </>
      ) : (
        <>
          <SectionTitle title={`${drafts.length} events found · tap to leave one out`} right={<Btn label="Edit text" small tone="ghost" onPress={() => setDrafts(null)} />} />
          {drafts.map((d, i) => (
            <Pressable key={i} onPress={() => setKeep((k) => ({ ...k, [i]: !k[i] }))} style={[s.draft, { backgroundColor: colors.card, opacity: keep[i] ? 1 : 0.45 }]}>
              <View style={s.chipsRow}><Chip label={kindOf(d.kind).label} tone={kindOf(d.kind).tone} />{d.repeat_weekly_until ? <Chip label={`weekly until ${d.repeat_weekly_until}`} /> : null}</View>
              <Text style={[{ color: colors.textPrimary }, type(14, 'bold', 19)]}>{d.title}</Text>
              <Text style={[{ color: colors.textMuted }, type(12, 'semiBold', 16)]}>{[courseName(byId[d.course_id]), whenLabel(d.starts_at, d.all_day), d.location].filter(Boolean).join(' · ')}</Text>
              {d.details ? <Text style={[{ color: colors.textSecondary }, type(12, 'regular', 17)]}>{d.details}</Text> : null}
            </Pressable>
          ))}
          <Btn label={`Add ${count} event${count === 1 ? '' : 's'}`} onPress={add} busy={busy} disabled={!count} />
        </>
      )}
    </FullPage>
  );
}

export default function TutorCalendarScreen({ active }) {
  const { colors, type } = usePreferences();
  const [courses, setCourses] = useState([]);
  const [events, setEvents] = useState(null);
  const [view, setView] = useState('upcoming');
  const [course, setCourse] = useState('all');
  const [editing, setEditing] = useState(null);
  const [pasting, setPasting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [raw, overview] = await Promise.all([tutorApi('/api/calendar?raw=1'), courses.length ? null : tutorApi('/api/tutor?view=overview')]);
      setEvents(raw.events || []);
      if (overview) setCourses(overview.courses || []);
      setError('');
    } catch (e) { setError(e.message); }
  }, [courses.length]);
  useEffect(() => { if (active) load(); }, [active, load]);

  // Weekly classes show their next meeting; everything else its date.
  const rows = useMemo(() => {
    const now = Date.now();
    return (events || [])
      .filter((e) => course === 'all' || e.course_id === course || (course === 'uni' && !e.course_id))
      .map((e) => {
        let at = new Date(e.starts_at).getTime();
        if (e.repeat_weekly_until && at < now) {
          const until = new Date(`${e.repeat_weekly_until}T23:59:59`).getTime();
          const weeks = Math.ceil((now - at) / (7 * 86400000));
          const next = at + weeks * 7 * 86400000;
          at = next <= until ? next : at + Math.floor((until - at) / (7 * 86400000)) * 7 * 86400000;
        }
        return { ...e, at: new Date(at).toISOString() };
      })
      .filter((e) => (view === 'upcoming' ? new Date(e.ends_at && !e.repeat_weekly_until ? e.ends_at : e.at).getTime() >= now - 3600000 : new Date(e.at).getTime() < now))
      .sort((a, b) => (view === 'upcoming' ? a.at.localeCompare(b.at) : b.at.localeCompare(a.at)));
  }, [events, course, view]);
  const groups = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const key = new Date(r.at).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    return [...map.entries()];
  }, [rows]);
  const byId = useMemo(() => Object.fromEntries(courses.map((c) => [c.id, c])), [courses]);

  return (
    <ScreenContainer>
      <View style={{ gap: Spacing.md }}>
        <Banner message={error} onClose={() => setError('')} />
        <View style={s.actions}>
          <Btn label="Add event" icon={PlusIcon} onPress={() => setEditing({})} style={{ flex: 1 }} />
          <Btn label="Import schedule" icon={ClipboardDocumentListIcon} tone="ghost" onPress={() => setPasting(true)} style={{ flex: 1 }} />
        </View>
        <Segmented options={[{ id: 'upcoming', label: 'Upcoming' }, { id: 'past', label: 'Past' }]} value={view} onChange={setView} />
        <Chips options={[{ id: 'all', label: 'All courses' }, ...courses.map((c) => ({ id: c.id, label: courseName(c) })), { id: 'uni', label: 'University-wide' }]} value={course} onChange={setCourse} />
        {events && !rows.length ? <Empty title={view === 'upcoming' ? 'Nothing coming up' : 'Nothing yet'} body="Add quizzes, assignments, exams and weekly lectures. Students see them on Home, and MoeAI reminds them and helps them prepare." /> : null}
        {groups.map(([day, list]) => (
          <View key={day} style={{ gap: 8 }}>
            <SectionTitle title={new Date(day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} right={<Text style={[{ color: colors.textMuted }, type(11.5, 'semiBold', 15)]}>{untilLabel(list[0].at)}</Text>} />
            {list.map((e) => {
              const k = kindOf(e.kind);
              return (
                <Pressable key={e.id} onPress={() => setEditing(e)} style={({ pressed }) => [s.event, { backgroundColor: pressed ? colors.cardButton : colors.card }]} accessibilityRole="button">
                  <View style={[s.stripe, { backgroundColor: k.tone === 'muted' ? colors.track : k.tone === 'bad' ? colors.danger : k.tone === 'good' ? '#48B679' : k.tone === 'warn' ? '#E0A43A' : colors.accent }]} />
                  <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
                    <View style={s.chipsRow}><Chip label={k.label} tone={k.tone} />{e.repeat_weekly_until ? <Chip label="weekly" /> : null}{e.weight ? <Chip label={e.weight} /> : null}</View>
                    <Text numberOfLines={2} style={[{ color: colors.textPrimary }, type(14, 'bold', 19)]}>{e.title}</Text>
                    <Text numberOfLines={1} style={[{ color: colors.textMuted }, type(12, 'semiBold', 16)]}>{[courseName(byId[e.course_id]), e.all_day ? 'All day' : new Date(e.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }), e.location].filter(Boolean).join(' · ')}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      {editing ? <EventSheet initial={editing} courses={courses} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} /> : null}
      {pasting ? <PasteSheet courses={courses} onClose={() => setPasting(false)} onSaved={() => { setPasting(false); load(); }} /> : null}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  actions: { flexDirection: 'row', gap: Spacing.sm },
  pick: { paddingHorizontal: 12, minHeight: 32, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  whenRow: { flexDirection: 'row', gap: Spacing.sm },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 10 },
  draft: { borderRadius: Radius.md, padding: Spacing.md, gap: 5 },
  chipsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  event: { flexDirection: 'row', gap: 12, borderRadius: Radius.md, paddingVertical: 12, paddingRight: 14, overflow: 'hidden' },
  stripe: { width: 4, borderRadius: 2, marginLeft: 10 },
});
