/**
 * Tutor mode's calls to the site. Same session cookie as the rest of the app;
 * every permission is checked on the server (and again in Postgres).
 */
import { Platform } from 'react-native';
import { API_BASE_URL } from '../ai/client';

export async function tutorApi(path, { method, body, signal } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: method || (body ? 'POST' : 'GET'),
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal,
  });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status}).`);
  return data;
}

/**
 * One lecture file into a course: register it, upload the bytes straight to
 * storage with a signed URL (a 40 MB PDF never passes through a function),
 * then read, chunk and embed it. `onStage` reports progress for the row.
 */
export async function uploadMaterial(courseId, asset, onStage) {
  const name = asset.name || 'lecture.pdf';
  onStage?.('Preparing');
  const { id, path } = await tutorApi('/api/organizer/materials', { body: { courseId, fileName: name, title: name.replace(/\.[^.]+$/, '') } });
  const { url } = await tutorApi('/api/tutor', { body: { action: 'uploadUrl', courseId, path } });
  onStage?.('Uploading');
  const blob = asset.file || (await (await fetch(asset.uri)).blob());
  const put = await fetch(url, { method: 'PUT', headers: { 'Content-Type': asset.mimeType || blob.type || 'application/octet-stream', 'x-upsert': 'true' }, body: blob });
  if (!put.ok) {
    await tutorApi('/api/organizer/materials', { method: 'DELETE', body: { courseId, id } }).catch(() => {});
    throw new Error(`Upload failed (${put.status}). Check your connection and try again.`);
  }
  onStage?.('Reading');
  return tutorApi('/api/organizer/process', { body: { courseId, id } });
}

/**
 * Organize a course (build MoeAI's course map) in the same small steps the
 * server expects, so a big course never hits the function time limit.
 */
export async function organizeCourse(courseId, onStage) {
  const { files } = await tutorApi('/api/organizer/brain', { body: { courseId, step: 'plan' } });
  const todo = (files || []).filter((f) => f.needsDigest);
  for (let i = 0; i < todo.length; i += 1) {
    onStage?.(`Reading ${i + 1} of ${todo.length}: ${todo[i].title}`);
    await tutorApi('/api/organizer/brain', { body: { courseId, step: 'digest', materialId: todo[i].id } });
  }
  onStage?.('Building the course map');
  return tutorApi('/api/organizer/brain', { body: { courseId, step: 'merge' } });
}

/** Plan a course's simulators, then build every planned one. */
export async function buildCourseSimulators(courseId, onStage) {
  onStage?.('Deciding what this course needs');
  await tutorApi('/api/sims', { body: { action: 'plan', courseId } });
  const { sims } = await tutorApi(`/api/sims?course=${courseId}`);
  const todo = (sims || []).filter((s) => s.status === 'planned' || s.status === 'failed');
  let failed = 0;
  for (let i = 0; i < todo.length; i += 1) {
    onStage?.(`Building ${i + 1} of ${todo.length}: ${todo[i].title}`);
    try { await tutorApi('/api/sims', { body: { action: 'build', id: todo[i].id } }); } catch (_) { failed += 1; }
  }
  return { built: todo.length - failed, failed };
}

export const isWeb = Platform.OS === 'web';

/** Copy text, with a fallback for browsers that refuse the clipboard. */
export async function copyText(text) {
  try {
    if (isWeb && navigator?.clipboard) { await navigator.clipboard.writeText(text); return true; }
    const Clipboard = await import('expo-clipboard');
    await Clipboard.setStringAsync(text);
    return true;
  } catch (_) {
    return false;
  }
}
