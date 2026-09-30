/**
 * One course, as its staff run it: the lecture files MoeAI learns from, the
 * course map it builds from them, and the passages it actually retrieves.
 * Everything here is live: uploads show each stage, processing is polled,
 * and a search runs the same hybrid retrieval a student's question does.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { ArrowPathIcon, ArrowUpTrayIcon, MagnifyingGlassIcon, SparklesIcon, TrashIcon } from 'react-native-heroicons/outline';
import KaTeXMessage from '../chat/KaTeXMessage';
import CalendarAlertModal from '../components/CalendarAlertModal';
import { Radius, Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';
import { organizeCourse, tutorApi, uploadMaterial } from './tutorApi';
import { Banner, Btn, Chip, Empty, Field, FullPage, IconBtn, Row, SectionTitle, Segmented, relTime } from './ui';

const STATUS = { ready: ['Ready', 'good'], processing: ['Reading', 'warn'], queued: ['Queued', 'warn'], failed: ['Failed', 'bad'], review: ['Needs review', 'accent'] };
const list = (v) => (Array.isArray(v) ? v : []);

function FilesTab({ course, onChanged }) {
  const { colors, type } = usePreferences();
  const [materials, setMaterials] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [organizing, setOrganizing] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const load = useCallback(async () => {
    try { const d = await tutorApi(`/api/organizer/materials?course=${course.id}`); if (alive.current) setMaterials(d.materials || []); }
    catch (e) { if (alive.current) setError(e.message); }
  }, [course.id]);
  useEffect(() => { load(); }, [load]);
  // Files being read on the server: check again until they settle.
  const working = (materials || []).some((m) => m.status === 'processing' || m.status === 'queued');
  useEffect(() => {
    if (!working) return undefined;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [working, load]);

  const pick = useCallback(async () => {
    setError('');
    const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown', 'text/csv', '*/*'] });
    if (result.canceled) return;
    const assets = (result.assets || []).filter((a) => /\.(pdf|pptx|docx|txt|md|markdown|csv|srt|vtt)$/i.test(a.name || ''));
    if (!assets.length) { setError('Pick PDF, PowerPoint (.pptx), Word (.docx) or text files.'); return; }
    const big = assets.find((a) => (a.size || 0) > 50 * 1024 * 1024);
    if (big) { setError(`${big.name} is over 50 MB. Split it and upload the parts.`); return; }
    setUploads(assets.map((a, i) => ({ key: `${Date.now()}-${i}`, name: a.name, stage: 'Waiting' })));
    // One at a time: each read uses the AI quota, and the list stays readable.
    for (let i = 0; i < assets.length; i += 1) {
      const set = (stage) => alive.current && setUploads((u) => u.map((x, j) => (j === i ? { ...x, stage } : x)));
      try { const r = await uploadMaterial(course.id, assets[i], set); set(`Done: ${r.pages} pages, ${r.chunks} passages`); }
      catch (e) { set(`Failed: ${e.message}`); }
      load();
    }
    onChanged?.();
    setTimeout(() => alive.current && setUploads((u) => u.filter((x) => x.stage.startsWith('Failed'))), 4000);
  }, [course.id, load, onChanged]);

  const organize = useCallback(async () => {
    setError('');
    try { await organizeCourse(course.id, (s) => alive.current && setOrganizing(s)); onChanged?.(); }
    catch (e) { setError(e.message); }
    finally { if (alive.current) setOrganizing(''); }
  }, [course.id, onChanged]);

  const retry = useCallback(async (m) => {
    setMaterials((all) => all.map((x) => (x.id === m.id ? { ...x, status: 'processing', error: null } : x)));
    try { await tutorApi('/api/organizer/process', { body: { courseId: course.id, id: m.id } }); } catch (e) { setError(e.message); }
    load(); onChanged?.();
  }, [course.id, load, onChanged]);

  const remove = useCallback(async () => {
    const m = confirm; setConfirm(null);
    if (!m) return;
    try { await tutorApi('/api/organizer/materials', { method: 'DELETE', body: { courseId: course.id, id: m.id } }); } catch (e) { setError(e.message); }
    load(); onChanged?.();
  }, [confirm, course.id, load, onChanged]);

  const ready = (materials || []).filter((m) => m.status === 'ready').length;
  return (
    <>
      <Banner message={error} onClose={() => setError('')} />
      <View style={s.actions}>
        <Btn label="Upload files" icon={ArrowUpTrayIcon} onPress={pick} style={{ flex: 1 }} />
        <Btn label={organizing ? 'Organizing' : 'Organize'} icon={SparklesIcon} tone="ghost" busy={!!organizing} disabled={!ready} onPress={organize} style={{ flex: 1 }} />
      </View>
      {organizing ? <Text style={[{ color: colors.textMuted }, type(12.5, 'semiBold', 17)]}>{organizing}</Text> : null}
      {uploads.map((u) => <Row key={u.key} title={u.name} subtitle={u.stage} right={u.stage.startsWith('Done') ? <Chip label="Added" tone="good" /> : u.stage.startsWith('Failed') ? <Chip label="Failed" tone="bad" /> : <Chip label={u.stage} tone="warn" />} />)}
      <SectionTitle title={materials ? `${materials.length} files · ${ready} ready` : 'Files'} right={<IconBtn icon={ArrowPathIcon} onPress={load} label="Refresh" />} />
      {materials && !materials.length ? <Empty title="No files yet" body="Upload the lecture slides, sheets and past exams. Scanned and handwritten PDFs are read too." /> : null}
      {(materials || []).map((m) => {
        const [label, tone] = STATUS[m.status] || [m.status, 'muted'];
        return (
          <Row key={m.id} title={m.title}
            subtitle={<View style={{ gap: 4 }}>
              <Text style={[{ color: colors.textMuted }, type(12, 'regular', 16)]}>{[m.pages ? `${m.pages} pages` : null, m.chunk_count ? `${m.chunk_count} passages` : null, relTime(m.updated_at || m.created_at)].filter(Boolean).join(' · ')}</Text>
              {m.error ? <Text style={[{ color: m.status === 'failed' ? colors.danger : colors.textSecondary }, type(12, 'semiBold', 16)]}>{m.error}</Text> : null}
            </View>}
            right={<View style={s.rowRight}><Chip label={label} tone={tone} />
              {m.status === 'failed' ? <IconBtn icon={ArrowPathIcon} onPress={() => retry(m)} label="Retry" /> : null}
              <IconBtn icon={TrashIcon} tone="danger" onPress={() => setConfirm(m)} label="Delete file" /></View>} />
        );
      })}
      <CalendarAlertModal visible={!!confirm} title="Delete this file?" message={confirm ? `"${confirm.title}" and every passage MoeAI learned from it will be removed.` : ''} destructive onClose={() => setConfirm(null)} onConfirm={remove} />
    </>
  );
}

