/**
 * TabBarButton.js
 * ---------------------------------------------------------------------
 * One tab's icon + label. Owns a single Animated.Value ("progress")
 * that eases 0 -> 1 on focus and drives everything in sync:
 *   1. RADIAL FILL REVEAL — the purple SOLID heroicon is clipped by a
 *      circular mask centered on the icon whose diameter grows from 0
 *      to fully-covering. Visually: color spreads outward from within
 *      the icon, rather than a flat opacity crossfade.
 *   2. OUTLINE FADE — the gray OUTLINE heroicon fades out EARLY (fully
 *      gone by ~75% of the transition) so no gray ghost/outline lingers
 *      on top of, or around the edges of, the solid purple icon once it
 *      is selected. At progress = 1 outline opacity is hard-0.
 *   3. Label text crossfade, gray -> purple.
 *
 * This is intentionally its OWN component (rather than inlined in
 * CustomTabBar's .map()) because each tab needs an independent
 * Animated.Value — every render of this component from the parent's
 * list is a distinct component instance, so this is safe with the
 * Rules of Hooks.
 *
 * No new dependencies: the circular reveal is a plain Animated.View
 * with overflow:'hidden' + pill borderRadius, so it works with the
 * prebuilt heroicon components (no SVG clip paths needed).
 * ---------------------------------------------------------------------
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { IconSize } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';

// Mask diameter when fully open — must cover the icon's diagonal
// (26 * sqrt(2) ~= 36.8) with margin, so the corners never poke out.
const FILL_MAX = IconSize.tab * 1.8;
const CENTER = IconSize.tab / 2;

function TabBarButton({ OutlineIcon, SolidIcon, label, focused }) {
  const { colors, type, motion, fontScale } = usePreferences();
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: focused ? 1 : 0,
      duration: motion ? 180 : 0,
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  }, [focused, progress, motion]);

  // Gray outline: visible when idle, fades out in the FIRST half and is
  // guaranteed 0 well before the end — so it can never linger as a
  // ghost outline over the solid blue icon (fix #3).
  const outlineOpacity = progress.interpolate({
    inputRange: [0, 0.45, 0.7, 1],
    outputRange: [1, 0.55, 0, 0],
  });

  // Blue fill: circular mask grows from the icon's center outward
  // (fix #2 — "color expands from within"). The mask's top-left starts
  // at the icon center and translates back by half its size, so the
  // circle stays centered as it grows.
  // Keep the mask fully transparent until it has non-zero size, so no
  // stray pixel/dot shows at progress = 0.
  const maskOpacity = progress.interpolate({
    inputRange: [0, 0.06, 1],
    outputRange: [0, 1, 1],
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.iconStack}>
        {/* Gray outline icon — fades OUT early, never lingers. Fixed
            size, no scale, so it can't leave an offset halo. */}
        <Animated.View style={[styles.iconLayer, { opacity: outlineOpacity }]}>
          <OutlineIcon size={IconSize.tab} color={colors.tabInactive} />
        </Animated.View>
        {/* Blue solid icon — revealed by the expanding circular mask.
            The inner icon stays fixed-size and centered; only the mask
            grows, so the color reads as spreading from within. */}
        <Animated.View
          style={[
            styles.fillMask,
            {
              opacity: maskOpacity,
              transform: [{ scale: progress }],
            },
          ]}
        >
          <View style={styles.fillInner}>
            <SolidIcon size={IconSize.tab} color={colors.tabActive} />
          </View>
        </Animated.View>
      </View>
      <View style={[styles.labelStack, { height: Math.round(15 * fontScale) }]}>
        <Animated.Text includeFontPadding={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={[styles.label, { color: colors.tabInactive, opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }, type(11,'semiBold',15)]}>{label}</Animated.Text>
        <Animated.Text accessible={false} pointerEvents="none" includeFontPadding={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={[styles.label, styles.activeLabel, { color: colors.tabActive, opacity: progress }, type(11,'semiBold',15)]}>{label}</Animated.Text>
      </View>
    </View>
  );
}

export default React.memo(TabBarButton);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  iconStack: {
    width: IconSize.tab,
    height: IconSize.tab,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLayer: { alignItems: 'center', justifyContent: 'center' },
  fillMask: {
    position: 'absolute',
    left: CENTER - FILL_MAX / 2,
    top: CENTER - FILL_MAX / 2,
    width: FILL_MAX,
    height: FILL_MAX,
    borderRadius: 999, // stays circular at every size
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fillInner: {
    width: IconSize.tab,
    height: IconSize.tab,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Fixed line box (equal height for every label) + no Android font
  // padding, so all four labels sit on exactly the same level: the words
  // have different descenders (Home/Practice "p", Community "y", none in
  // Simulators), which otherwise makes each label's visible ink bottom
  // land at a slightly different height.
  labelStack: { alignSelf: 'stretch', marginTop: 4, justifyContent: 'center' },
  label: { textAlign: 'center', includeFontPadding: false },
  activeLabel: { position: 'absolute', left: 0, right: 0 },
});
