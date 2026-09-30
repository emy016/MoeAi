/**
 * Tutor mode's first tab: every course the staff member runs, with the
 * state of MoeAI's knowledge of it at a glance (files, passages, course map,
 * simulators, what is coming up). A course opens its workspace.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import ElasticPressable from '../components/ElasticPressable';
import SubjectIcon from '../components/SubjectIcon';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import CourseWorkspace from './CourseWorkspace';
import { tutorApi } from './tutorApi';
import { Banner, Chip, SectionTitle, Stat } from './ui';

function CourseCard({ course, onPress }) {
  const { colors, type } = usePreferences();
  const share = course.files ? course.ready / course.files : 0;
  const state = course.working ? ['Reading files', 'warn'] : course.failed ? [`${course.failed} failed`, 'bad'] : !course.files ? ['No files', 'muted'] : !course.organizedAt ? ['Not organized', 'warn'] : ['Live', 'good'];
  return (
    <View style={s.slot}>
      <ElasticPressable shape="pill" onPress={() => onPress(course)} accessibilityRole="button" accessibilityLabel={`${course.title}, ${state[0]}`}>
        <View style={[s.card, { backgroundColor: colors.card }]}>
          <View style={s.top}>
            <Text numberOfLines={2} style={[{ color: colors.textPrimary, flex: 1 }, type(14, 'bold', 18)]}>{course.title}</Text>
            <SubjectIcon name={course.title} color={colors.textPrimary} size={28} />
          </View>
          <Text numberOfLines={1} style={[{ color: colors.textMuted }, type(11.5, 'semiBold', 15)]}>
            {[course.code_verified && course.code ? course.code : null, `${course.files} files`, `${course.passages} passages`].filter(Boolean).join(' · ')}
          </Text>
          <View style={[s.track, { backgroundColor: colors.track }]}><View style={[s.fill, { backgroundColor: colors.accent, width: `${Math.round(share * 100)}%` }]} /></View>
          <View style={s.chips}>
            <Chip label={state[0]} tone={state[1]} />
            {course.sims ? <Chip label={`${course.sims} sims`} tone="accent" /> : null}
            {course.upcoming ? <Chip label={`${course.upcoming} upcoming`} /> : null}
          </View>
        </View>
      </ElasticPressable>
    </View>
  );
}

export default function TutorCoursesScreen({ active }) {
  const { colors, type } = usePreferences();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const load = useCallback(async () => {
    try { setData(await tutorApi('/api/tutor?view=overview')); setError(''); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { if (active) load(); }, [active, load]);
  const courses = data?.courses || [];
  const totals = useMemo(() => courses.reduce((t, c) => ({ files: t.files + c.files, passages: t.passages + c.passages, live: t.live + (c.organizedAt ? 1 : 0), upcoming: t.upcoming + c.upcoming }), { files: 0, passages: 0, live: 0, upcoming: 0 }), [courses]);
  const byYear = useMemo(() => {
    const groups = new Map();
    for (const c of courses) {
      const key = c.year ? `Year ${c.year}${c.semester ? ` · Semester ${c.semester}` : ''}` : 'Courses';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }
    return [...groups.entries()];
  }, [courses]);
  const current = open ? courses.find((c) => c.id === open) || null : null;

  return (
    <ScreenContainer>
      <View style={{ gap: Spacing.md }}>
        <Banner message={error} onClose={() => setError('')} />
        <View style={[s.hero, { backgroundColor: colors.card }]}>
          <Text style={[{ color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.7 }, type(11.5, 'bold', 15)]}>{data?.org?.name ? `MoeAI · ${data.org.name}` : 'MoeAI'}</Text>
          <View style={s.stats}>
            <Stat value={`${totals.live}/${courses.length || 0}`} label="Courses live" tone="accent" />
            <Stat value={totals.files} label="Files" />
            <Stat value={totals.passages} label="Passages" />
            <Stat value={totals.upcoming} label="Upcoming" />
          </View>
        </View>
        {byYear.map(([label, list]) => (
          <View key={label} style={{ gap: Spacing.sm }}>
            <SectionTitle title={label} />
            <View style={s.grid}>{list.map((c) => <CourseCard key={c.id} course={c} onPress={(x) => setOpen(x.id)} />)}</View>
          </View>
        ))}
        {data && !courses.length ? <Text style={[{ color: colors.textMuted, textAlign: 'center' }, type(13, 'regular', 19)]}>No courses in this university yet.</Text> : null}
      </View>
      {current ? <CourseWorkspace course={current} onClose={() => { setOpen(null); load(); }} onChanged={load} /> : null}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  hero: { borderRadius: Radius.md, padding: Spacing.md, gap: 12 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: Spacing.sm },
  slot: { width: '48.8%' },
  card: { minHeight: 132, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 12, gap: 8 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  track: { height: 6, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
