/** Read-aloud on phones, with the system voices through expo-speech. */
import * as Speech from 'expo-speech';
import { speechLanguage, speechText } from './speechText';

const LOCALES = { en: 'en-US', ar: 'ar-EG', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', zh: 'zh-CN', hi: 'hi-IN' };

export const speechAvailable = () => true;

export function speak(markdown, { language = 'en', rate = 1, onStart, onDone } = {}) {
  const text = speechText(markdown);
  if (!text) { onDone?.(); return false; }
  Speech.stop();
  const lang = speechLanguage(text, language);
  Speech.speak(text.slice(0, Speech.maxSpeechInputLength || 4000), {
    language: LOCALES[lang] || LOCALES.en,
    rate,
    onStart,
    onDone,
    onStopped: onDone,
    onError: onDone,
  });
  return true;
}

export function stop() {
  Speech.stop();
}
