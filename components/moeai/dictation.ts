"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hold-to-talk for the composer, on the browser's own speech recognition.
 *
 * Chrome and Edge have it; Firefox does not, and Safari's is partial. So the
 * hook reports `supported` and the composer simply hides the microphone rather
 * than offering a button that does nothing.
 *
 * Language matters more here than usual: a student dictating Egyptian Arabic
 * into an en-US recogniser gets nonsense. The chip next to the microphone
 * switches it, and the choice is remembered.
 */
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  start(): void; stop(): void; abort(): void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

const LANG_KEY = "moeai-dictation-lang";
export const DICTATION_LANGUAGES = [
  { id: "ar-EG", label: "العربية" },
  { id: "en-US", label: "English" },
];

function constructor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useDictation(onText: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState("ar-EG");
  const recognition = useRef<Recognition | null>(null);
  const committed = useRef("");
  const sink = useRef(onText);
  sink.current = onText;

  useEffect(() => {
    setSupported(Boolean(constructor()));
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved && DICTATION_LANGUAGES.some(l => l.id === saved)) setLanguage(saved);
      else if (!navigator.language.startsWith("ar")) setLanguage("en-US");
    } catch { /* private mode: the default stands */ }
    return () => { try { recognition.current?.abort(); } catch { /* already gone */ } };
  }, []);

  const stop = useCallback(() => {
    try { recognition.current?.stop(); } catch { /* already stopped */ }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Recogniser = constructor();
    if (!Recogniser) return;
    setError("");
    const instance = new Recogniser();
    instance.lang = language;
    instance.continuous = true;
    instance.interimResults = true;
    committed.current = "";
    // Interim results are replaced on every event, final ones accumulate — so
    // the composer always shows one clean sentence, not a stuttering one.
    instance.onresult = event => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) committed.current += result[0].transcript;
        else interim += result[0].transcript;
      }
      sink.current((committed.current + interim).trim());
    };
    instance.onerror = event => {
      setError(event.error === "not-allowed"
        ? "Microphone access was blocked. Allow it in your browser, then try again."
        : event.error === "no-speech" ? "Didn’t catch that. Try again." : "Dictation stopped unexpectedly.");
      setListening(false);
    };
    instance.onend = () => setListening(false);
    recognition.current = instance;
    try { instance.start(); setListening(true); }
    catch { setError("Dictation could not start."); }
  }, [language]);

  const choose = useCallback((next: string) => {
    setLanguage(next);
    try { localStorage.setItem(LANG_KEY, next); } catch { /* fine */ }
    if (recognition.current) stop();
  }, [stop]);

  return { supported, listening, error, language, choose, start, stop, toggle: () => (listening ? stop() : start()) };
}
