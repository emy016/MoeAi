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
    status: ['pending', 'failed'].includes(message?.status) ? message.status : 'complete',
    provider: message?.provider ? String(message.provider) : null,
    model: message?.model ? String(message.model) : null,
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

  const sendMessage = useCallback(async (subjectId, lectureId, threadId, {
    text = '', files = [], subject = null, lecture = null,
  }) => {
    const clean = String(text || '').trim();
    if (!clean && !files.length) return;
    const key = lectureChatKey(subjectId, lectureId);
    const now = new Date();
    const userMessage = normalizeMessage({ id: makeId('message'), role: 'user', text: clean, files, createdAt: now.toISOString() });
    const assistantMessage = normalizeMessage({ id: makeId('message'), role: 'assistant', text: '…', status: 'pending', createdAt: new Date(now.getTime() + 1).toISOString() });
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

    try {
      const result = await generateMoeAIReply({
        text: clean,
        files,
        lectureFiles: lecture?.files || [],
        history,
        subject,
        lecture,
      });
      setChats((current) => ({
        ...current,
        [key]: (current[key] || []).map((thread) => thread.id !== threadId ? thread : {
          ...thread,
          updatedAt: new Date().toISOString(),
          messages: thread.messages.map((message) => message.id !== assistantMessage.id ? message : {
            ...message,
            text: result.text,
            status: 'complete',
            provider: result.provider,
            model: result.model,
          }),
        }),
      }));
      return result;
    } catch (error) {
      const failureText = error?.message || 'MoeAI could not reach an AI model. Please try again.';
      setChats((current) => ({
        ...current,
        [key]: (current[key] || []).map((thread) => thread.id !== threadId ? thread : {
          ...thread,
          updatedAt: new Date().toISOString(),
          messages: thread.messages.map((message) => message.id !== assistantMessage.id ? message : {
            ...message,
            text: failureText,
            status: 'failed',
          }),
        }),
      }));
      return null;
    }
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

  return { chats, ready, startChat, sendMessage, renameChat, togglePinChat, removeChat, removeLectureChats, removeSubjectChats };
}
