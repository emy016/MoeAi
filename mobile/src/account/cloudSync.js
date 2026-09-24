/**
 * Keeps a signed-in student's app data in their MoeAI account.
 *
 * The app stays local-first: every store keeps reading and writing device
 * storage exactly as before. This listens to those writes and mirrors the
 * synced keys to /api/state (Supabase `user_state`, one row per key, readable
 * and writable only by that student through row-level security), and on
 * sign-in or return to the app pulls whatever another device saved later.
 *
 * Newest write wins per key. A value just received from the cloud is never
 * sent back, so two devices do not ping-pong the same data.
 */
import { AppState, Platform } from 'react-native';
import { API_BASE_URL } from '../ai/client';
import { AsyncStorage, onStorageWrite, storageKey, writeQuietly } from '../storage/persistedStorage';

export const SYNCED_KEYS = [
  'user-subjects-v1',
  'lecture-completion-overrides-v1',
  'lecture-chats-v1',
  'user-calendar-events-v1',
  'preferences-v2',
].map(storageKey);
const CHATS_KEY = storageKey('lecture-chats-v1');
const META_KEY = storageKey('sync-meta-v1');
const REMOTE = (key) => `app:${key}`;
/** Under the server's 256 KB per key. */
const MAX_BYTES = 240 * 1024;
const PUSH_DELAY_MS = 2500;

/**
 * What is worth sending. Attachment URIs point into this device (blob:,
 * file:, content:) and mean nothing elsewhere, so chats keep file names
 * only; if a student's chats still outgrow one row, the oldest threads stay
 * on this device.
 */
export function portable(key, raw) {
  if (key !== CHATS_KEY) return raw.length <= MAX_BYTES ? raw : null;
  let chats;
  try { chats = JSON.parse(raw); } catch (_) { return null; }
  const threads = [];
  for (const [lectureKey, list] of Object.entries(chats || {})) {
    for (const thread of Array.isArray(list) ? list : []) {
      threads.push({ lectureKey, thread: {
        ...thread,
        messages: (thread.messages || []).map((m) => ({ ...m, files: (m.files || []).map(({ uri, base64, ...file }) => ({ ...file, uri: /^https?:/.test(uri || '') ? uri : null })) })),
      } });
    }
  }
  threads.sort((a, b) => String(b.thread.updatedAt).localeCompare(String(a.thread.updatedAt)));
  for (let keep = threads.length; keep >= 0; keep = keep > 8 ? Math.floor(keep * 0.75) : keep - 1) {
    const out = {};
    threads.slice(0, keep).forEach(({ lectureKey, thread }) => { (out[lectureKey] = out[lectureKey] || []).push(thread); });
    const text = JSON.stringify(out);
    if (text.length <= MAX_BYTES) return text;
  }
  return null;
}

export function startCloudSync({ onRemoteApplied, onStatus }) {
  let meta = {};
  const lastSynced = {};
  const pending = new Set();
  let timer = null;
  let stopped = false;

  const status = (state) => { if (!stopped) onStatus?.({ state, at: Date.now() }); };
  const saveMeta = () => writeQuietly(META_KEY, JSON.stringify(meta)).catch(() => {});

  async function push() {
    timer = null;
    if (stopped || !pending.size) return;
    const keys = [...pending];
    pending.clear();
    const state = {};
    for (const key of keys) {
      const raw = await AsyncStorage.getItem(key);
      if (raw == null) continue;
      const data = portable(key, raw);
      if (data != null) state[REMOTE(key)] = { data, at: meta[key] || Date.now() };
    }
    if (!Object.keys(state).length) return;
    status('saving');
    try {
      const res = await fetch(`${API_BASE_URL}/api/state`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state }),
      });
      if (!res.ok) throw new Error(String(res.status));
      keys.forEach((key) => { if (state[REMOTE(key)]) lastSynced[key] = state[REMOTE(key)].data; });
      status('saved');
    } catch (_) {
      keys.forEach((key) => pending.add(key));
      status('offline');
      timer = setTimeout(push, 30000);
    }
  }

  const schedule = () => { if (timer) clearTimeout(timer); timer = setTimeout(push, PUSH_DELAY_MS); };

  async function pull() {
    if (stopped) return;
    let remote;
    try {
      const res = await fetch(`${API_BASE_URL}/api/state`, { credentials: 'include', headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(String(res.status));
      remote = (await res.json())?.state || {};
    } catch (_) { status('offline'); return; }
    let applied = false;
    for (const key of SYNCED_KEYS) {
      const entry = remote[REMOTE(key)];
      const localAt = meta[key] || 0;
      if (entry && typeof entry.data === 'string' && Number(entry.at) > localAt) {
        await writeQuietly(key, entry.data);
        meta[key] = Number(entry.at);
        lastSynced[key] = entry.data;
        applied = true;
      } else if ((!entry || localAt > Number(entry.at)) && (await AsyncStorage.getItem(key)) != null) {
        if (!meta[key]) meta[key] = Date.now();
        pending.add(key);
      }
    }
    saveMeta();
    status('saved');
    if (applied) onRemoteApplied?.();
    if (pending.size) schedule();
  }

  const unsubscribe = onStorageWrite((key, value) => {
    if (!SYNCED_KEYS.includes(key)) return;
    // Stores write back what they just loaded; that is not a change.
    if (lastSynced[key] === value) return;
    meta[key] = Date.now();
    saveMeta();
    pending.add(key);
    schedule();
  });

  // Coming back to the app is when another device's work should show up.
  const onFocus = () => { if (!stopped) pull(); };
  let appStateSub = null;
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const visible = () => { if (document.visibilityState === 'visible') onFocus(); };
    document.addEventListener('visibilitychange', visible);
    appStateSub = { remove: () => document.removeEventListener('visibilitychange', visible) };
  } else {
    appStateSub = AppState.addEventListener('change', (next) => { if (next === 'active') onFocus(); });
  }

  AsyncStorage.getItem(META_KEY).then((raw) => {
    try { meta = JSON.parse(raw || '{}') || {}; } catch (_) { meta = {}; }
    pull();
  });

  return {
    stop() {
      stopped = true;
      unsubscribe();
      appStateSub?.remove();
      if (timer) clearTimeout(timer);
    },
    /** Send anything unsaved now (before signing out). */
    flush: () => push(),
  };
}
