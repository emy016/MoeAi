/**
 * App.js — app entry point.
 * ---------------------------------------------------------------------
 * Wraps the root pager in SafeAreaProvider (required by useSafeAreaInsets
 * in Header.js and CustomTabBar.js). Tab state lives in RootNavigator's
 * horizontal pager — no React Navigation container needed.
 * ---------------------------------------------------------------------
 */
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { useAppFonts } from './src/constants/fonts';
import { AppPreferencesProvider, usePreferences } from './src/context/AppPreferences';

// Keep the splash screen up until Nunito Sans is ready, so text never
// flashes in the fallback font on first launch.
SplashScreen.preventAutoHideAsync();

function useMobileWebShell() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;

    const viewport = document.querySelector('meta[name="viewport"]');
    const previousViewport = viewport?.getAttribute('content');
    viewport?.setAttribute(
      'content',
      'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content',
    );

    const elements = [document.documentElement, document.body, document.getElementById('root')].filter(Boolean);
    const previous = elements.map((element) => ({
      element,
      cssText: element.style.cssText,
    }));
    elements.forEach((element) => {
      Object.assign(element.style, {
        width: '100%',
        maxWidth: '100%',
        height: '100%',
        maxHeight: '100%',
        margin: '0',
        overflow: 'hidden',
        overscrollBehavior: 'none',
      });
    });
    document.documentElement.style.webkitTextSizeAdjust = '100%';
    document.body.style.touchAction = 'manipulation';

    // Browsers draw their own focus rectangle around a focused text field,
    // which native never does; the composer and editors already show focus
    // with the caret and their own styling. Text fields only — buttons keep
    // the keyboard focus ring.
    const fieldFocus = document.createElement('style');
    fieldFocus.textContent = 'input:focus, textarea:focus { outline: none; }';
    document.head.appendChild(fieldFocus);

    // Mobile browsers expose the usable area through visualViewport while
    // the keyboard is open. Keeping this CSS variable current prevents the
    // composer from being pushed below the visible screen.
    const syncViewport = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty('--moeai-viewport-height', `${Math.round(height)}px`);
      const root = document.getElementById('root');
      if (root) root.style.height = 'var(--moeai-viewport-height)';
    };
    syncViewport();
    window.visualViewport?.addEventListener('resize', syncViewport);
    window.visualViewport?.addEventListener('scroll', syncViewport);
    window.addEventListener('resize', syncViewport);

    return () => {
      if (previousViewport == null) viewport?.removeAttribute('content');
      else viewport?.setAttribute('content', previousViewport);
      previous.forEach(({ element, cssText }) => { element.style.cssText = cssText; });
      fieldFocus.remove();
      window.visualViewport?.removeEventListener('resize', syncViewport);
      window.visualViewport?.removeEventListener('scroll', syncViewport);
      window.removeEventListener('resize', syncViewport);
    };
  }, []);
}

export default function App() {
  const [fontsLoaded, fontError] = useAppFonts();
  useMobileWebShell();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Render nothing until the fonts arrive (or fail — then the platform
  // fallback from fonts.js's OLD FONT note applies instead of hanging).
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppPreferencesProvider>
        <ThemedApp />
      </AppPreferencesProvider>
    </SafeAreaProvider>
  );
}

function ThemedApp() {
  const { effectiveTheme } = usePreferences();
  return <><StatusBar style={effectiveTheme === 'light' ? 'dark' : 'light'} /><RootNavigator /></>;
}
