/**
 * Persistent local lecture conversations.
 *
 * Sending is optimistic: the student's message and an empty assistant message
 * go in at once, then the reply streams into that assistant message as it
 * arrives from MoeAI. If the tutor cannot be reached the same message becomes
 * the notice this app showed before there was a tutor, so a dropped connection
 * looks like the old behaviour rather than a stuck spinner.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AsyncStorage, readStoredValue, storageKey } from '../storage/persistedStorage';
import { streamReply } from '../ai/moeai';

const STORAGE_KEY = storageKey('lecture-chats-v1');
const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export const lectureChatKey = (subjectId, lectureId) => `${subjectId}:${lectureId}`;

function normalizeMessage(message) {
  return {
    id: String(message?.id || makeId('message')),
    role: message?.role === 'assistant' ? 'assistant' : 'user',
    text: String(message?.text || ''),
    files: Array.isArray(message?.files) ? message.files : [],
    createdAt: message?.createdAt || new Date().toISOString(),
    // Streaming state. Never persisted as true: see the save effect below.
    pending: Boolean(message?.pending),
    failed: Boolean(message?.failed),
    /** Passages the answer was built on, when it was grounded in course material. */
    citations: Array.isArray(message?.citations) ? message.citations.slice(0, 6) : [],
  };
}

function normalizeThread(thread) {
  return {
    id: String(thread?.id || makeId('chat')),
    title: String(thread?.title || 'New chat'),
    createdAt: thread?.createdAt || new Date().toISOString(),
    updatedAt: thread?.updatedAt || thread?.createdAt || new Date().toISOString(),
    pinned: Boolean(thread?.pinned),
    messages: Array.isArray(thread?.messages) ? thread.messages.map(normalizeMessage) : [],
  };
}

function hydrate(raw) {
  try {
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).map(([key, threads]) => [key, Array.isArray(threads) ? threads.map(normalizeThread) : []]));
  } catch (_) {
    return {};
  }
}

function mergeChats(stored, current) {
  const merged = { ...stored };
  Object.entries(current).forEach(([key, threads]) => {
    merged[key] = [...threads, ...(stored[key] || [])].filter((thread, index, all) => all.findIndex((candidate) => candidate.id === thread.id) === index);
  });
  return merged;
}

