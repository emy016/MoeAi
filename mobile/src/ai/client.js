/**
 * MoeAI's connection to the tutor.
 *
 * The app asks the EduMoe server (POST /api/moeai) instead of calling Gemini,
 * OpenRouter, Groq and CheaperInference itself. Provider keys compiled into a
 * web bundle can be read by anyone who opens the page, so they live on the
 * server, which also owns MoeAI's personality specs, provider fallback, key
 * rotation, language detection, rate limits and — for a signed-in student —
 * their course material and memory.
 *
 * `generateMoeAIReply` keeps the exact contract lectureChatStore relies on:
 * it resolves to { text, provider, model } or throws an Error whose message
 * is safe to show in the chat bubble.
 *
 * Wire format of the reply (NDJSON, one object per line):
 *   {"citations":[…]}  optional, first
 *   {"delta":"…"}      zero or more, in order
 *   {"done":true}      once, on success
 *   {"error":"…"}      instead, if the stream broke after it began
 */

const REQUEST_TIMEOUT_MS = 60000;
const HISTORY_TURNS = 10;
const MAX_MESSAGE_CHARS = 12000;
/** Mirrors MAX_ATTACHMENT_BYTES on the server (Vercel caps bodies at 4.5 MB). */
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const MAX_TEXT_ATTACHMENT_CHARS = 20000;

/**
 * On the web the app is served by the EduMoe site itself, so the tutor is on
 * this very origin and the request carries the student's session. A native
 * build has no origin and uses the deployment (override with
 * EXPO_PUBLIC_MOEAI_API_URL, e.g. a LAN address while developing).
 */
const fromEnv = typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_MOEAI_API_URL : undefined;
const sameOrigin = typeof window !== 'undefined' && window.location?.origin
  && /^https?:/.test(window.location.origin) ? window.location.origin : '';
export const API_BASE_URL = String(fromEnv || sameOrigin || 'https://moe-ai-sable.vercel.app').replace(/\/+$/, '');

function cleanHistory(history) {
  return (Array.isArray(history) ? history : [])
    .filter((message) => ['user', 'assistant'].includes(message?.role) && message?.text && message?.status !== 'pending' && message?.status !== 'failed')
    .slice(-(HISTORY_TURNS * 2))
    .map((message) => ({ role: message.role, content: String(message.text).slice(0, MAX_MESSAGE_CHARS) }));
}

function blobAsBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read attachment'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      resolve(dataUrl.includes(',') ? dataUrl.slice(dataUrl.indexOf(',') + 1) : '');
    };
    reader.readAsDataURL(blob);
  });
}

function blobAsText(blob) {
  if (typeof blob.text === 'function') return blob.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read attachment'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsText(blob);
  });
}

const isTextType = (mimeType) => mimeType.startsWith('text/') || /(?:json|xml|javascript|typescript|csv|markdown)/i.test(mimeType);

/** Reads each file once; binary files share one size budget so the request stays under the server's cap. */
async function prepareAttachments(files) {
  const unique = (Array.isArray(files) ? files : []).filter((file, index, all) => {
    const identity = file?.id || file?.uri || file?.name;
    return all.findIndex((candidate) => (candidate?.id || candidate?.uri || candidate?.name) === identity) === index;
  });
  let budget = MAX_ATTACHMENT_BYTES;
  const prepared = [];
  for (const file of unique) {
    const name = String(file?.name || 'attachment');
    const mimeType = String(file?.mimeType || 'application/octet-stream');
    if (!file?.uri) { prepared.push({ name, mimeType, note: 'content unavailable' }); continue; }
    try {
      const response = await fetch(file.uri);
      if (!response.ok) throw new Error('Attachment could not be opened');
      const blob = await response.blob();
      const type = blob.type || mimeType;
      if (isTextType(type)) {
        prepared.push({ name, mimeType: type, text: (await blobAsText(blob)).slice(0, MAX_TEXT_ATTACHMENT_CHARS) });
      } else if (blob.size > budget) {
        prepared.push({ name, mimeType: type, note: 'too large to send' });
      } else {
        budget -= blob.size;
        prepared.push({ name, mimeType: type, data: await blobAsBase64(blob) });
      }
    } catch (_) {
      prepared.push({ name, mimeType, note: 'content unavailable' });
    }
  }
  return prepared;
}

function parseStream(body) {
  let text = '';
  let streamError = '';
  for (const line of String(body || '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let event;
    try { event = JSON.parse(trimmed); } catch (_) { continue; }
    if (typeof event.delta === 'string') text += event.delta;
    else if (event.error) streamError = String(event.error);
  }
  return { text: text.trim(), streamError };
}

export async function generateMoeAIReply({ text, files = [], lectureFiles = [], history = [], subject, lecture } = {}) {
  const attachments = await prepareAttachments([...lectureFiles, ...files]);
  const notes = attachments.filter((item) => item.note).map((item) => `[Attached file: ${item.name} (${item.mimeType}) — ${item.note}]`);
  const question = [String(text || '').trim() || 'Please help me with the attached material.', ...notes].join('\n\n');
  const materials = Array.isArray(lecture?.files) ? lecture.files.map((file) => file?.name).filter(Boolean) : [];

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
  let response;
  let body = '';
  try {
    response = await fetch(`${API_BASE_URL}/api/moeai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
      credentials: 'include',
      body: JSON.stringify({
        messages: [...cleanHistory(history), { role: 'user', content: question.slice(0, MAX_MESSAGE_CHARS) }],
        learning: { subject: subject?.name || '', lecture: lecture?.title || '', materials },
        attachments: attachments.filter((item) => !item.note).map(({ name, mimeType, text: fileText, data }) => (
          fileText !== undefined ? { name, mimeType, text: fileText } : { name, mimeType, data }
        )),
      }),
      ...(controller ? { signal: controller.signal } : {}),
    });
    body = await response.text();
  } catch (error) {
    const failure = new Error(error?.name === 'AbortError'
      ? 'MoeAI took too long to answer. Please try again.'
      : 'MoeAI could not be reached. Check the connection and try again.');
    failure.name = 'MoeAIUnavailableError';
    throw failure;
  } finally {
    if (timer) clearTimeout(timer);
  }

  const { text: answer, streamError } = parseStream(body);
  if (!response.ok && !answer) {
    let message = response.status === 429
      ? 'MoeAI is busy right now. Please try again in a moment.'
      : 'MoeAI could not reach any model. Please try again.';
    try { message = JSON.parse(body)?.error || message; } catch (_) {}
    const failure = new Error(message);
    failure.name = 'MoeAIUnavailableError';
    throw failure;
  }
  if (!answer) {
    const failure = new Error(streamError || 'MoeAI sent an empty reply. Please try again.');
    failure.name = 'MoeAIUnavailableError';
    throw failure;
  }
  // A stream that broke midway still delivered real text; keep it.
  return { text: answer, provider: 'moeai', model: 'moeai' };
}
