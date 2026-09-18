/**
 * CustomTabBar.js
 * ---------------------------------------------------------------------
 * Custom bottom tab bar for the app's 4 primary tabs: Home, Practice,
 * Simulators, Community. A controlled component: RootNavigator owns the
 * active index and passes { index, onSelect } — this bar renders the
 * pill, the tab buttons, and the Post FAB, nothing more.
 *
 * BEHAVIOR SPEC:
 *  - Floating pill — the bar is a rounded rect (TabBar.PILL_RADIUS)
 *    floating above the screen bottom with transparent margins on all
 *    sides (TabBar.PILL_MARGIN_*), background = Colors.navbar, with a
 *    soft float shadow. It is NOT a full-width flat strip.
 *  - Each tab icon reveals its purple "selected" fill via a circular mask
 *    that grows from the icon's center outward (see TabBarButton.js),
 *    with the label text following the same color.
 *  - When the "Community" tab becomes active: the 4 tab icons animate
 *    outward, away from the horizontal center — the two MIDDLE tabs
 *    (Practice, Simulators) move further than the two OUTER tabs
 *    (Home, Community), since they start closest to where the FAB
 *    rises up and need more clearance — and a circular purple "Post" FAB
 *    (white plus icon) pops into the middle of the pill, sitting
 *    vertically centered INSIDE the dock between the spread tabs (it
 *    never pokes outside the pill). The pill stays tall/wide enough
 *    that all 4 icons + labels fit inside with side padding clearing
 *    the rounded corners.
 *  - Leaving the Community tab reverses everything: the icons spring
 *    back and the FAB gracefully pops back out (shrinking + fading),
 *    with no ghost lingering afterwards.
 *
 * Motion is driven by TWO Animated.Values fired together: `fabProgress`
 * (spring) for the icon spread, and `fabPop` (timing) for the FAB's own
 * pop in/out. They start in sync so the whole transition still feels
 * like a single gesture — but the FAB deliberately does NOT ride the
 * spring, because the spring oscillates around 0 for ~a second after
 * exit and any FAB opacity tied to it re-flashes the button on each
 * positive bounce. Timing is monotonic, so the pop-out can never
 * come back on its own.
 *
 * TO ADD A 5TH TAB: add its Outline/Solid icon pair + label to the
 * ICONS map below (order = left-to-right dock order, exported as
 * TAB_ORDER), add its screen to the TABS list in RootNavigator.js in the
 * SAME order, and add its component to the COMPONENTS map there. NOTE
 * the spread math below (`SHIFT` lookup) is hand-tuned for exactly 4
 * tabs with the FAB centered between the 2 middle ones — revisit it if
 * the tab count changes.
 * ---------------------------------------------------------------------
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeIcon, BookOpenIcon, CpuChipIcon, UserGroupIcon, PlusIcon } from 'react-native-heroicons/outline';
import {
  HomeIcon as HomeIconSolid,
  BookOpenIcon as BookOpenIconSolid,
  CpuChipIcon as CpuChipIconSolid,
  UserGroupIcon as UserGroupIconSolid,
} from 'react-native-heroicons/solid';
import { TabBar, IconSize } from '../constants/layout';
import TabBarButton from './TabBarButton';
import ElasticPressable from '../components/ElasticPressable';
import { usePreferences } from '../context/AppPreferences';
import { TELEGRAM_URL } from '../ai/config';

// Route name -> { outline icon, solid icon, label }. This is the ONLY
// place icon/label config lives — keep it in sync with RootNavigator.js.
// Per-index horizontal shift (px) applied when the FAB is open, for
// exactly 4 tabs. Index 0/3 are the OUTER tabs (Home, Community) and
// only need a small nudge; index 1/2 are the INNER tabs (Practice,
// Simulators), which start closest to the FAB and need to travel
// further to clear it. Negative = left, positive = right.
const SHIFT = [-TabBar.SHIFT_OUTER, -TabBar.SHIFT_INNER, TabBar.SHIFT_INNER, TabBar.SHIFT_OUTER];
const ICONS = {
  Home: { Outline: HomeIcon, Solid: HomeIconSolid, label: 'Home' },
  Practice: { Outline: BookOpenIcon, Solid: BookOpenIconSolid, label: 'Practice' },
  Simulators: { Outline: CpuChipIcon, Solid: CpuChipIconSolid, label: 'Simulators' },
  Community: { Outline: UserGroupIcon, Solid: UserGroupIconSolid, label: 'Community' },
};

// Left-to-right dock order, shared with RootNavigator (single source of
// truth for tab order — insertion order of ICONS above).
export const TAB_ORDER = Object.keys(ICONS);

function CustomTabBar({ index: tabIndex, onSelect }) {
  const insets = useSafeAreaInsets();
  const { colors, t, motion, fontScale, fontSize } = usePreferences();
  const communityActive = TAB_ORDER[tabIndex] === 'Community';
  const largeCommunity = communityActive && (fontSize === 'large' || fontSize === 'extraLarge');
  const expandedMargin = fontSize === 'extraLarge' ? 0 : 4;
  const dockExpansion = useRef(new Animated.Value(largeCommunity ? 1 : 0)).current;

  useEffect(() => {
    dockExpansion.stopAnimation();
    if (!motion) {
      dockExpansion.setValue(largeCommunity ? 1 : 0);
      return;
    }
    Animated.spring(dockExpansion, {
      toValue: largeCommunity ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 90,
      isInteraction: false,
    }).start();
  }, [largeCommunity, dockExpansion, motion]);

  const animatedDockMargin = dockExpansion.interpolate({
    inputRange: [0, 1],
    outputRange: [TabBar.PILL_MARGIN_HORIZONTAL, expandedMargin],
  });

  // 0 = normal (tabs centered) — 1 = Community open (tabs spread
  // outward). A spring gives the "organic" settle called for in the
  // spec, rather than a linear/eased timing curve. Drives ONLY the
  // icon spread below — never FAB visibility (see fabPop).
  const fabProgress = useRef(new Animated.Value(communityActive ? 1 : 0)).current;

  useEffect(() => {
    fabProgress.stopAnimation();
    if (!motion) {
      fabProgress.setValue(communityActive ? 1 : 0);
      return;
    }
    Animated.spring(fabProgress, {
      toValue: communityActive ? 1 : 0,
      useNativeDriver: true, // only translate below -> safe for native driver
      friction: 8,
      tension: 90,
      isInteraction: false,
    }).start();
  }, [communityActive, fabProgress, motion]);

  // The Post button's own pop in/out. Deliberately a SEPARATE value from
  // the icon spring above: the spring oscillates around 0 for ~a second
  // after exit, and any FAB opacity tied to it re-flashes the button on
  // each positive bounce (the ghost orb). This timing curve has a single
  // slight overshoot hump and then settles — it never re-brightens on
  // exit — so the button gets an elastic expand-and-shrink feel with no
  // chance of coming back on its own.
  const fabPop = useRef(new Animated.Value(communityActive ? 1 : 0)).current;

  useEffect(() => {
    fabPop.stopAnimation();
    Animated.timing(fabPop, {
      toValue: communityActive ? 1 : 0,
      duration: motion ? TabBar.FAB_POP_DURATION : 0,
      // Slight elastic pop: overshoots ~13% past full size on the way in
      // (expanding) and tucks slightly under on the way out (shrinking).
      easing: Easing.out(Easing.back(2)),
      useNativeDriver: true, // opacity/scale/translate/rotate below -> safe
      isInteraction: false,
    }).start();
  }, [communityActive, fabPop, motion]);

  // Pill geometry: the FAB is positioned relative to the PILL (not the
  // screen), so safe-area insets stay OUTSIDE the pill in the wrapper.
  // The FAB sits INSIDE the dock, vertically centered in the pill —
  // it never pokes above the pill's top edge.
  const fabBottom = (TabBar.HEIGHT - TabBar.FAB_SIZE) / 2;

  // Plus-icon spin, driven by the FAB's own timing value so it stays in
  // sync with the pop in/out. 0 -> 180deg is a half turn clockwise as
  // the button pops in; leaving Community reverses it, so the plus
  // spins counter-clockwise back as the button pops out. 180 lands the
  // symmetric plus back exactly where it started.
  const plusSpin = fabPop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    // Outer wrapper: fills the dock area with the app background so no
    // default (white) surface can show through around the floating pill.
    // Holds the safe-area + floating margins.
    <View
      style={[
        styles.outer,
        {
          // Bottom: floating gap + gesture-bar / home-indicator height,
          // re-measured on rotation/fold via context — fully dynamic.
          paddingBottom: insets.bottom + TabBar.PILL_MARGIN_BOTTOM,
          // Sides: floating gap + landscape side-notch clearance so the
          // pill + outer tabs are never clipped.
          paddingLeft: insets.left,
          paddingRight: insets.right,
          backgroundColor: colors.background,
        },
      ]}
    >
      {/* Inner floating pill — the actual navbar surface. All 4 icons +
          labels live inside here, plus the centered "Post" FAB when
          Community is active; side padding keeps outer tabs clear of
          the rounded corners. */}
      <Animated.View style={[styles.pill, { backgroundColor: colors.navbar, shadowColor: colors.black, marginLeft:animatedDockMargin, marginRight:animatedDockMargin }]}> 
        {/* ---- Tab buttons -------------------------------------------- */}
        <View style={styles.row}>
          {TAB_ORDER.map((routeName, index) => {
            const isFocused = tabIndex === index;
            const config = ICONS[routeName];

            // Inner tabs (Practice, Simulators) travel further than outer
            // tabs so they clear the FAB popping in between them. Falls
            // back to a proportional nudge if the tab count ever changes.
            // Larger accessibility labels need extra clearance from the
            // centered Post FAB, especially between Simulators and Community.
            const spread = 1 + Math.max(0, fontScale - 1) * 1.8;
            // Once the dock has expanded, move each half outward by the
            // same amount. Equal shifts preserve the label-to-label gaps;
            // the former larger Simulators shift was what pushed it into
            // Community at accessibility sizes.
            const roomyOuterShift = fontSize === 'extraLarge' ? 10 : 14;
            const roomyInnerShift = roomyOuterShift + 4;
            const roomyShift = [-roomyOuterShift, -roomyInnerShift, roomyInnerShift + 2, roomyOuterShift];
            const shiftAmount = largeCommunity
              ? roomyShift[index]
              : (SHIFT[index] ?? (index - (TAB_ORDER.length - 1) / 2) * TabBar.SHIFT_OUTER) * spread;
            const translateX = fabProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, shiftAmount],
            });

            const onPress = () => {
              if (!isFocused) {
                onSelect(index);
              }
            };

            return (
              <Animated.View key={routeName} style={[styles.tabItem, { transform: [{ translateX }] }]}>
                <ElasticPressable
                  onPress={onPress}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={t(routeName.toLowerCase())}
                  hitSlop={8}
                  style={styles.pressable}
                  pressableStyle={styles.pressableInner}
                >
                  <TabBarButton
                    OutlineIcon={config.Outline}
                    SolidIcon={config.Solid}
                    label={t(routeName.toLowerCase())}
                    focused={isFocused}
                  />
                </ElasticPressable>
              </Animated.View>
            );
          })}
        </View>

        {/* ---- Community "Post" FAB -------------------------------------
            Hidden until the Community tab is active, then pops into the
            center of the pill as the icons spread — and pops back out
            again on exit, in the same graceful motion reversed. The plus
            spins a half turn clockwise on the way in and
            counter-clockwise on the way out (see plusSpin).
            pointerEvents is toggled off while hidden so it can't be
            tapped invisibly. */}
        <Animated.View
          pointerEvents={communityActive ? 'auto' : 'none'}
          style={[
            styles.fabWrap,
            {
              bottom: fabBottom,
              // All four driven by fabPop (timing): a full pop in/out with
              // opacity fading alongside the shrink+drop, and no bounce —
              // timing is monotonic so the button can never flash back
              // after exit the way the spring-driven version did.
              opacity: fabPop,
              transform: [
                { scale: fabPop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                { translateY: fabPop.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
              ],
            },
          ]}
        >
          <ElasticPressable
            shape="circle"
            style={styles.fabPress}
            pressableStyle={[styles.fab, { backgroundColor: colors.accent, shadowColor: colors.black }]}
            onPress={() => {
              // Posting happens where the students already are. Until EduMoe
              // hosts its own feed, this opens the Telegram channel rather
              // than a composer with nowhere to send to.
              Linking.openURL(TELEGRAM_URL).catch(() => {});
            }}
            accessibilityRole="button"
            accessibilityLabel={t('createPost')}
          >
            <Animated.View style={{ transform: [{ rotate: plusSpin }] }}>
              <PlusIcon size={IconSize.fab} color={colors.white} />
            </Animated.View>
          </ElasticPressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export default React.memo(CustomTabBar);

const styles = StyleSheet.create({
  outer: {
  },
  pill: {
    height: TabBar.HEIGHT,
    borderRadius: TabBar.PILL_RADIUS,
    // Float shadow — the pill is elevated off the background, unlike the
    // old flat bar.
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    // Keep children (icons) inside the rounded corners, and let the FAB
    // overflow the top edge.
    overflow: 'visible',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    // Side padding so outer tabs clear the pill's rounded corners and
    // comfortably fit inside it.
    paddingHorizontal: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pressable: { width: '100%' },
  pressableInner: { alignItems: 'center', justifyContent: 'center', paddingVertical: 6, width: '100%' },
  fabWrap: {
    position: 'absolute',
    left: '50%',
    marginLeft: -TabBar.FAB_SIZE / 2,
  },
  fab: {
    width: TabBar.FAB_SIZE,
    height: TabBar.FAB_SIZE,
    borderRadius: TabBar.FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  fabPress: { width: TabBar.FAB_SIZE, height: TabBar.FAB_SIZE },
});
