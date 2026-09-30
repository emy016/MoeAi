/**
 * Tutor mode's people: everyone in the university, how much they use MoeAI,
 * and the controls a manager needs (which courses each person has, student
 * or staff, suspend or remove), plus the join links that bring a class in.
 * Only the university's managers (owners) see this; the database enforces it.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { CheckIcon, LinkIcon, MagnifyingGlassIcon, PlusIcon } from 'react-native-heroicons/outline';
import ScreenContainer from '../components/ScreenContainer';
import CalendarAlertModal from '../components/CalendarAlertModal';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import { copyText, tutorApi } from './tutorApi';
import { Banner, Btn, Chip, Empty, Field, FullPage, SectionTitle, Segmented, Stat } from './ui';

const courseName = (c) => (c.code_verified && c.code ? `${c.code} ${c.title}` : c.title);
const lastSeen = (day) => {
  if (!day) return 'never used MoeAI';
  const d = Math.round((Date.now() - new Date(`${day}T12:00:00Z`).getTime()) / 86400000);
  return d <= 0 ? 'active today' : d === 1 ? 'active yesterday' : `active ${d} days ago`;
};

function UsageChart({ usage }) {
  const { colors, type } = usePreferences();
  const max = Math.max(1, ...usage.map((u) => u.messages));
  return (
    <View style={[s.card, { backgroundColor: colors.card }]}>
      <View style={s.rowBetween}>
        <Text style={[{ color: colors.textPrimary }, type(14, 'bold', 19)]}>Messages to MoeAI</Text>
        <Text style={[{ color: colors.textMuted }, type(11.5, 'semiBold', 15)]}>last 14 days</Text>
      </View>
      <View style={s.chart}>
        {usage.map((u, i) => (
          <View key={u.day} style={s.barSlot} accessibilityLabel={`${u.day}: ${u.messages} messages from ${u.students} people`}>
            <Text style={[{ color: colors.textMuted, opacity: u.messages ? 1 : 0 }, type(9, 'bold', 11)]}>{u.messages}</Text>
            <View style={[s.bar, { height: `${Math.max(3, (u.messages / max) * 78)}%`, backgroundColor: i === usage.length - 1 ? colors.accent : colors.track }]} />
            <Text style={[{ color: colors.textMuted }, type(9, 'semiBold', 11)]}>{new Date(`${u.day}T12:00:00Z`).getDate()}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PersonSheet({ person, courses, onClose, onChanged }) {
  const { colors, type } = usePreferences();
  const [picked, setPicked] = useState(() => new Set(person.course_ids || []));
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const owner = person.role === 'owner';
  const act = async (label, body) => {
    setBusy(label); setError('');
    try { await tutorApi('/api/tutor', { body: { ...body, userId: person.user_id } }); onChanged(); }
    catch (e) { setError(e.message); }
    setBusy('');
  };
  const toggle = (id) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const changed = picked.size !== (person.course_ids || []).length || [...picked].some((id) => !(person.course_ids || []).includes(id));
  return (
    <FullPage visible title={person.display_name || person.external_id || 'Member'} subtitle={[person.external_id, lastSeen(person.last_active)].filter(Boolean).join(' · ')} onClose={onClose}>
      <Banner message={error} onClose={() => setError('')} />
      <View style={s.stats}>
        <Stat value={person.messages_today} label="Today" />
        <Stat value={person.messages_7d} label="7 days" />
        <Stat value={person.messages_total} label="All time" />
      </View>
      {owner ? <Text style={[{ color: colors.textMuted }, type(13, 'regular', 19)]}>A manager of this university. Managers cannot be changed from the app.</Text> : (
        <>
          <SectionTitle title="Role" />
          <Segmented options={[{ id: 'student', label: 'Student' }, { id: 'teacher', label: 'Staff (TA, lecturer)' }]} value={person.role} onChange={(role) => role !== person.role && act('role', { action: 'role', role })} />
          <SectionTitle title={`Courses · ${picked.size} of ${courses.length}`} right={<Btn label={picked.size === courses.length ? 'None' : 'All'} small tone="ghost" onPress={() => setPicked(picked.size === courses.length ? new Set() : new Set(courses.map((c) => c.id)))} />} />
          {courses.map((c) => {
            const on = picked.has(c.id);
            return (
              <Pressable key={c.id} onPress={() => toggle(c.id)} style={[s.check, { backgroundColor: colors.card }]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                <View style={[s.box, { borderColor: on ? colors.accent : colors.track, backgroundColor: on ? colors.accent : 'transparent' }]}>{on ? <CheckIcon size={14} color="#fff" /> : null}</View>
                <Text style={[{ color: colors.textPrimary, flex: 1 }, type(13.5, 'semiBold', 18)]}>{courseName(c)}</Text>
                {c.year ? <Chip label={`Year ${c.year}`} /> : null}
              </Pressable>
            );
          })}
          {changed ? <Btn label="Save courses" busy={busy === 'courses'} onPress={() => act('courses', { action: 'courses', courses: [...picked] })} /> : null}
          <SectionTitle title="Access" />
          <View style={s.actions}>
            {person.status === 'active'
              ? <Btn label="Suspend" tone="ghost" busy={busy === 'status'} onPress={() => setConfirm('suspended')} style={{ flex: 1 }} />
              : <Btn label="Reactivate" busy={busy === 'status'} onPress={() => act('status', { action: 'status', status: 'active' })} style={{ flex: 1 }} />}
            <Btn label="Remove" tone="danger" onPress={() => setConfirm('removed')} style={{ flex: 1 }} />
          </View>
        </>
      )}
      <CalendarAlertModal visible={!!confirm} destructive title={confirm === 'removed' ? 'Remove from the university?' : 'Suspend this account?'}
        message={confirm === 'removed' ? 'They lose every course and MoeAI stops answering from its material. Their own account stays.' : 'They keep their account but lose access to the courses until you reactivate them.'}
        onClose={() => setConfirm(null)} onConfirm={() => { const status = confirm; setConfirm(null); act('status', { action: 'status', status }); }} />
    </FullPage>
  );
}

function JoinLinks({ codes, onChanged }) {
  const { colors, type } = usePreferences();
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState(null);
  const create = async (role) => {
    setBusy(role);
    try { const r = await tutorApi('/api/tutor', { body: { action: 'joinCreate', role } }); const ok = await copyText(r.link); setNote({ tone: 'good', text: ok ? `New link copied: ${r.link}` : `New link: ${r.link}` }); onChanged(); }
    catch (e) { setNote({ tone: 'bad', text: e.message }); }
    setBusy('');
  };
  const toggle = async (code, active) => {
    try { await tutorApi('/api/tutor', { body: { action: 'joinToggle', code, active } }); onChanged(); } catch (e) { setNote({ tone: 'bad', text: e.message }); }
  };
  return (
    <>
      <SectionTitle title="Join links" />
      {note ? <Banner message={note.text} tone={note.tone} onClose={() => setNote(null)} /> : null}
      {codes.map((c) => {
        const expired = c.expires_at && new Date(c.expires_at) < new Date();
        return (
          <View key={c.code} style={[s.card, { backgroundColor: colors.card, opacity: c.active && !expired ? 1 : 0.6 }]}>
            <View style={s.rowBetween}>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={s.chips}><Chip label={c.role === 'teacher' ? 'Staff' : 'Students'} tone={c.role === 'teacher' ? 'accent' : 'good'} />{expired ? <Chip label="Expired" tone="bad" /> : null}</View>
                <Text selectable style={[{ color: colors.textPrimary }, type(14, 'bold', 19)]}>{c.code}</Text>
                <Text style={[{ color: colors.textMuted }, type(12, 'semiBold', 16)]}>{`${c.uses} of ${c.max_uses} used${c.expires_at ? ` · until ${new Date(c.expires_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}`}</Text>
              </View>
              <Switch value={Boolean(c.active)} onValueChange={(v) => toggle(c.code, v)} trackColor={{ true: colors.accent }} accessibilityLabel="Link active" />
            </View>
            <Btn label="Copy link" icon={LinkIcon} small tone="ghost" onPress={async () => setNote({ tone: 'good', text: (await copyText(c.link)) ? 'Link copied.' : c.link })} style={{ alignSelf: 'flex-start' }} />
          </View>
        );
      })}
      <View style={s.actions}>
        <Btn label="Student link" icon={PlusIcon} tone="ghost" busy={busy === 'student'} onPress={() => create('student')} style={{ flex: 1 }} />
        <Btn label="Staff link" icon={PlusIcon} tone="ghost" busy={busy === 'teacher'} onPress={() => create('teacher')} style={{ flex: 1 }} />
      </View>
    </>
  );
}

export default function TutorPeopleScreen({ active }) {
  const { colors, type } = usePreferences();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('students');
  const [open, setOpen] = useState(null);
  const load = useCallback(async () => {
    try { setData(await tutorApi('/api/tutor?view=people')); setError(''); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { if (active) load(); }, [active, load]);
  const people = data?.people || [];
  const shown = useMemo(() => people.filter((p) => {
    if (filter === 'students' && p.role !== 'student') return false;
    if (filter === 'staff' && p.role === 'student') return false;
    if (filter === 'suspended' && p.status === 'active') return false;
    if (filter !== 'suspended' && p.status === 'removed') return false;
    const needle = q.trim().toLowerCase();
    return !needle || `${p.display_name || ''} ${p.external_id || ''}`.toLowerCase().includes(needle);
  }), [people, filter, q]);
  const students = people.filter((p) => p.role === 'student' && p.status === 'active');
  const today = people.reduce((n, p) => n + (p.messages_today || 0), 0);
  const activeToday = people.filter((p) => p.messages_today > 0).length;
  const current = open ? people.find((p) => p.user_id === open) : null;

  if (error && !data) return <ScreenContainer><Empty title="People are for managers" body={error} /></ScreenContainer>;
  return (
    <ScreenContainer>
      <View style={{ gap: Spacing.md }}>
        <Banner message={error} onClose={() => setError('')} />
        <View style={s.stats}>
          <Stat value={students.length} label="Students" tone="accent" />
          <Stat value={activeToday} label="Active today" />
          <Stat value={today} label="Messages today" />
        </View>
        {data?.usage?.length ? <UsageChart usage={data.usage} /> : null}
        <SectionTitle title="People" />
        <Field value={q} onChangeText={setQ} placeholder="Search by name or university ID" autoCapitalize="none" />
        <Segmented options={[{ id: 'students', label: 'Students' }, { id: 'staff', label: 'Staff' }, { id: 'suspended', label: 'Suspended' }]} value={filter} onChange={setFilter} />
        {data && !shown.length ? <Empty title="Nobody here" body={filter === 'students' ? 'Share a student join link below: each student who opens it joins the university and its courses.' : 'No one matches.'} /> : null}
        {shown.map((p) => (
          <Pressable key={p.user_id} onPress={() => setOpen(p.user_id)} style={({ pressed }) => [s.person, { backgroundColor: pressed ? colors.cardButton : colors.card }]} accessibilityRole="button">
            <View style={[s.avatar, { backgroundColor: colors.cardButton }]}><Text style={[{ color: colors.textPrimary }, type(14, 'bold', 18)]}>{(p.display_name || p.external_id || '?').trim().charAt(0).toUpperCase()}</Text></View>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text numberOfLines={1} style={[{ color: colors.textPrimary }, type(14, 'bold', 19)]}>{p.display_name || p.external_id}</Text>
              <Text numberOfLines={1} style={[{ color: colors.textMuted }, type(12, 'semiBold', 16)]}>{[p.external_id, `${p.courses} courses`, lastSeen(p.last_active)].filter(Boolean).join(' · ')}</Text>
              <View style={s.chips}>
                {p.role !== 'student' ? <Chip label={p.role === 'owner' ? 'Manager' : 'Staff'} tone="accent" /> : null}
                {p.status !== 'active' ? <Chip label={p.status} tone="bad" /> : null}
                {p.is_demo ? <Chip label="Demo" /> : null}
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[{ color: colors.textPrimary, fontVariant: ['tabular-nums'] }, type(16, 'bold', 20)]}>{p.messages_7d}</Text>
              <Text style={[{ color: colors.textMuted }, type(10.5, 'semiBold', 13)]}>7 days</Text>
            </View>
          </Pressable>
        ))}
        {data ? <JoinLinks codes={data.codes || []} onChanged={load} /> : null}
      </View>
      {current ? <PersonSheet key={current.user_id + current.role + current.status + (current.course_ids || []).length} person={current} courses={data?.courses || []} onClose={() => setOpen(null)} onChanged={load} /> : null}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { borderRadius: Radius.md, padding: Spacing.md, gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  chart: { height: 120, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barSlot: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  bar: { width: '100%', borderRadius: 4, minHeight: 3 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 11 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
