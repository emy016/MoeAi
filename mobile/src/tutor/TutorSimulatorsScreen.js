/**
 * Tutor mode's simulators: what MoeAI built for each course from its course
 * map, and the controls to grow it. "Build for this course" plans what the
 * material calls for (reusing a built-in engine only where it fits) and then
 * writes each custom simulator; staff can ask for a specific one, preview
 * anything, hide what they do not want students to see, rebuild or delete.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowPathIcon, EyeIcon, EyeSlashIcon, PlusIcon, SparklesIcon, TrashIcon } from 'react-native-heroicons/outline';
import ScreenContainer from '../components/ScreenContainer';
import CalendarAlertModal from '../components/CalendarAlertModal';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import { SimulatorView } from '../screens/SimulatorsScreen';
import { simFromRow } from '../simulators/courseSims';
import { buildCourseSimulators, tutorApi } from './tutorApi';
import { Banner, Btn, Chip, Empty, Field, FullPage, IconBtn, SectionTitle } from './ui';

const STATE = { ready: ['Live', 'good'], hidden: ['Hidden from students', 'muted'], planned: ['Planned', 'warn'], building: ['Building', 'warn'], failed: ['Failed', 'bad'] };
const courseName = (c) => (c.code_verified && c.code ? `${c.code} ${c.title}` : c.title);

function RequestSheet({ course, onClose, onDone }) {
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const submit = async () => {
    setError(''); setStage('Saving');
    try {
      const { sim } = await tutorApi('/api/sims', { body: { action: 'request', courseId: course.id, title, purpose } });
      setStage('MoeAI is building it (up to a minute)');
      await tutorApi('/api/sims', { body: { action: 'build', id: sim.id } });
      onDone();
    } catch (e) { setError(e.message); setStage(''); }
  };
  return (
    <FullPage visible title="Ask for a simulator" subtitle={courseName(course)} onClose={onClose}>
      <Banner message={error} onClose={() => setError('')} />
      <Field label="Name" value={title} onChangeText={setTitle} placeholder="e.g. RC circuit charging and discharging" />
      <Field label="What should students do and see?" value={purpose} onChangeText={setPurpose} multiline placeholder="Sliders for R, C and the source voltage; an animated capacitor voltage curve with the time constant marked; live readout of τ = RC and the voltage at t." />
      <Btn label={stage || 'Build it'} icon={SparklesIcon} busy={!!stage} disabled={title.trim().length < 3 || purpose.trim().length < 10} onPress={submit} />
    </FullPage>
  );
}

export default function TutorSimulatorsScreen({ active }) {
  const { colors, type } = usePreferences();
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState(null);
  const [rows, setRows] = useState(null);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [asking, setAsking] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busyRow, setBusyRow] = useState(null);

  useEffect(() => {
    if (!active || courses.length) return;
    tutorApi('/api/tutor?view=overview').then((d) => { setCourses(d.courses || []); setCourseId((id) => id || d.courses?.find((c) => c.organizedAt)?.id || d.courses?.[0]?.id || null); }).catch((e) => setError(e.message));
  }, [active, courses.length]);
  const load = useCallback(async () => {
    if (!courseId) return;
    try { const d = await tutorApi(`/api/sims?course=${courseId}`); setRows(d.sims || []); } catch (e) { setError(e.message); }
  }, [courseId]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const course = useMemo(() => courses.find((c) => c.id === courseId) || null, [courses, courseId]);
  const buildAll = async () => {
    setError('');
    try { const r = await buildCourseSimulators(courseId, setStage); if (r.failed) setError(`${r.failed} simulator${r.failed === 1 ? '' : 's'} could not be built. Tap Rebuild to try again.`); }
    catch (e) { setError(e.message); }
    setStage(''); load();
  };
  const patch = async (row, body) => {
    setBusyRow(row.id);
    try { await tutorApi('/api/sims', { method: 'PATCH', body: { id: row.id, ...body } }); } catch (e) { setError(e.message); }
    setBusyRow(null); load();
  };
  const rebuild = async (row) => {
    setBusyRow(row.id);
    try { await tutorApi('/api/sims', { body: { action: 'build', id: row.id } }); } catch (e) { setError(e.message); }
    setBusyRow(null); load();
  };
  const remove = async () => {
    const row = confirm; setConfirm(null);
    try { await tutorApi('/api/sims', { method: 'DELETE', body: { id: row.id } }); } catch (e) { setError(e.message); }
    load();
  };
  const live = (rows || []).filter((r) => r.status === 'ready').length;

  return (
    <ScreenContainer>
      <View style={{ gap: Spacing.md }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {courses.map((c) => {
            const on = c.id === courseId;
            return (
              <Pressable key={c.id} onPress={() => setCourseId(c.id)} style={[s.pick, { backgroundColor: on ? colors.accent : colors.cardButton }]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                <Text numberOfLines={1} style={[{ color: on ? '#fff' : colors.textSecondary }, type(12, 'bold', 16)]}>{courseName(c)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Banner message={error} onClose={() => setError('')} />
        {course ? (
          <View style={[s.card, { backgroundColor: colors.card }]}>
            <Text style={[{ color: colors.textPrimary }, type(15, 'bold', 20)]}>{courseName(course)}</Text>
            <Text style={[{ color: colors.textMuted }, type(12.5, 'regular', 18)]}>
              {course.organizedAt
                ? `${live} live for students. MoeAI decides from the course map what this course needs, reuses a built-in simulator only where it fits, and writes the rest.`
                : 'Organize this course first (Courses tab). MoeAI builds simulators from its course map.'}
            </Text>
            <View style={s.actions}>
              <Btn label={stage ? 'Building' : rows?.length ? 'Build more' : 'Build for this course'} icon={SparklesIcon} busy={!!stage} disabled={!course.organizedAt} onPress={buildAll} style={{ flex: 1 }} />
              <Btn label="Ask for one" icon={PlusIcon} tone="ghost" disabled={!!stage} onPress={() => setAsking(true)} style={{ flex: 1 }} />
            </View>
            {stage ? <Text style={[{ color: colors.textSecondary }, type(12.5, 'semiBold', 17)]}>{stage}</Text> : null}
          </View>
        ) : null}
        {rows && !rows.length ? <Empty title="No simulators yet" body="Build them for this course, or ask for a specific one." /> : null}
        {rows?.length ? <SectionTitle title={`${rows.length} simulators`} /> : null}
        {(rows || []).map((r) => {
          const [label, tone] = STATE[r.status] || [r.status, 'muted'];
          const sim = simFromRow(r);
          return (
            <View key={r.id} style={[s.card, { backgroundColor: colors.card }]}>
              <View style={s.rowTop}>
                <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
                  <View style={s.chips}><Chip label={label} tone={tone} /><Chip label={r.builtin_id ? 'Built-in engine' : r.source === 'staff' ? 'Requested' : 'Written by MoeAI'} tone={r.builtin_id ? 'muted' : 'accent'} /></View>
                  <Text style={[{ color: colors.textPrimary }, type(14.5, 'bold', 19)]}>{r.title}</Text>
                  {r.topic ? <Text numberOfLines={2} style={[{ color: colors.textMuted }, type(12, 'semiBold', 16)]}>{r.topic}</Text> : null}
                  {r.error ? <Text style={[{ color: colors.danger }, type(12, 'semiBold', 16)]}>{r.error}</Text> : null}
                </View>
              </View>
              <View style={s.chips}>
                {sim ? <Btn label="Preview" small onPress={() => setPreview(sim)} /> : null}
                {r.status === 'ready' ? <IconBtn icon={EyeSlashIcon} onPress={() => patch(r, { status: 'hidden' })} label="Hide from students" /> : null}
                {r.status === 'hidden' ? <IconBtn icon={EyeIcon} onPress={() => patch(r, { status: 'ready' })} label="Show to students" /> : null}
                {!r.builtin_id ? <Btn label={busyRow === r.id ? 'Building' : r.code ? 'Rebuild' : 'Build'} icon={ArrowPathIcon} small tone="ghost" busy={busyRow === r.id} onPress={() => rebuild(r)} /> : null}
                <IconBtn icon={TrashIcon} tone="danger" onPress={() => setConfirm(r)} label="Delete simulator" />
              </View>
            </View>
          );
        })}
      </View>
      {preview ? <SimulatorView sim={preview} onClose={() => setPreview(null)} /> : null}
      {asking && course ? <RequestSheet course={course} onClose={() => setAsking(false)} onDone={() => { setAsking(false); load(); }} /> : null}
      <CalendarAlertModal visible={!!confirm} destructive title="Delete this simulator?" message={confirm ? `Students stop seeing "${confirm.title}".` : ''} onClose={() => setConfirm(null)} onConfirm={remove} />
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  pick: { paddingHorizontal: 12, minHeight: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: Radius.md, padding: Spacing.md, gap: 10 },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  rowTop: { flexDirection: 'row', gap: 10 },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
});
