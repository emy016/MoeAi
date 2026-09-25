import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';
import { getLocales } from 'expo-localization';
import { makeColors } from '../constants/colors';
import { FontFamily } from '../constants/fonts';
import { translations, SUPPORTED_LANGUAGES } from '../localization/translations';
import { AsyncStorage, readStoredValue, storageKey } from '../storage/persistedStorage';

const STORAGE_KEY = storageKey('preferences-v2');
const FONT_SCALES = { small: 0.88, default: 1, large: 1.15, extraLarge: 1.3 };
const defaults = { theme: 'dark', accent: 'purple', surface: 'default', tint: false, language: null, fontSize: 'default', textWeight: 'regular', motion: true, studyReminders: true, quizReminders: true, sessionReminders: true };
const PreferencesContext = createContext(null);

export function AppPreferencesProvider({ children }) {
  const systemScheme = useColorScheme();
  const [prefs, setPrefs] = useState(defaults);
  const prefsRef = useRef(defaults);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    readStoredValue(STORAGE_KEY).then((saved) => {
      let stored = {};
      try { stored = saved ? JSON.parse(saved) : {}; } catch (_) {}
      const deviceCode = (getLocales()[0]?.languageCode || 'en').toLowerCase();
      const language = SUPPORTED_LANGUAGES.includes(stored.language) ? stored.language : (SUPPORTED_LANGUAGES.includes(deviceCode) ? deviceCode : 'en');
      const next = { ...defaults, ...stored, language };
      prefsRef.current = next;
      setPrefs(next);
      setReady(true);
    }).catch(() => {
      const next = { ...defaults, language: 'en' };
      prefsRef.current = next;
      setPrefs(next);
      setReady(true);
    });
  }, []);

  const setPreference = useCallback((key, value) => {
    const current = prefsRef.current;
    if (Object.is(current[key], value)) return;
    const next = { ...current, [key]: value };
    prefsRef.current = next;
    setPrefs(next);
    setTimeout(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {}), 0);
  }, []);

  const effectiveTheme = prefs.theme === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : prefs.theme;
  const language = prefs.language || 'en';
  const colors = useMemo(() => makeColors(effectiveTheme, prefs.accent, prefs.surface, prefs.tint), [effectiveTheme, prefs.accent, prefs.surface, prefs.tint]);
  const t = useCallback((key, values) => {
    const template = translations[language]?.[key] ?? translations.en[key] ?? key;
    if (!values || typeof template !== 'string') return template;
    return Object.entries(values).reduce((result, [name, value]) => result.replaceAll(`{${name}}`, String(value)), template);
  }, [language]);
  const type = useCallback((size, role = 'regular', lineHeight) => {
    const isBold = prefs.textWeight === 'bold' || role === 'bold';
    const userBold = prefs.textWeight === 'bold';
    return { fontSize: Math.round(size * FONT_SCALES[prefs.fontSize]), lineHeight: lineHeight ? Math.round(lineHeight * FONT_SCALES[prefs.fontSize]) : undefined, fontFamily: userBold ? FontFamily.black : isBold ? FontFamily.bold : role === 'semiBold' ? FontFamily.semiBold : FontFamily.regular, fontWeight: userBold ? '900' : isBold ? '700' : role === 'semiBold' ? '600' : '400' };
  }, [prefs.fontSize, prefs.textWeight]);
  const value = useMemo(() => ({ ...prefs, ready, colors, effectiveTheme, isRTL: language === 'ar', fontScale: FONT_SCALES[prefs.fontSize], t, type, setPreference }), [prefs, ready, colors, effectiveTheme, language, t, type, setPreference]);

  if (!ready) return null;
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences must be used inside AppPreferencesProvider');
  return value;
}
