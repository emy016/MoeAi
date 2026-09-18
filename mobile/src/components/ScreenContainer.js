/**
 * ScreenContainer.js
 * ---------------------------------------------------------------------
 * Standard wrapper every screen should use at its root: sets the app
 * background color (Colors.background) and applies the standard body
 * padding + safe-area handling. Use this instead of a raw <View> so
 * background and safe-area handling stay consistent everywhere.
 *
 * NOTE: the shared <Header/> is NOT rendered here — RootNavigator renders
 * it once above the pager viewport so the spring overshoot at the edge
 * pages never exposes a header gap (see RootNavigator.js). Likewise,
 * page-change motion lives in RootNavigator (horizontal pager strip),
 * NOT here — every screen stays mounted side-by-side, so there is
 * deliberately no per-screen entrance animation.
 *
 * Usage:
 *   <ScreenContainer>
 *     ...screen content...
 *   </ScreenContainer>
 *
 * Pass `scroll={false}` for screens that manage their own scrolling
 * (e.g. a FlatList-based feed) to avoid nesting scroll views.
 * ---------------------------------------------------------------------
 */
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';

export default function ScreenContainer({ scroll = true, children }) {
  const insets = useSafeAreaInsets();
  const { colors } = usePreferences();
  const Wrapper = scroll ? ScrollView : View;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Wrapper
          style={styles.body}
          contentContainerStyle={
            scroll
              ? [
                  styles.scrollContent,
                  // Sides: keep content clear of landscape side-notches.
                  // Top/bottom need nothing extra: the RootNavigator header
                  // pads the notch above, and the tab bar occupies layout
                  // below.
                  { paddingLeft: Spacing.md + insets.left, paddingRight: Spacing.md + insets.right },
                ]
              : { paddingLeft: insets.left, paddingRight: insets.right }
          }
        >
        {children}
      </Wrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xl },
});
