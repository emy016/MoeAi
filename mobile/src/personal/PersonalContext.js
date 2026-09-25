/**
 * What MoeAI knows about this student, and the student's control over it:
 * memories (always / called), skills they switch on, and custom instructions.
 *
 * Signed in, the account is the source of truth (/api/personal) and this is
 * a cached copy. As a guest it all lives on the device, and a snapshot goes
 * with each message so MoeAI still remembers them.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '../ai/client';
import { AsyncStorage, readStoredValue, storageKey } from '../storage/persistedStorage';
import { useAccount } from '../account/AccountContext';

const KEY = storageKey('personal-v1');
const EMPTY = { memories: [], skills: [], instructions: '' };
const makeId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const cleanKey = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 60);

/** Ready-made skills a student can switch on in one tap. */
export const SKILL_TEMPLATES = [
  { name: 'Exam Cram', content: '- Answer in at most 6 bullet points.\n- Lead with the formula or definition the exam will ask for.\n- End with one exam-style question and wait for my answer.' },
  { name: 'Worked Example First', content: '- Start every explanation with a fully worked example using real numbers.\n- Only then state the general rule.\n- Label each step "Step 1", "Step 2"...' },
  { name: 'Socratic Mode', content: '- Never give the final answer first.\n- Ask me one guiding question at a time and wait.\n- Reveal the answer only after two attempts or if I ask.' },
  { name: 'Franco-Arabic Always', content: '- Reply in Franco-Arabic (Arabic written in Latin letters with numbers like 3, 7, 2).\n- Keep technical terms in English.' },
  { name: 'Short Answers', content: '- Keep answers under 80 words unless I say "more".\n- No headings. One example at most.' },
  { name: 'Code in C++', content: '- Whenever code helps, use C++17 with comments.\n- Show the output of the code after it.' },
];

import { setPersonalSnapshot } from './snapshot';

let snapshot = EMPTY;
const remember = (next) => { snapshot = next; setPersonalSnapshot(next); };

async function api(body) {
  const res = await fetch(`${API_BASE_URL}/api/personal`, {
    method: body ? 'POST' : 'GET',
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(data?.error || 'Something went wrong. Try again.');
  return data;
}

const PersonalContext = createContext(null);

export function PersonalProvider({ children }) {
  const { account } = useAccount();
  const signedIn = account.status === 'signedIn';
  const [state, setState] = useState(EMPTY);
  const [panel, setPanel] = useState(null); // null | 'memory' | 'skills' | 'instructions'
  const [lastRemembered, setLastRemembered] = useState(null);
  const loaded = useRef(false);

  const commit = useCallback((next) => {
    setState(next);
    remember(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  useEffect(() => {
    readStoredValue(KEY).then((raw) => {
      try { const parsed = JSON.parse(raw || 'null'); if (parsed && !loaded.current) { setState({ ...EMPTY, ...parsed }); remember({ ...EMPTY, ...parsed }); } } catch (_) {}
    }).catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    if (!signedIn) return;
    try {
      const data = await api();
      loaded.current = true;
      commit({ memories: data.memories || [], skills: data.skills || [], instructions: data.instructions || '' });
    } catch (_) {}
  }, [commit, signedIn]);
  useEffect(() => { refresh(); }, [refresh]);

  const run = useCallback(async (body, localUpdate) => {
    if (signedIn) {
      const data = await api(body);
      commit({ memories: data.memories || [], skills: data.skills || [], instructions: data.instructions || '' });
    } else {
      commit(localUpdate(snapshot));
    }
  }, [commit, signedIn]);

  const saveMemory = useCallback((memory) => run(
    { action: 'memory.save', ...memory },
    (s) => {
      const key = cleanKey(memory.key);
      const rest = s.memories.filter((m) => m.id !== memory.id && m.key !== key);
      return { ...s, memories: [{ id: memory.id || makeId('mem'), key, value: String(memory.value).slice(0, 300), importance: memory.importance === 'always' ? 'always' : 'called', source: 'student', updated_at: new Date().toISOString() }, ...rest] };
    },
  ), [run]);
  const deleteMemory = useCallback((id) => run({ action: 'memory.delete', id }, (s) => ({ ...s, memories: s.memories.filter((m) => m.id !== id) })), [run]);
  const clearMemory = useCallback(() => run({ action: 'memory.clear' }, (s) => ({ ...s, memories: [] })), [run]);
  const saveSkill = useCallback((skill) => run(
    { action: 'skill.save', ...skill },
    (s) => {
      const rest = s.skills.filter((k) => k.id !== skill.id);
      return { ...s, skills: [{ id: skill.id || makeId('skill'), name: skill.name, content: skill.content, enabled: skill.enabled !== false, source: skill.source || 'student' }, ...rest] };
    },
  ), [run]);
  const deleteSkill = useCallback((id) => run({ action: 'skill.delete', id }, (s) => ({ ...s, skills: s.skills.filter((k) => k.id !== id) })), [run]);
  const saveInstructions = useCallback((instructions) => run({ action: 'instructions.save', instructions }, (s) => ({ ...s, instructions: String(instructions).slice(0, 1500) })), [run]);
  const draftSkill = useCallback((goal) => api({ action: 'skill.draft', goal }), []);

  /** What MoeAI chose to remember in a reply: kept on the device for guests, re-read from the account otherwise. */
  const applyRemembered = useCallback((memories = [], skills = []) => {
    if (!memories.length && !skills.length) return;
    setLastRemembered({ memories, skills, at: Date.now() });
    if (signedIn) { setTimeout(refresh, 1500); return; }
    let next = snapshot;
    for (const m of memories) {
      const key = cleanKey(m.key);
      next = { ...next, memories: [{ id: makeId('mem'), key, value: m.value, importance: m.importance, source: 'tutor', updated_at: new Date().toISOString() }, ...next.memories.filter((x) => x.key !== key)] };
    }
    for (const k of skills) next = { ...next, skills: [{ id: makeId('skill'), name: k.name, content: k.content, enabled: true, source: 'tutor' }, ...next.skills.filter((x) => x.name !== k.name)] };
    commit(next);
  }, [commit, refresh, signedIn]);

  const value = useMemo(() => ({
    ...state, signedIn, panel, lastRemembered,
    openPanel: (tab = 'memory') => setPanel(tab), closePanel: () => setPanel(null),
    saveMemory, deleteMemory, clearMemory, saveSkill, deleteSkill, saveInstructions, draftSkill, applyRemembered, refresh,
  }), [applyRemembered, clearMemory, deleteMemory, deleteSkill, draftSkill, lastRemembered, panel, refresh, saveInstructions, saveMemory, saveSkill, signedIn, state]);

  return <PersonalContext.Provider value={value}>{children}</PersonalContext.Provider>;
}

export function usePersonal() {
  return useContext(PersonalContext) || { ...EMPTY, signedIn: false, panel: null, lastRemembered: null, openPanel() {}, closePanel() {}, applyRemembered() {} };
}
