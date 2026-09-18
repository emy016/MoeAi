/** Hold-to-dictate adapter: native recognition on phones, Web Speech on desktop browsers. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

const LOCALES = { en: 'en-US', ar: 'ar-SA', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', zh: 'zh-CN', hi: 'hi-IN' };
const joinTranscript = (base, transcript) => [String(base || '').trimEnd(), String(transcript || '').trim()].filter(Boolean).join(' ');

function loadNativeModule() {
  // Unlike the package's top-level export, this lookup never throws when the
  // custom module is absent from Expo Go. A development build still resolves
  // the exact same native ExpoSpeechRecognition module registered by its plugin.
  return requireOptionalNativeModule('ExpoSpeechRecognition');
}

export default function useHoldToDictate({ value, onChange, language, onUnavailable }) {
  const [listening, setListening] = useState(false);
  const held = useRef(false);
  const base = useRef('');
  const webRecognition = useRef(null);
  const nativeModule = useRef(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const unavailableRef = useRef(onUnavailable);
  useEffect(() => { valueRef.current = value; }, [value]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { unavailableRef.current = onUnavailable; }, [onUnavailable]);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const module = loadNativeModule();
    nativeModule.current = module;
    if (!module) return undefined;
    const result = module.addListener('result', (event) => {
      const transcript = event.results?.map((entry) => entry.transcript).filter(Boolean).join(' ') || '';
      onChangeRef.current(joinTranscript(base.current, transcript));
    });
    const start = module.addListener('start', () => setListening(true));
    const end = module.addListener('end', () => setListening(false));
    const error = module.addListener('error', (event) => {
      setListening(false);
      if (event?.error !== 'aborted' && event?.error !== 'no-speech') unavailableRef.current?.();
    });
    return () => { result.remove(); start.remove(); end.remove(); error.remove(); module.abort?.(); };
  }, []);

  const beginWeb = useCallback(() => {
    const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
    if (!Recognition) { unavailableRef.current?.(); return; }
    const recognition = new Recognition();
    recognition.lang = LOCALES[language] || LOCALES.en;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = (event) => {
      setListening(false);
      if (event?.error !== 'aborted' && event?.error !== 'no-speech') unavailableRef.current?.();
    };
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) transcript += `${event.results[index][0]?.transcript || ''} `;
      onChangeRef.current(joinTranscript(base.current, transcript));
    };
    webRecognition.current = recognition;
    recognition.start();
  }, [language]);

  const start = useCallback(async () => {
    held.current = true;
    base.current = valueRef.current;
    if (Platform.OS === 'web') { beginWeb(); return; }
    const module = nativeModule.current || loadNativeModule();
    nativeModule.current = module;
    if (!module) { held.current = false; unavailableRef.current?.(); return; }
    try {
      const permission = await module.requestPermissionsAsync();
      if (!permission.granted || !held.current) {
        if (!permission.granted) unavailableRef.current?.();
        return;
      }
      module.start({ lang: LOCALES[language] || LOCALES.en, interimResults: true, continuous: true, maxAlternatives: 1 });
    } catch (_) {
      setListening(false);
      unavailableRef.current?.();
    }
  }, [beginWeb, language]);

  const stop = useCallback(() => {
    held.current = false;
    if (Platform.OS === 'web') {
      try { webRecognition.current?.stop(); } catch (_) {}
      webRecognition.current = null;
      return;
    }
    try { nativeModule.current?.stop(); } catch (_) { setListening(false); }
  }, []);

  return { listening, start, stop };
}
