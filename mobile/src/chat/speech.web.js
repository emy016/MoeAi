/**
 * Read-aloud on the web, with the browser's own speech engine.
 *
 * Long utterances get cut off in Chrome after ~15 seconds, so the text is
 * spoken sentence by sentence from a queue; stop() clears it at once.
 */
import { speechLanguage, speechText } from './speechText';

const LOCALES = { en: ['en-US', 'en-GB', 'en'], ar: ['ar-EG', 'ar-SA', 'ar'], es: ['es-ES', 'es'], fr: ['fr-FR', 'fr'], de: ['de-DE', 'de'], zh: ['zh-CN', 'zh'], hi: ['hi-IN', 'hi'] };
let generation = 0;

export const speechAvailable = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

function pickVoice(lang) {
  const voices = window.speechSynthesis.getVoices();
  for (const code of LOCALES[lang] || LOCALES.en) {
    const exact = voices.filter((v) => v.lang?.toLowerCase().startsWith(code.toLowerCase()));
    // Prefer the natural-sounding voices browsers ship ("Google", "Natural", "Enhanced").
    const good = exact.find((v) => /natural|neural|google|enhanced|premium/i.test(v.name)) || exact[0];
    if (good) return good;
  }
  return null;
}

function sentences(text) {
  const parts = text.match(/[^.!?؟…]+[.!?؟…]*\s*/g) || [text];
  const out = [];
  let buf = '';
  for (const part of parts) {
    if ((buf + part).length > 220 && buf) { out.push(buf.trim()); buf = ''; }
    buf += part;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

export function speak(markdown, { language = 'en', rate = 1, onStart, onDone } = {}) {
  if (!speechAvailable()) { onDone?.(); return false; }
  const text = speechText(markdown);
  if (!text) { onDone?.(); return false; }
  stop();
  const mine = ++generation;
  const lang = speechLanguage(text, language);
  const voice = pickVoice(lang);
  const queue = sentences(text);
  let started = false;
  const next = () => {
    if (mine !== generation) return;
    const chunk = queue.shift();
    if (!chunk) { onDone?.(); return; }
    const u = new SpeechSynthesisUtterance(chunk);
    if (voice) u.voice = voice;
    u.lang = voice?.lang || (LOCALES[lang] || LOCALES.en)[0];
    u.rate = rate;
    u.onstart = () => { if (!started) { started = true; onStart?.(); } };
    u.onend = next;
    u.onerror = next;
    window.speechSynthesis.speak(u);
  };
  // Voices load asynchronously the first time.
  if (!window.speechSynthesis.getVoices().length) window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; };
  next();
  return true;
}

export function stop() {
  generation++;
  if (speechAvailable()) window.speechSynthesis.cancel();
}