function MapTab({ course, onChanged }) {
  const { colors, type } = usePreferences();
  const [brain, setBrain] = useState(undefined);
  const [overview, setOverview] = useState('');
  const [code, setCode] = useState(course.code || '');
  const [saving, setSaving] = useState('');
  const [note, setNote] = useState(null);
  const [open, setOpen] = useState(-1);
  useEffect(() => {
    tutorApi(`/api/organizer/brain?course=${course.id}`).then((d) => { setBrain(d.brain); setOverview(d.brain?.overview || ''); }).catch((e) => setNote({ tone: 'bad', text: e.message }));
  }, [course.id]);
  const saveOverview = async () => {
    setSaving('map');
    try { await tutorApi('/api/tutor', { body: { action: 'brainSave', courseId: course.id, overview } }); setNote({ tone: 'good', text: 'Course map saved. MoeAI uses it from the next question.' }); }
    catch (e) { setNote({ tone: 'bad', text: e.message }); }
    setSaving('');
  };
  const saveCode = async () => {
    setSaving('code');
    try { await tutorApi('/api/organizer/brain', { body: { courseId: course.id, step: 'code', code } }); setNote({ tone: 'good', text: 'Course code saved. Students now see it.' }); onChanged?.(); }
    catch (e) { setNote({ tone: 'bad', text: e.message }); }
    setSaving('');
  };
  if (brain === undefined) return <Text style={[{ color: colors.textMuted }, type(13, 'regular', 18)]}>Loading the course map…</Text>;
  return (
    <>
      {note ? <Banner message={note.text} tone={note.tone} onClose={() => setNote(null)} /> : null}
      <View style={[s.card, { backgroundColor: colors.card }]}>
        <Field label="Course code (what students see)" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="e.g. CS103" />
        <Btn label="Save code" small tone="ghost" busy={saving === 'code'} onPress={saveCode} style={{ alignSelf: 'flex-start' }} />
      </View>
      {!brain ? <Empty title="Not organized yet" body="Upload files, then press Organize on the Files tab. MoeAI reads every file and writes the course map it teaches from." /> : (
        <>
          <View style={[s.card, { backgroundColor: colors.card }]}>
            <Field label="Overview (MoeAI reads this before every answer in this course)" value={overview} onChangeText={setOverview} multiline inputStyle={{ minHeight: 160 }} />
            <Btn label="Save overview" small busy={saving === 'map'} onPress={saveOverview} style={{ alignSelf: 'flex-start' }} />
          </View>
          {list(brain.outline).length ? <SectionTitle title={`Outline · ${list(brain.outline).length} topics`} /> : null}
          {list(brain.outline).map((o, i) => <Row key={`o${i}`} title={`${o.week ? `Week ${o.week}: ` : ''}${o.topic || ''}`} subtitle={list(o.subtopics).join(' · ')} />)}
          {list(brain.formulas).length ? <SectionTitle title={`Formulas · ${list(brain.formulas).length}`} /> : null}
          {list(brain.formulas).map((f, i) => (
            <View key={`f${i}`} style={[s.card, { backgroundColor: colors.card }]}>
              <Text style={[{ color: colors.textPrimary }, type(13.5, 'bold', 18)]}>{f.name}</Text>
              {f.latex ? <KaTeXMessage text={`$$${f.latex}$$`} color={colors.textPrimary} style={type(14, 'regular', 20)} /> : null}
              {f.when ? <Text style={[{ color: colors.textMuted }, type(12, 'regular', 17)]}>{f.when}</Text> : null}
            </View>
          ))}
          {list(brain.mistakes).length ? <SectionTitle title="Mistakes students make" /> : null}
          {list(brain.mistakes).map((m, i) => <Row key={`m${i}`} title={m.mistake || String(m)} subtitle={m.fix || ''} />)}
          {list(brain.practice).length ? <SectionTitle title={`Practice questions · ${list(brain.practice).length}`} /> : null}
          {list(brain.practice).map((p, i) => (
            <View key={`p${i}`} style={[s.card, { backgroundColor: colors.card }]}>
              <View style={s.rowRight}>{p.difficulty ? <Chip label={p.difficulty} tone={p.difficulty === 'hard' ? 'bad' : p.difficulty === 'medium' ? 'warn' : 'good'} /> : null}{p.topic ? <Chip label={p.topic} /> : null}</View>
              <KaTeXMessage text={p.question} color={colors.textPrimary} style={type(14, 'regular', 20)} />
              {open === i ? <KaTeXMessage text={p.answer} color={colors.textSecondary} style={type(13.5, 'regular', 20)} /> : <Btn label="Show answer" small tone="ghost" onPress={() => setOpen(i)} style={{ alignSelf: 'flex-start' }} />}
            </View>
          ))}
          {list(brain.glossary).length ? <SectionTitle title={`Glossary · ${list(brain.glossary).length}`} /> : null}
          {list(brain.glossary).map((g, i) => <Row key={`g${i}`} title={g.term} subtitle={`${g.definition || ''}${g.source ? `  (${g.source})` : ''}`} />)}
        </>
      )}
    </>
  );
}

