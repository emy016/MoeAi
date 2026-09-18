/**
 * App.js — app entry point.
 * ---------------------------------------------------------------------
 * Wraps the root pager in SafeAreaProvider (required by useSafeAreaInsets
 * in Header.js and CustomTabBar.js). Tab state lives in RootNavigator's
 * horizontal pager — no React Navigation container needed.
 * ---------------------------------------------------------------------
 */
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { useAppFonts } from './src/constants/fonts';
import { AppPreferencesProvider, usePreferences } from './src/context/AppPreferences';

// Keep the splash screen up until Nunito Sans is ready, so text never
// flashes in the fallback font on first launch.
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useAppFonts();

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
