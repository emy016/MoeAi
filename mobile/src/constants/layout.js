/**
 * layout.js
 * ---------------------------------------------------------------------
 * Shared layout constants: spacing scale, radii, icon sizes, and the
 * bottom tab bar's geometry. Centralizing these keeps every screen
 * visually consistent and makes the tab bar's FAB math easy to follow
 * from one place instead of scattered magic numbers.
 * ---------------------------------------------------------------------
 */

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};

export const IconSize = {
  tab: 26,
  fab: 28,
};

// ---- Header profile pill geometry -----------------------------------------
// The header's top-right profile pill (see ProfilePill.js + Header.js): a
// compact capsule holding the user's DisplayName/@Handle text on the left
// and a circular placeholder avatar on the RIGHT. All sizes here so the
// component itself holds no magic numbers — same rule as TabBar above.
// AVATAR_SIZE: diameter of the circular placeholder avatar. Sized to
//   nearly fill the pill's height (pill height = AVATAR_SIZE + 2 *
//   PILL_PADDING_VERTICAL), so the circle always "fits" the pill with a
//   slim even ring of padding top/bottom — never overflowing it.
// AVATAR_ICON: size of the generic person glyph inside the avatar circle.
// PILL_PADDING_VERTICAL / PILL_PADDING_LEFT / PILL_PADDING_RIGHT: inner
//   padding of the pill. Vertical/right padding stays tight so the avatar
//   defines the pill's height; left padding gives the text breathing room.
// TEXT_GAP: horizontal gap between the text column and the avatar. Together
//   with the text column's truncation (see ProfilePill.js), this guarantees
//   the avatar can never overlap the DisplayName/@Handle.
// NAME_SIZE / HANDLE_SIZE: font sizes for the DisplayName and @Handle
//   lines. The handle is smaller per spec (secondary line under the name).
export const ProfilePill = {
  AVATAR_SIZE: 32,
  AVATAR_ICON: 18,
  PILL_PADDING_VERTICAL: 4,
  PILL_PADDING_LEFT: 10,
  PILL_PADDING_RIGHT: 4,
  TEXT_GAP: 8,
  NAME_SIZE: 12,
  HANDLE_SIZE: 10,
};

// ---- Header title transition ----------------------------------------------
// The header title glides between tab names on tab switches (see
// Header.js): the outgoing title slides out + fades while the incoming
// one slides in from the direction of travel + fades in. Same rule as
// TabBar above — the component holds no magic numbers.
// SLIDE_DISTANCE: how far (px) each title travels. Small on purpose: a
//   hint of motion in the travel direction, not a full-page chase.
// DURATION_MS: how long (ms) the cross-slide takes. Driven by timing with
//   an ease-out curve (never a spring: springs overshoot and would push
//   the title past its resting spot — see the fabPop note in
//   CustomTabBar.js for the same reasoning).
export const HeaderTitle = {
  SLIDE_DISTANCE: 12,
  DURATION_MS: 170,
};

// ---- Bottom tab bar geometry --------------------------------------------
// The bar is a FLOATING PILL (see CustomTabBar.js): a rounded rect that
// sits above the screen bottom, ringed by dock margins painted in
// Colors.background — NOT a full-width flat strip.
// HEIGHT: height of the pill itself (safe-area bottom inset + floating
//   margin are added OUTSIDE the pill at render time).
// PILL_MARGIN_HORIZONTAL: gap between the pill's sides and the screen
//   edges (safe-area side insets are added on top of this).
// PILL_MARGIN_BOTTOM: gap between the pill's bottom and the safe-area
//   bottom edge — this is what makes it "float".
// PILL_RADIUS: corner radius of the pill. Kept slightly under HEIGHT / 2
//   so the bar reads as a rounded rectangle, not a full capsule.
// FAB_SIZE: diameter of the circular Community-tab "Post" button. It
//   lives INSIDE the pill (vertically centered — see CustomTabBar.js),
//   sized to fit comfortably within HEIGHT with breathing room above
//   and below, so it never pokes outside the dock.
// FAB_POP_DURATION: how long (ms) the Post button's pop in/out takes.
//   Driven by timing (never a spring: springs oscillate and re-flash the
//   button after exit — see CustomTabBar.js).
// SHIFT_OUTER / SHIFT_INNER: how far (px) tabs slide away from center
//   when the Community FAB is open. The two OUTER tabs (Home, Community)
//   already sit far from the center, so they only need a small nudge.
//   The two INNER tabs (Practice, Simulators) start right where the FAB
//   pops in, so they get a bigger push to clear it. INNER > OUTER on
//   purpose — see the `SHIFT[index]` lookup in CustomTabBar.js. Keep
//   INNER - OUTER at 24 or less: beyond that the "Simulators" and
//   "Community" labels collide as Simulators slides toward Community.
export const TabBar = {
  HEIGHT: 68,
  PILL_MARGIN_HORIZONTAL: 16,
  PILL_MARGIN_BOTTOM: 6,
  PILL_RADIUS: 28,
  FAB_SIZE: 52,
  FAB_POP_DURATION: 240, // 20% snappier than the original 300ms pop
  SHIFT_OUTER: 12,
  SHIFT_INNER: 26,
};

