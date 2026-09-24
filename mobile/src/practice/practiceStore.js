/** Per-account practice archive and daily generation counters. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount } from '../account/AccountContext';
import { AsyncStorage, storageKey } from '../storage/persistedStorage';
import { DAILY_LIMITS } from './practiceEngine';

const empty = () => ({ archive: [], usage: {} });
const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

export function usePracticeStore() {
  const { account, revision } = useAccount();
  const identity = account.status === 'signedIn' ? (account.email || account.handle || account.name) : 'guest';
  const key = storageKey(`practice-v1-${encodeURIComponent(identity || 'guest')}`);
  const [data, setData] = useState(empty);
  const [ready, setReady] = useState(false);
  const dataRef = useRef(data);
  const keyRef = useRef(key);
  useEffect(() => {
    let alive = true;
    keyRef.current = key;
    setReady(false);
    AsyncStorage.getItem(key).then((raw) => {
      if (!alive) return;
      let parsed;
      try { parsed = raw ? JSON.parse(raw) : empty(); } catch (_) { parsed = empty(); }
      const next = { archive: Array.isArray(parsed.archive) ? parsed.archive : [], usage: parsed.usage && typeof parsed.usage === 'object' ? parsed.usage : {} };
      dataRef.current = next;
      setData(next);
      setReady(true);
    }).catch(() => { if (alive) { dataRef.current = empty(); setData(dataRef.current); setReady(true); } });
    return () => { alive = false; };
  }, [key, revision]);

  const update = useCallback((recipe) => {
    const next = recipe(dataRef.current);
    if (!next || next === dataRef.current) return false;
    dataRef.current = next;
    setData(next);
    AsyncStorage.setItem(keyRef.current, JSON.stringify(next)).catch(() => {});
    return true;
  }, []);
  const used = useCallback((kind) => data.usage[dayKey()]?.[kind] || 0, [data.usage]);
  const canGenerate = useCallback((kind, amount) => ready && used(kind) + amount <= DAILY_LIMITS[kind], [ready, used]);
  const recordGeneration = useCallback((kind, amount) => update((current) => {
    const day = dayKey();
    const today = current.usage[day] || {};
    if ((today[kind] || 0) + amount > DAILY_LIMITS[kind]) return current;
    return { ...current, usage: { [day]: { ...today, [kind]: (today[kind] || 0) + amount } } };
  }), [update]);
  const archiveQuestion = useCallback((entry) => update((current) => ({ ...current, archive: [{ ...entry, id: `${Date.now()}-${Math.random()}`, kind: 'question', at: new Date().toISOString() }, ...current.archive] })), [update]);
  const archiveExam = useCallback((entry) => update((current) => ({ ...current, archive: [{ ...entry, id: `${Date.now()}-${Math.random()}`, kind: 'exam', at: new Date().toISOString() }, ...current.archive] })), [update]);
  return { archive: data.archive, ready, used, canGenerate, recordGeneration, archiveQuestion, archiveExam };
}
