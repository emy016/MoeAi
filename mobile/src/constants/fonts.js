/**
 * fonts.js
 * ---------------------------------------------------------------------
 * Single source of truth for every font used in the app.
 *
 * RULE FOR ALL FUTURE WORK (human or AI): never hardcode a fontFamily
 * string inside a screen or component. Import `FontFamily` from here
 * instead — same rule as Colors in colors.js.
 *
 * CURRENT FONT: Nunito Sans (loaded from @expo-google-fonts/nunito-sans
 * via expo-font). The family name IS the weight, so pair each token with
 * its matching fontWeight (already done at every usage site):
 *   regular  -> fontWeight '400' / normal
 *   semiBold -> fontWeight '600'
 *   bold     -> fontWeight '700'
 *
 * OLD FONT (pre-Nunito Sans — kept here in case we ever revert): no
 * `fontFamily` was set anywhere in src/. Everything rendered in the
 * platform default: San Francisco on iOS, Roboto on Android, and the
 * system font stack on web. TO REVERT: delete the `fontFamily` lines
 * (keep the fontWeights) and remove the useAppFonts gate in App.js.
 * ---------------------------------------------------------------------
 */
import { useFonts } from 'expo-font';
// Each weight from its own entry point: the package root requires all 18
// Nunito Sans files (every weight, upright and italic), and the bundler ships
// every file that is required, used or not.
import { NunitoSans_400Regular } from '@expo-google-fonts/nunito-sans/400Regular';
import { NunitoSans_600SemiBold } from '@expo-google-fonts/nunito-sans/600SemiBold';
import { NunitoSans_700Bold } from '@expo-google-fonts/nunito-sans/700Bold';
import { NunitoSans_900Black } from '@expo-google-fonts/nunito-sans/900Black';

export const FontFamily = {
  regular: 'NunitoSans_400Regular', // body copy
  semiBold: 'NunitoSans_600SemiBold', // tab labels, emphasized UI
  bold: 'NunitoSans_700Bold', // titles, headers
  black: 'NunitoSans_900Black', // strongest accessibility weight
};

/**
 * Loads every font in FontFamily. Returns [fontsLoaded, fontError] just
 * like expo-font's useFonts — App.js gates first render on this so text
 * never flashes in the fallback font.
 */
export function useAppFonts() {
  return useFonts({
    [FontFamily.regular]: NunitoSans_400Regular,
    [FontFamily.semiBold]: NunitoSans_600SemiBold,
    [FontFamily.bold]: NunitoSans_700Bold,
    [FontFamily.black]: NunitoSans_900Black,
  });
}

export default FontFamily;
