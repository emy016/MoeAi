/** Persistent lecture conversations backed by the MoeAI provider fallback chain. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { generateMoeAIReply } from '../ai/client';
import { AsyncStorage, readStoredValue, storageKey } from '../storage/persistedStorage';

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
    status: ['pending', 'streaming', 'failed', 'stopped'].includes(message?.status) ? message.status : 'complete',
    provider: message?.provider ? String(message.provider) : null,
    model: message?.model ? String(message.model) : null,
    citations: Array.isArray(message?.citations) ? message.citations.slice(0, 8) : [],
    feedback: message?.feedback === 1 || message?.feedback === -1 ? message.feedback : 0,
    editedAt: message?.editedAt || null,
  };
}

/** A reply that was still arriving when the app closed is kept as far as it got. */
function settleMessage(message) {
  if (message.status !== 'pending' && message.status !== 'streaming') return message;
  const text = message.text === '…' ? '' : message.text;
  return text ? { ...message, text, status: 'stopped' } : { ...message, text: 'MoeAI did not finish this reply. Try again.', status: 'failed' };
}

function normalizeThread(thread) {
  return {
    id: String(thread?.id || makeId('chat')),
    title: String(thread?.title || 'New chat'),
    createdAt: thread?.createdAt || new Date().toISOString(),
    updatedAt: thread?.updatedAt || thread?.createdAt || new Date().toISOString(),
    pinned: Boolean(thread?.pinned),
    messages: Array.isArray(thread?.messages) ? thread.messages.map(normalizeMessage).map(settleMessage) : [],
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
  const chatsRef = useRef(chats);

  useEffect(() => { chatsRef.current = chats; }, [chats]);

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
    const timer = setTimeout(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(chats)).catch(() => {}), 0);
    return () => clearTimeout(timer);
  }, [chats, ready]);

  const startChat = useCallback((subjectId, lectureId, title = 'New chat') => {
    const key = lectureChatKey(subjectId, lectureId);
    const now = new Date().toISOString();
    const thread = { id: makeId('chat'), title, createdAt: now, updatedAt: now, pinned: false, messages: [] };
    setChats((current) => ({ ...current, [key]: [thread, ...(current[key] || [])] }));
    return thread.id;
  }, []);

  // One AbortController per reply in flight, so Stop reaches the right one.
  const inFlight = useRef(new Map());

  const patchMessage = useCallback((key, threadId, messageId, patch) => {
    setChats((current) => ({
      ...current,
      [key]: (current[key] || []).map((thread) => thread.id !== threadId ? thread : {
        ...thread,
        updatedAt: new Date().toISOString(),
        messages: thread.messages.map((message) => message.id !== messageId ? message : { ...message, ...(typeof patch === 'function' ? patch(message) : patch) }),
      }),
    }));
  }, []);

  /** Streams the reply to `userMessage` into `assistantMessage`, which must already be in the thread. */
  const streamReply = useCallback(async (key, threadId, assistantId, { text, files, history, subject, lecture }) => {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    if (controller) inFlight.current.set(assistantId, controller);
    // Re-rendering on every token would make long answers stutter on phones.
    let pendingText = null;
    let flushTimer = null;
    const flush = () => {
      flushTimer = null;
      if (pendingText === null) return;
      const next = pendingText;
      pendingText = null;
      patchMessage(key, threadId, assistantId, { text: next, status: 'streaming' });
    };
    try {
      const result = await generateMoeAIReply({
        text, files, lectureFiles: lecture?.files || [], history, subject, lecture,
        signal: controller?.signal,
        onDelta: (_chunk, full) => { pendingText = full; if (!flushTimer) flushTimer = setTimeout(flush, 60); },
      });
      if (flushTimer) clearTimeout(flushTimer);
      patchMessage(key, threadId, assistantId, {
        text: result.text || '',
        status: result.stopped ? (result.text ? 'stopped' : 'failed') : 'complete',
        ...(result.stopped && !result.text ? { text: 'Stopped.' } : {}),
        provider: result.provider,
        model: result.model,
        citations: result.citations || [],
      });
      return result;
    } catch (error) {
      if (flushTimer) clearTimeout(flushTimer);
      patchMessage(key, threadId, assistantId, {
        text: error?.message || 'MoeAI could not reach an AI model. Please try again.',
        status: 'failed',
      });
      return null;
    } finally {
      inFlight.current.delete(assistantId);
    }
  }, [patchMessage]);

  const sendMessage = useCallback(async (subjectId, lectureId, threadId, {
    text = '', files = [], subject = null, lecture = null,
  }) => {
    const clean = String(text || '').trim();
    if (!clean && !files.length) return;
    const key = lectureChatKey(subjectId, lectureId);
    const now = new Date();
    const userMessage = normalizeMessage({ id: makeId('message'), role: 'user', text: clean, files, createdAt: now.toISOString() });
    const assistantMessage = normalizeMessage({ id: makeId('message'), role: 'assistant', text: '', status: 'pending', createdAt: new Date(now.getTime() + 1).toISOString() });
    const existingThreads = chatsRef.current[key] || [];
    const existingThread = existingThreads.find((thread) => thread.id === threadId);
    const history = existingThread?.messages || [];
    setChats((current) => {
      const threads = current[key] || [];
      const existing = threads.find((thread) => thread.id === threadId);
      const base = existing || normalizeThread({ id: threadId, title: 'New chat', messages: [] });
      const firstTitle = clean || files[0]?.name || base.title;
      const updated = {
        ...base,
        title: base.messages.length ? base.title : firstTitle.slice(0, 48),
        updatedAt: assistantMessage.createdAt,
        messages: [...base.messages, userMessage, assistantMessage],
      };
      return { ...current, [key]: [updated, ...threads.filter((thread) => thread.id !== threadId)] };
    });
    return streamReply(key, threadId, assistantMessage.id, { text: clean, files, history, subject, lecture });
  }, [streamReply]);

  /** Stops whatever reply is arriving in this thread; the part already written stays. */
  const stopReply = useCallback((subjectId, lectureId, threadId) => {
    const thread = (chatsRef.current[lectureChatKey(subjectId, lectureId)] || []).find((item) => item.id === threadId);
    thread?.messages.forEach((message) => inFlight.current.get(message.id)?.abort());
  }, []);

  /** Answers the last question again, replacing the last reply. */
  const regenerateReply = useCallback((subjectId, lectureId, threadId, { subject = null, lecture = null } = {}) => {
    const key = lectureChatKey(subjectId, lectureId);
    const thread = (chatsRef.current[key] || []).find((item) => item.id === threadId);
    if (!thread) return null;
    const messages = thread.messages;
    const lastAssistant = messages.length - 1;
    if (lastAssistant < 1 || messages[lastAssistant].role !== 'assistant' || inFlight.current.has(messages[lastAssistant].id)) return null;
    const question = messages[lastAssistant - 1];
    if (question?.role !== 'user') return null;
    const assistantId = messages[lastAssistant].id;
    patchMessage(key, threadId, assistantId, { text: '', status: 'pending' });
    return streamReply(key, threadId, assistantId, {
      text: question.text, files: question.files, history: messages.slice(0, lastAssistant - 1), subject, lecture,
    });
  }, [patchMessage, streamReply]);

  /**
   * Edit a question and ask it again: everything after it in the thread is
   * replaced by the new answer, like editing a message in Claude or Gemini.
   */
  const editAndResend = useCallback((subjectId, lectureId, threadId, messageId, text, { subject = null, lecture = null } = {}) => {
    const clean = String(text || '').trim();
    const key = lectureChatKey(subjectId, lectureId);
    const thread = (chatsRef.current[key] || []).find((item) => item.id === threadId);
    const index = thread ? thread.messages.findIndex((message) => message.id === messageId && message.role === 'user') : -1;
    if (!clean || index < 0) return null;
    thread.messages.slice(index).forEach((message) => inFlight.current.get(message.id)?.abort());
    const original = thread.messages[index];
    const now = new Date();
    const userMessage = normalizeMessage({ ...original, id: makeId('message'), text: clean, createdAt: now.toISOString(), editedAt: now.toISOString() });
    const assistantMessage = normalizeMessage({ id: makeId('message'), role: 'assistant', text: '', status: 'pending', createdAt: new Date(now.getTime() + 1).toISOString() });
    const history = thread.messages.slice(0, index);
    setChats((current) => ({
      ...current,
      [key]: (current[key] || []).map((item) => item.id !== threadId ? item : {
        ...item, updatedAt: assistantMessage.createdAt, messages: [...history, userMessage, assistantMessage],
      }),
    }));
    return streamReply(key, threadId, assistantMessage.id, { text: clean, files: original.files, history, subject, lecture });
  }, [streamReply]);

  /** Thumbs up (1), down (-1) or cleared (0) on one answer; kept with the chat. */
  const setFeedback = useCallback((subjectId, lectureId, threadId, messageId, rating) => {
    patchMessage(lectureChatKey(subjectId, lectureId), threadId, messageId, { feedback: rating });
  }, [patchMessage]);

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

  const removeChat = useCallback((subjectId, lectureId, threadId) => {
    const key = lectureChatKey(subjectId, lectureId);
    setChats((current) => {
      const currentThreads = current[key] || [];
      const nextThreads = currentThreads.filter((thread) => thread.id !== threadId);
      if (nextThreads.length === currentThreads.length) return current;
      if (nextThreads.length) return { ...current, [key]: nextThreads };
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const removeSubjectChats = useCallback((subjectId) => {
    setChats((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${subjectId}:`))));
  }, []);

  return { chats, ready, startChat, sendMessage, stopReply, regenerateReply, editAndResend, setFeedback, renameChat, togglePinChat, removeChat, removeLectureChats, removeSubjectChats };
}