export function useLectureChatStore() {
  const [chats, setChats] = useState({});
  const [ready, setReady] = useState(false);
  const streamRef = useRef({});

  useEffect(() => {
    let alive = true;
    readStoredValue(STORAGE_KEY).then((raw) => {
      if (!alive) return;
      setChats((current) => mergeChats(hydrate(raw), current));
      setReady(true);
    }).catch(() => alive && setReady(true));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(chats, (key, value) =>
      key === 'pending' ? false : value)).catch(() => {}), 0);
    return () => clearTimeout(timer);
  }, [chats, ready]);

  const startChat = useCallback((subjectId, lectureId, title = 'New chat') => {
    const key = lectureChatKey(subjectId, lectureId);
    const now = new Date().toISOString();
    const thread = { id: makeId('chat'), title, createdAt: now, updatedAt: now, pinned: false, messages: [] };
    setChats((current) => ({ ...current, [key]: [thread, ...(current[key] || [])] }));
    return thread.id;
  }, []);

  /** Rewrites one message in one thread, leaving every other object identical. */
  const patchMessage = useCallback((key, threadId, messageId, patch) => {
    setChats((current) => ({
      ...current,
      [key]: (current[key] || []).map((thread) => thread.id !== threadId ? thread : {
        ...thread,
        updatedAt: new Date().toISOString(),
        messages: thread.messages.map((message) => message.id !== messageId ? message : { ...message, ...patch }),
      }),
    }));
  }, []);

  const sendMessage = useCallback((subjectId, lectureId, threadId, { text = '', files = [], unavailableText, lectureTitle, subjectTitle }) => {
    const clean = String(text || '').trim();
    if (!clean && !files.length) return;
    const key = lectureChatKey(subjectId, lectureId);
    const now = new Date();
    const userMessage = normalizeMessage({ id: makeId('message'), role: 'user', text: clean, files, createdAt: now.toISOString() });
    const assistantMessage = normalizeMessage({
      id: makeId('message'), role: 'assistant', text: '', pending: true,
      createdAt: new Date(now.getTime() + 1).toISOString(),
    });

    let history = [];
    setChats((current) => {
      const threads = current[key] || [];
      const existing = threads.find((thread) => thread.id === threadId);
      const base = existing || normalizeThread({ id: threadId, title: 'New chat', messages: [] });
      const firstTitle = clean || files[0]?.name || base.title;
      history = [...base.messages, userMessage];
      const updated = {
        ...base,
        title: base.messages.length ? base.title : firstTitle.slice(0, 48),
        updatedAt: assistantMessage.createdAt,
        messages: [...history, assistantMessage],
      };
      return { ...current, [key]: [updated, ...threads.filter((thread) => thread.id !== threadId)] };
    });

    // Attachments are named, not uploaded — the tutor is told what was attached
    // rather than handed a file it has no way to read yet.
    const attached = files.map((file) => file?.name).filter(Boolean);
    const question = attached.length ? `${clean}\n\n[Attached: ${attached.join(', ')}]` : clean;
    const messages = [...history.slice(0, -1), { role: 'user', text: question }];

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    streamRef.current[assistantMessage.id] = controller;

    streamReply(
      {
        messages,
        context: { lecture: lectureTitle || null, course: subjectTitle || null, source: 'moeai-app' },
        signal: controller?.signal,
      },
      (_delta, full) => patchMessage(key, threadId, assistantMessage.id, { text: full }),
      (citations) => patchMessage(key, threadId, assistantMessage.id, { citations }),
    )
      .then((full) => patchMessage(key, threadId, assistantMessage.id, { text: full, pending: false }))
      .catch((error) => {
        // Stopping on purpose is not a failure: keep what arrived.
        const cancelled = error?.message === 'Cancelled.';
        patchMessage(key, threadId, assistantMessage.id, cancelled
          ? { pending: false }
          : {
              // A refusal MoeAI actually sent (a spend cap, an outage) is worth
              // showing word for word; a transport failure reads better in the
              // app's own voice.
              text: (error?.fromServer && error.message) || unavailableText || 'MoeAI could not be reached.',
              pending: false,
              failed: true,
            });
      })
      .then(() => { delete streamRef.current[assistantMessage.id]; });
  }, [patchMessage]);

  /** Stops one reply mid-sentence, keeping whatever text already arrived. */
  const stopReply = useCallback((messageId) => {
    const controller = streamRef.current[messageId];
    if (!controller) return;
    try { controller.abort(); } catch (_) {}
    delete streamRef.current[messageId];
  }, []);

  const removeLectureChats = useCallback((subjectId, lectureId) => {
    const key = lectureChatKey(subjectId, lectureId);
    setChats((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const renameChat = useCallback((subjectId, lectureId, threadId, title) => {
    const clean = String(title || '').trim();
    if (!clean) return;
    const key = lectureChatKey(subjectId, lectureId);
    setChats((current) => ({
      ...current,
      [key]: (current[key] || []).map((thread) => thread.id === threadId ? { ...thread, title: clean.slice(0, 100) } : thread),
    }));
  }, []);

  const togglePinChat = useCallback((subjectId, lectureId, threadId) => {
    const key = lectureChatKey(subjectId, lectureId);
    setChats((current) => ({
      ...current,
      [key]: (current[key] || []).map((thread) => thread.id === threadId ? { ...thread, pinned: !thread.pinned } : thread),
    }));
  }, []);

  const removeSubjectChats = useCallback((subjectId) => {
    setChats((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${subjectId}:`))));
  }, []);

  return { chats, ready, startChat, sendMessage, stopReply, renameChat, togglePinChat, removeLectureChats, removeSubjectChats };
}