function PassagesTab({ course }) {
  const { colors, type } = usePreferences();
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [materials, setMaterials] = useState([]);
  const [browse, setBrowse] = useState(null);
  const [expanded, setExpanded] = useState(null);
  useEffect(() => { tutorApi(`/api/organizer/materials?course=${course.id}`).then((d) => setMaterials((d.materials || []).filter((m) => m.status === 'ready'))).catch(() => {}); }, [course.id]);
  const search = async () => {
    if (!q.trim()) return;
    setBusy(true); setError(''); setBrowse(null);
    try { const d = await tutorApi('/api/tutor', { body: { action: 'passagesSearch', courseId: course.id, q, count: 8 } }); setResults(d.passages || []); }
    catch (e) { setError(e.message); }
    setBusy(false);
  };
  const openFile = async (m) => {
    setBusy(true); setError(''); setResults(null);
    try { const d = await tutorApi('/api/tutor', { body: { action: 'passagesList', courseId: course.id, materialId: m.id } }); setBrowse({ material: m, passages: d.passages || [] }); }
    catch (e) { setError(e.message); }
    setBusy(false);
  };
  const del = async (p) => {
    try {
      await tutorApi('/api/tutor', { body: { action: 'passageDelete', courseId: course.id, id: p.id } });
      setResults((r) => r && r.filter((x) => x.id !== p.id));
      setBrowse((b) => b && { ...b, passages: b.passages.filter((x) => x.id !== p.id) });
    } catch (e) { setError(e.message); }
  };
  const shown = results || browse?.passages || null;
  return (
    <>
      <Text style={[{ color: colors.textMuted }, type(12.5, 'regular', 18)]}>Type a question the way a student would. These are the passages MoeAI would read before answering, best first.</Text>
      <View style={s.actions}>
        <Field value={q} onChangeText={setQ} placeholder="e.g. how does a JK flip-flop toggle?" onSubmitEditing={search} returnKeyType="search" style={{ flex: 1 }} />
        <Btn icon={MagnifyingGlassIcon} onPress={search} busy={busy} />
      </View>
      <Banner message={error} onClose={() => setError('')} />
      {!shown ? (
        <>
          <SectionTitle title="Or browse a file" />
          {materials.map((m) => <Row key={m.id} title={m.title} subtitle={`${m.chunk_count || 0} passages`} onPress={() => openFile(m)} />)}
          {!materials.length ? <Empty title="Nothing to search yet" body="Once files are ready, their passages appear here." /> : null}
        </>
      ) : (
        <>
          <SectionTitle title={browse ? `${browse.material.title} · ${shown.length} passages` : `${shown.length} passages`} right={<Btn label="Back" small tone="ghost" onPress={() => { setResults(null); setBrowse(null); }} />} />
          {!shown.length ? <Empty title="No passage matched" body="MoeAI would say the material does not cover this and answer from general knowledge, labelled as such." /> : null}
          {shown.map((p, i) => (
            <View key={p.id} style={[s.card, { backgroundColor: colors.card }]}>
              <View style={s.rowRight}>
                {results ? <Chip label={`#${i + 1}`} tone="accent" solid /> : null}
                <Text numberOfLines={1} style={[{ color: colors.textSecondary, flex: 1 }, type(12, 'bold', 16)]}>{[p.material_title, p.page ? `p.${p.page}` : null, p.heading].filter(Boolean).join(' · ')}</Text>
                <IconBtn icon={TrashIcon} tone="danger" onPress={() => del(p)} label="Delete passage" />
              </View>
              <KaTeXMessage text={expanded === p.id ? p.content : `${p.content.slice(0, 420)}${p.content.length > 420 ? '…' : ''}`} color={colors.textPrimary} style={type(13, 'regular', 19)} />
              {p.content.length > 420 ? <Btn label={expanded === p.id ? 'Show less' : 'Show all'} small tone="ghost" onPress={() => setExpanded(expanded === p.id ? null : p.id)} style={{ alignSelf: 'flex-start' }} /> : null}
            </View>
          ))}
        </>
      )}
    </>
  );
}

export default function CourseWorkspace({ course, onClose, onChanged }) {
  const [tab, setTab] = useState('files');
  const options = useMemo(() => [{ id: 'files', label: 'Files' }, { id: 'map', label: 'Course map' }, { id: 'passages', label: 'Passages' }], []);
  if (!course) return null;
  const subtitle = [course.code_verified && course.code ? course.code : null, `${course.ready}/${course.files} files ready`, `${course.passages} passages`].filter(Boolean).join(' · ');
  return (
    <FullPage visible title={course.title} subtitle={subtitle} onClose={onClose}>
      <Segmented options={options} value={tab} onChange={setTab} />
      {tab === 'files' ? <FilesTab course={course} onChanged={onChanged} /> : tab === 'map' ? <MapTab course={course} onChanged={onChanged} /> : <PassagesTab course={course} />}
    </FullPage>
  );
}

const s = StyleSheet.create({
  actions: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  card: { borderRadius: Radius.md, padding: Spacing.md, gap: 10 },
});