// ---- Tab pager ----------------------------------------------------------
// RootNavigator renders every tab side-by-side in one horizontal strip
// and springs the strip to the active index. The previous page stays on
// screen and unloads sideways while the new one arrives — both pages are
// visible throughout, so a blank gap is impossible by construction
// (neighbors always cover the viewport; any overshoot sliver is the same
// background color as the pages themselves).
// FRICTION/TENSION: visible elastic settle on arrival without seasickness.
// SWIPE_*: horizontal-swipe-to-switch-tabs gesture (see RootNavigator.js).
//   The viewport's PanResponder only claims a gesture once it is clearly
//   horizontal (MIN_DX px travelled and dominant over vertical by
//   DIRECTION_LOCK), so vertical ScrollViews inside the pages keep working.
//   On release past THRESHOLD_PX (or THRESHOLD_FRACTION of the width,
//   whichever is larger) — or with a fast flick (VELOCITY) — the pager
//   advances one tab; otherwise it springs back. RootNavigator clamps the
//   strip at Home and Community so neither edge can be pulled past.
export const Pager = {
  FRICTION: 10,
  TENSION: 130,
  SWIPE_MIN_DX: 12,
  SWIPE_DIRECTION_LOCK: 1.2,
  SWIPE_THRESHOLD_PX: 60,
  SWIPE_THRESHOLD_FRACTION: 0.18,
  SWIPE_FLICK_VELOCITY: 0.5,
  SWIPE_FLICK_MIN_DX: 20,
};

// ---- Calendar ------------------------------------------------------------
// Shared geometry for the Home day strip, continuous day timeline, and
// month grid. The timeline is intentionally proportional: every hour has
// the same height and every event derives its top/height from minutes.
export const Calendar = {
  DAY_GAP: 6,
  DAY_PILL_HEIGHT: 84,
  DAY_PILL_RADIUS: 18,
  TODAY_INSET: 4,
  TODAY_LABEL_HEIGHT: 44,
  CONTROL_SIZE: 38,
  CONTROL_ICON_SIZE: 22,
  MARKER_SIZE: 16,
  HOUR_HEIGHT: 64,
  MIN_EVENT_HEIGHT: 30,
  TIME_GUTTER: 58,
  ALL_DAY_DOCK_HEIGHT: 92,
  COVER_RADIUS: 24,
  COVER_HEADER_HEIGHT: 68,
  COVER_CLOSE_SIZE: 40,
  MONTH_CELL_HEIGHT: 64,
  MONTH_MARKER_ROW_HEIGHT: 14,
  MONTH_TOP_BAR_HEIGHT: 70,
  MONTH_BACK_SIZE: 42,
  MONTH_NAV_SIZE: 34,
  MONTH_WEEKDAY_HEIGHT: 42,
  MONTH_DATE_SIZE: 32,
  TIMELINE_DAYS_EACH_SIDE: 30,
  MODAL_POP_SCALE: 0.96,
  MODAL_POP_TRANSLATE: 14,
  MODAL_ANIMATION_MS: 190,
};

// ---- Header profile menu --------------------------------------------------
// Dropdown that pops up below the header's profile pill (see
// ProfileMenu.js + Header.js): Profile, Plan & Usage, Settings.
// WIDTH: the dropdown is content-driven (ProfileMenu applies min/max
//   bounds) so it stays compact while still fitting the longest label.
// GAP: vertical gap between the pill's bottom edge and the menu's top.
// PADDING: inner padding of the menu card.
// ITEM_GAP: vertical gap between menu rows.
// ITEM_PADDING_VERTICAL / ITEM_PADDING_HORIZONTAL: touch target padding
//   inside each row.
// ICON_SIZE: size of the row's leading heroicon.
// LABEL_SIZE: font size of the row label.
// POP_SCALE_FROM / POP_TRANSLATE_Y: the menu pops in from slightly
//   shrunken (SCALE_FROM) and slightly above (TRANSLATE_Y), rising into
//   place while fading in — and reverses on close.
// ANIMATION_DURATION_MS: pop in/out time. Timing with an elastic
//   ease-out-back curve (Easing.out(Easing.back(2)) — same pop as the
//   Community Post FAB, never a spring: springs oscillate and would
//   re-flash the menu after exit — see CustomTabBar.js). The overshoot
//   hump slightly over-grows the menu on open, and on close it dips just
//   below hidden while already invisible, so the menu can never pop back
//   into view on its own.
export const ProfileMenu = {
  GAP: 8,
  PADDING: 6,
  ITEM_GAP: 2,
  ITEM_PADDING_VERTICAL: 10,
  ITEM_PADDING_HORIZONTAL: 12,
  ICON_SIZE: 18,
  LABEL_SIZE: 14,
  POP_SCALE_FROM: 0.85,
  POP_TRANSLATE_Y: -10,
  ANIMATION_DURATION_MS: 300,
};

export default { Spacing, Radius, IconSize, ProfilePill, HeaderTitle, TabBar, Pager, Calendar, ProfileMenu };
