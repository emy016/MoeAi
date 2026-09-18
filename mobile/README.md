# MoeAI — Mobile App

Foundational UI for the AI tutoring app, now including a complete local
Settings experience, persisted personalization, localization, and consistent
elastic touch feedback. Current app version: **0.2.3**.

## Project structure

```
App.js                        Entry point (SafeAreaProvider + font loading)
src/
  constants/
    colors.js                 <-- Every color in the app. Edit here to re-theme.
    fonts.js                  <-- Every font (Nunito Sans) + loader hook.
    layout.js                 Spacing, radii, icon sizes, tab/pager/calendar geometry
  navigation/
    RootNavigator.js          4-tab horizontal pager + tab state (owns index) + stationary shared header
    CustomTabBar.js           Floating pill tab bar + Community spread/Post FAB animation
    TabBarButton.js           Single tab's icon (outline<->solid crossfade) + label
  components/
    ChatAttachmentPreview.js Full-screen message-scoped media/file carousel
    ScreenContainer.js        Standard screen wrapper (background, no header — header lives in RootNavigator)
    Header.js                 Opaque background-matched header (title + ProfilePill)
    CalendarStrip.js          Free-scrolling Home day pills + week controls
    CalendarEventIcons.js     Shared overlapping Heroicons Mini marker stack
    DayTimelineModal.js       Continuous proportional timeline + fixed all-day dock
    EventEditorModal.js       Persistent user-event editor
    DateTimePickerModal.js    Date/time tabs, mini calendar + wheel modes
    WheelPicker.js            Native wheel with clipped full-size center band
    CalendarAlertModal.js     Validation and delete-confirmation bottom modal
    EventTooltipModal.js      Top-layer details tooltip + assignment actions
    ProgressRing.js           Animated accent lecture-completion ring
    SubjectDashboard.js       Home total progress, shortcuts, and subject grid
    SubjectIcon.js            Dynamic Noun Project first-result icon renderer
    SubjectSheet.js           Swipeable lecture/chat grid and metadata sheet
    SubjectEditorModal.js     Subject/lecture naming + document attachments
    SolidPinIcon.js           Original solid chat-pin glyph
    SubjectActionOverlay.js   Long-press rename/delete action pill
    SwipeableBottomSheet.js   Shared hinge + finger-tracked dismissal
    ProfilePill.js            Top-right profile pill (DisplayName/@Handle text left, placeholder avatar right)
    Card.js                   Shared elevated content surface (rounded rect, no outline)
    ElasticPressable.js       Shared pill/circle elastic press feedback
  calendar/
    calendarModel.js          Year-agnostic date math, object schema + overlap layout
    userCalendarEvents.js     Persistent user-created event storage and hydration
  subjects/
    subjectExamples.js        Five removable test subjects and lecture progress
    subjectStore.js           Persistent user subjects/lectures + aggregate progress
    lectureChatStore.js       Persistent lecture threads, messages, and attachments
    subjectIconSource.js      Replaceable Noun Project source and search rules
  chat/
    useHoldToDictate.js       Native/mobile + browser hold-to-dictate adapter
  storage/
    persistedStorage.js       MoeAI namespace + migration from earlier saved keys
  context/
    AppPreferences.js         Persisted theme, accent, locale, type, motion + notification state
  localization/
    translations.js          UI copy and language-name metadata for all 7 locales
  screens/
    HomeScreen.js
    LectureChatScreen.js      Full-screen AI chat + 75%-width history drawer
    FullCalendarScreen.js     Full-screen Monday-first six-week month grid
    PracticeScreen.js
    SimulatorsScreen.js
    CommunityScreen.js
    SettingsScreen.js         Settings cards, controls, language/font bottom sheets
```

## Design system

All colors live in `src/constants/colors.js` — nothing is hardcoded inline
in a component. `AppPreferences` derives the active palette from the chosen
Light / Dark / System mode and the selected accent preset. Purple remains the
default accent; orange, green, blue, and red use matched saturation/value,
with darker light-mode variants for contrast.

| Token                | Hex       | Used for                              |
|----------------------|-----------|----------------------------------------|
| `Colors.background`  | `#181920` | App/screen background (dark)           |
| `Colors.card`        | `#23252c` | Cards / elevated surfaces, no outline  |
| `Colors.cardButton`  | `#2e3036` | Buttons that sit on cards              |
| `Colors.navbar`      | `#42434a` | Floating pill tab bar                  |
| `Colors.accent`      | `#8766eb` | Active tab icon/label + Post FAB       |
| `Colors.tabInactive` | `#8d8f95` | Inactive tab icon/label (gray)         |
| `Colors.tabActive`   | `#8766eb` | Active tab icon/label (purple)         |

Spacing/radius/icon-size/tab-geometry tokens live in `src/constants/layout.js`
for the same reason — pull from there instead of picking new numbers per
screen. Fonts live in `src/constants/fonts.js`: the whole app is Nunito
Sans (`FontFamily` tokens + `useAppFonts()` loader, gated in `App.js` so
text never flashes in a fallback font). The previous platform-default
font is documented at the top of `fonts.js` as "OLD FONT" in case we
ever revert.

## Settings and preferences

Open the profile pill and choose **Settings**. The tab title springs to the
horizontal center while a circular Heroicons `ArrowLeftIcon` rises into the
left side of the header. Settings is intentionally a local route rather than
a fifth bottom tab.

Preferences persist with AsyncStorage. On first launch, language follows the
device locale when supported, otherwise English. Supported locales are English,
Arabic, Spanish, French, German, Simplified Chinese, and Hindi. Arabic layouts
mirror their rows, align copy right, and flip directional icons. Long labels
wrap or scale within bounded controls so accessibility sizes remain usable.
The language picker includes a centered regional flag beside each two-line name.
Flags are bundled 72 px [Twemoji](https://github.com/twitter/twemoji) artwork;
the graphics license is kept in `assets/twemoji/LICENSE-GRAPHICS`.

Font size has four snapped stops (Small / Default / Large / Extra Large) in an
elastic modal bottom sheet. Its thumb follows the finger continuously, updates
type only when a stop is crossed, and begins a short smooth snap to the nearest
stop in the release handler itself. The thumb and active fill use one animated
progress value, avoiding a React render on every drag frame; the active fill
starts at the dark track's true left edge rather than after the first stop.
Release snapping uses the last actual drag position (not a potentially stale
release-event coordinate), and the thumb translates across the exact on-layout
track width so its center reaches and covers the final stop precisely.
The sheet reserves fixed-height regions for its title, sample, slider, and
labels, so changing the preview size never moves the controls.
Sheets can be pulled down by their handle and continue dismissing from the
gesture's release position. Accent presets use a shared elastic white selection
disc behind the color balls and a bouncing checkmark. Text weight, motion,
themes, and notification
switches update immediately. Turning Motion off removes app-owned transitions
and elastic feedback while leaving navigation functional.
The Theme segmented control is language-independent visually: solid white
Heroicons show Sun for Light, Moon for Dark, and Cog 8 Tooth for Auto, while
localized accessibility labels preserve the meaning for screen readers.

## Press feedback

Use `ElasticPressable` for every visible action. Pill-shaped actions compress
only on the horizontal axis; circular actions scale uniformly. Both spring back
on release while their action runs. Profile-menu rows also tint their icon and
label with the active accent while pressed. The dropdown uses content-driven
width (`minWidth` / `maxWidth`) rather than the previous fixed 224 px width.
Closing the menu disables its backdrop immediately, and opening Settings has no
timer; neither animation can leave an invisible layer delaying the next tap.
Decorative springs do not register as blocking interactions, and repeated
presses stop the previous spring before starting the next one.

## Home subjects and progress

Below the calendar strip, Home now contains one large lecture-progress card
instead of the previous static placeholder cards. Its accent circular ring has
no endpoint dot and derives its percentage from fully completed lectures across
every institution and user-created subject. The muted counter uses the same
live totals. Assignment and Quiz pill actions use the requested solid Folder
and Academic Cap Heroicons.

Subjects render in a compact responsive two-column grid. Their surfaces now
hug the two-line subject label and place the progress row directly underneath,
without distributing unused vertical space. Each card contains its name, its
subject icon, and an animated accent progress bar based only on lecture
progress inside that subject. The dashed create card always follows the final
subject, naturally occupying the next free grid slot. Progress rings and bars
fill from zero whenever Home first opens or becomes the active tab again.

`subjectExamples.js` is the only source of the five removable test subjects:
Mathematics, Physics, Chemistry, Computer Science, and Biology. Their lecture
counts and completion values vary to exercise the aggregate display. User
subjects, lectures, and attachment metadata persist under their own AsyncStorage
key and contribute to the same live totals. Conversation data is normalized and
persisted separately by `lectureChatStore.js`.

Subject icons use the first result from a replaceable Noun Project search rule
in `subjectIconSource.js`. The default resolver searches the subject's current
name during an idle callback, caches the result for the session, and falls back
to a related bundled Heroicon when offline. `configureSubjectIconSource` can replace the provider,
base URL, result index, normalization rule, or resolver; production can point it
at an authenticated Noun Project API v2 proxy without putting OAuth credentials
inside the mobile bundle.

User subjects open a hinge-equipped, swipe-dismissable lecture/chat sheet with
a transparent dashed create-chat tile in the next available grid position. New lecture chats can
attach multiple files through Expo Document Picker. Their cards include a live
percentage, progress bar directly below its two-line copy, muted `Lecture x`
index, and delete control;
institution subjects intentionally expose no create or delete actions. Every
lecture has a completion check at its top-right (immediately left of Delete for
user lectures). Activating it records a separate persisted override, displays
and counts the lecture as 100%, and retains the underlying real progress so
turning the check off restores it. Long-pressing any lecture stacks a second hinge sheet
with creation time, attached files, and available download actions. Long-pressing
a user subject opens the bouncing Pencil/Trash pill over its top-right corner;
tapping or swiping elsewhere dismisses it, while rename and destructive-delete
flows persist immediately.

## Lecture chat

Tapping a lecture opens a full-screen MoeAI conversation while long-pressing
continues to open lecture metadata. User messages use the active accent surface;
until an AI service is connected, every sent message receives a seven-line Lorem
Ipsum assistant bubble. Each assistant reply has a background-free outline
Clipboard Document action that copies its complete text.

The composer keeps taps active while the software keyboard is visible. Its Plus
action opens an upward Camera / Images /
Files menu; Camera is mobile-only, opens the back camera, and is omitted on
desktop. Gallery images and ordinary documents remain as removable 80-pixel
previews above the composer until Send is pressed, allowing text and attachments
to be submitted together. Sent images remain above their message text at the
same size. Selecting a pending or sent attachment opens a tinted, message-scoped
preview with close and circular previous/next controls; it never crosses into a
different message's attachments.

A background-free Microphone action sits beside Send. Holding it expands an
accent circle and streams interim recognition directly into the unsent draft;
release stops recognition without submitting. Desktop web uses the browser Web
Speech API, while Android/iOS use `expo-speech-recognition` with locale-aware
language codes and explicit microphone/speech permissions. Native dictation
requires a development/native build because Expo Go cannot load third-party
native modules. The dictation adapter checks Expo's non-throwing
`requireOptionalNativeModule('ExpoSpeechRecognition')` result before subscribing,
so Expo Go opens safely and only shows the localized unavailable alert if the
microphone is pressed. It never evaluates the package's throwing top-level native
binding in Expo Go. Camera/gallery use `expo-image-picker`, and AI-copy uses
`expo-clipboard`.

Once the first chat message has left the viewport, a centered right-edge dash
rail appears. Its dash count follows user messages up to seven. Opening it reveals
compact versions of every user message; choosing one dismisses the menu and
smoothly scrolls that exact conversation message into view.

The physical top-left menu opens a smoothly animated history drawer occupying
75% of the viewport. Its title is MoeAI; pinned conversations form a conditional
Pinned section and all others remain under Recent. Long-pressing a conversation
reveals the same bouncing action-pill language used by subjects, with rename and
pin controls. Pin state and edited names persist locally. The bottom row keeps a
Pencil Square “New chat” action beside the standard profile pill, whose shared
profile menu opens upward so it remains on-screen.

Inside the chat drawer, the shared profile pill receives a darker card-button
surface override while preserving its normal typography, RTL ordering, and a
contrasting avatar circle. The rename/pin action pill is positioned halfway
above the selected history row instead of sitting inside its text area.

The drawer and dimming layer sit above the entire chat surface, including the
still-rendered composer, so nothing jumps or remounts when history opens. Newly
sent user bubbles float swiftly into place and the placeholder MoeAI reply enters
with a short spring pop. Chat threads, messages, pin state, renamed titles, and
attachment metadata persist locally for university and user-created lectures;
deleting a lecture or user subject removes its associated conversations.

Sent images and document cards occupy one horizontally swipeable strip above
their message text, rather than wrapping into a vertical stack. The multiline
composer explicitly uses the platform Send/Enter action with submit-without-blur
behavior, so keyboard submission sends the draft while the keyboard and input
focus remain active.

The sent attachment strip is explicitly constrained to the 80-pixel preview
height, with only a four-pixel gap before accompanying text. This prevents a
horizontal ScrollView from contributing unused vertical space inside a bubble.

The public app name, Expo slug, package metadata, native identifiers, localized
copy, and storage namespace now use **MoeAI**. The storage reader migrates values
from a prior namespace by matching each key's stable suffix, so compatible local
data is retained when it remains available to the current app container.

## Performance and responsiveness

Primary tabs stay mounted and are memoized, so opening the profile menu,
changing tabs, or visiting Settings does not rebuild the Home calendar.
Settings temporarily hides the retained tab viewport instead of unmounting it;
returning restores the same tab and calendar state without startup work.

The pager, header, press feedback, modal transitions, and navbar icon reveal
use native-driver transforms and opacity wherever their visual behavior allows.
The navbar label-color transition is a native crossfade rather than a
JavaScript-thread color interpolation. Decorative animations are marked as
non-interactions so virtualized lists remain free to render while they move.

Calendar locale formatters are cached by locale and format, avoiding repeated
`Intl.DateTimeFormat` construction across day cells and hourly rows. The Home
strip uses a bounded FlatList render window, deterministic item geometry,
clipped off-screen children, stable callbacks, and memoized marker components.
Each SVG-bearing day cell is also a memoized component, so the live `Week x`
state can update without rebuilding visible pills and icons. The list uses a
smaller three-window render budget and stable drag/momentum/failure callbacks,
addressing React Native's slow-update warning without reducing its date range.
Full-month rows memoize their marker lookup and render only the marker
views needed for each cell. The selected-day panel uses each object pill itself
as the detail action, so it no longer renders a redundant button alongside every
entry. The full calendar keeps its current and adjacent month models prepared and
derives grid width directly from the viewport, removing the old post-open layout
measurement and second render. Its hardware-accelerated native surface uses a
faster entrance spring and a 90 ms exit, so opening and closing remain responsive
without dropping the elastic visual language. Month marker arrays are prepared
inside each memoized month page and arrive with their date cells in the same commit.
Week-arrow scrolling is delegated to the
native list implementation instead of issuing a JavaScript scroll command on
every animation frame. Programmatic week changes commit the destination label
once, before the native scroll begins. While the native list travels, its
intermediate offsets are ignored for the label; manual dragging cancels that
lock and remains live. `Week x` therefore cannot bounce destination → old week
→ destination and adds no per-frame JavaScript state work. Timeline rows prepare their day split once and reuse it
for event-column layout, while a single minute timer exists only while the day
modal is visible.
Preference writes are skipped when a selected value has not changed, while
palette, translation, and typography helpers retain stable references whenever
their own inputs are unchanged. User-event and preference persistence is queued
after the immediate UI state commit, keeping AsyncStorage serialization out of
button-response work. There are no calendar network/API calls; calendar views
now contain only persisted user-created events until an institution feed exists.
The unused Nunito Sans 800 font asset is no longer loaded; all retained font
weights are rendered by the current UI. Generated caches, dependency folders,
and validation bundles are excluded through `.gitignore` and from release ZIPs.

## Calendar foundation

`src/calendar/calendarModel.js` is the single source of truth for calendar
objects and Gregorian date calculations. Objects use inclusive `start` and
exclusive `end` `Date` values; point-in-time assignment markers use `point`,
while birthdays, holidays, and other fixed-day objects use `allDay`. All week,
month, leap-year, month-boundary, and ISO week-number calculations are derived
at runtime—there are no hardcoded year layouts.
All dummy calendar assignments, exams, events, birthdays, and holidays have
been removed. Calendar screens hydrate only `userCalendarEvents.js`; those
institution-owned object types remain absent until their real source is
connected. Every calendar action is translated through the existing
seven-locale preference system; weekday, month, and time labels use
`Intl.DateTimeFormat` with the active locale.
The formatter explicitly requests the Gregorian calendar in every locale (in
particular Arabic), so translated labels never disagree with grid date math.
Birthdays support `recurrence: 'yearly'` with zero-based `month` and `day`
fields, so they reappear in every navigated year (February 29 appears only in
actual leap years).

The model owns six marker kinds (assignment uploaded/submitted/due, quiz/exam,
event, and birthday). Holidays use the existing event kind rather than a
separate class. It clips multi-day timed objects to each day and uses
interval partitioning to assign non-covering columns to overlapping events.
Assignment `submissionDate` metadata participates in day matching, marker
generation, and timeline endpoints, so the shared Heroicons Mini
`DocumentCheckIcon` appears in both the month grid and selected-day list.
`ORGANIZATION_ACADEMIC_YEAR_START` is currently `null`, so `Week x` uses the
calendar's ISO week. Supplying a future organization's academic-year start
automatically switches the label to elapsed academic week numbering.

`CalendarStrip.js` renders a virtualized, freely scrolling row of seven
responsive vertical day pills. The data window extends in both directions as
the user reaches an edge, while week arrows can rebase the window around any
future date. The leftmost visible date drives the runtime ISO `Week x` label
continuously; the strip deliberately has no snapping. Week-arrow taps use the
platform-native smooth scroll path so the list stays fluid while marker cells
remain mounted, while their destination `Week x` label updates synchronously
on press instead of waiting for scroll events. The shorter day pills render requested Heroicons Mini glyphs
overlapped by roughly half. Each glyph sits in the restored circular marker,
whose diameter is one pixel smaller than the original version and whose border
remains a subtle hairline. Pressing the centered `Week x` label smoothly scrolls
back to the current week instead of teleporting. The same animated reset happens
whenever Home becomes active again
after visiting another tab or Settings. That reset is registered as a stable
imperative callback, so tab selection no longer changes Home's props or
rerenders its calendar tree during pager navigation. Returning Home commits the
tab change first, then performs the native strip reset on the next frame while
Home is still sliding in.
The tab pager no longer captures a gesture before nested horizontal controls,
so dragging this strip does not accidentally change the active tab.

`DayTimelineModal.js` is a cover modal whose virtualized vertical list treats
each item as exactly 24 proportional hours. Adjacent days therefore meet at
23:59/00:00 without page snapping, and the fixed header changes when the next
day crosses the viewport midpoint. Today centers the live current time; other
dates center their first timed object/deadline (or midnight when empty).
Overlaps share equal-width columns, short objects retain a minimum tap height,
deadlines are horizontal markers, and all-day objects remain in a fixed bottom
dock. Timed blocks, deadline lines, and all-day chips all open the same
expandable information tooltip.
Minimum tap height participates in overlap calculation as visual duration, so
a very short object cannot cover a following object after being enlarged.
Assignment deadlines sharing the same instant collapse into one line and one
tooltip listing every matching assignment. Dense icon stacks shrink as needed
to remain inside their day cell without dropping a marker.
Multi-day assignments expand their `rangeMarkers` into timed upload and due
endpoints, so both labeled horizontal lines participate in initial scrolling
and each endpoint keeps its own document-arrow direction. All-day chips and the
month event list use that same endpoint-aware marker lookup.
Deadline/upload captions use a fixed-height centering wrapper, preventing font
metrics from raising the text above its two-pixel timeline line. The wrapper
grows with the selected font scale, allowing two-line labels at Extra Large
without clipping. The live current-time line and its localized `Now` pill both
use the selected accent color, with white pill text in dark mode and black pill
text in light mode. A soft translucent accent halo spans the entire line. While
the line falls inside a timed event, that event's accent fill
brightens by 25%; the clock refreshes once per minute while the modal is open.
The calendar-cover weekday and
full date are larger, centered, and tappable; pressing them removes that native
layer immediately and opens the full month calendar. The weekday remains
proportionally smaller than the date, while the X control stays fixed at top-left
and a matching plus action stays at top-right. The selected day and focus time
are frozen for the entire exit animation, preventing a dismissed non-current
day from briefly remounting or jumping to the live `Now` position.
The timeline keeps only 30 adjacent days on either side of the selected day and
renders a three-window batch, substantially reducing initial JS/UI work.
Midnight labels sit below their boundary line inside the new day, so consecutive
days remain continuous without clipping `12 AM`. The cover owns the entire
touch surface while mounted and uses custom elastic open/close motion.
It becomes visible on the initiating state change, while its animation begins
without a deferred mount frame.

`EventTooltipModal.js` is a separate native modal above the calendar cover—not
a clipped child view. Its content survives its elastic dismiss animation and
taps inside cannot trigger the backdrop. The title is raised into a leading
header; its X is on the right in LTR languages and on the left in Arabic.
Details are object-aware:
assignments show upload/due/submission dates, events show times plus date ranges
when multi-day, exams show date and time, and birthdays add no redundant rows.
Event details use one aligned two-column date/time presentation: the start and
end dates sit above their times with a centered dash between the columns. When
the dates are equal, both date values use the muted gray; when the clock values
are equal, both time values use the muted gray. Changed date/time pairs use the
primary bright text color. Numeric dates use the app-wide day/month/year slash
format, and the layout mirrors for Arabic without changing vertical alignment.
Assignment date rows use the requested solid document-arrow-down,
document-arrow-up, and document-check icons. Dates and times share a vertically
centered muted-gray treatment; submission values use the green preset when
early and the red preset when late. File actions stay on one bounded row in
Download, View file, Jump To order. Download uses the accent surface with a
background-colored icon. Whole-day events omit Jump To; eligible objects pass
an explicit date and minute to the continuous timeline. Optional descriptions
stay fully collapsed until Show description is pressed and open/close with an
elastic height transition.

`FullCalendarScreen.js` presents a full-screen seven-column, Monday-first month
grid. It uses a stable six-week/42-cell surface beginning on the Monday of the
week containing the month's first day, so dates retain their actual weekday
column across month changes. The heading stays Monday through Sunday. The derived
cells never stop at month boundaries: adjacent-month dates stay visible on the
same rows with dimmer surfaces, while runtime month markers are embedded above
every day numbered 1. Month markers reserve a taller bounded line at Extra
Large rather than shrinking into the old slot. Each week row uses the current-
month surface as its base, while adjacent-month cells retain their darker color.
The final previous-month cell rounds its bottom-right corner and the first next-
month cell rounds its top-left corner, exposing the base color beneath instead of
adding another shape. The first current-month cell also rounds its top-left corner
over a previous-month-colored backing, and the last current-month cell rounds its
bottom-right corner over a next-month-colored backing. Those physical corners
mirror automatically in Arabic. Demo objects spanning several dates are
represented by their relevant endpoint icons. User-created events instead show
the event star on every date in their inclusive range while retaining endpoint-
only timeline lines. Month arrows use date arithmetic and navigate across any
future year, including leap years. The previous, current, and next grids are
mounted side-by-side in a clipped track, including their precomputed object
markers. Horizontal dragging is captured once clearly horizontal and follows
the finger one-to-one; a native, lightly under-damped spring moves the already-
rendered neighboring grid to the center before the month model is committed.
Arrow buttons use that same path. The destination month title, week, and
selected-day event panel update at transition start rather than waiting for the
native spring to settle. When the spring finishes, the pager offset and month
model rebase in the same JS turn, preventing a frame of the old or following
month's events. An already-prepared destination overlay covers the native
rebase and fades over the identical settled page, eliminating new→old→new
flashes even when the UI and JS threads commit on adjacent frames. Overlapping
month pages are memoized by year/month and object
identity, so the two pages shared across a transition do not rebuild their 42
cells or icon stacks.
Pressing the month/year title returns immediately to the current month. Closing
the calendar resets its month, inspected day, and selection when dismissal
finishes, so every later opening starts on the current month.
The week number sits directly beneath the month/year and shares its leading
edge. On a freshly opened month calendar, Today opens its timeline with one tap.
After any other date has been inspected, Today rejoins the normal inspect-first
flow and therefore needs one tap to refresh the panel and a second to open.
Every other date uses inspect-first behavior: the first tap places a translucent
accent circle with the exact current-day radius directly behind the date and
refreshes the bottom event panel; the second tap opens the
day timeline. Press feedback no longer shades the entire date cell. Today keeps
its full-opacity identity circle and gains a subtle
outer selection halo when inspected. Moving from another inspected date back
to Today therefore refreshes the panel first and opens only on the second tap.
Date numerals and in-cell month markers use larger type.
The selected-day card uses a larger date heading with a physical top-right plus
action. User-owned rows include a compact X deletion action and retain their
full-width details target.

## User-created calendar events

The plus actions in the single-day header and full-calendar selected-day card
open the same localized event editor. Its Start and End fields default to the
triggering day: Start rounds the current clock up to the nearest ten-minute
boundary (or keeps an exact boundary), and End defaults to one hour later.
All calendar detail labels use consistent **Start–end** terminology.

Each field opens a non-draggable bottom modal with content-sized Date and Time
tabs. Time is selected first. The time view provides independent hour, minute,
and AM/PM wheels. Those three columns are grouped at 82% width and centered in
a 230 px wheel region inside the shorter shared viewport, reducing empty space
without changing the five-row scrolling behavior. The date view provides an
accurate Monday-first month grid, month arrows, an outlined live-today circle,
and a filled selected-date circle. Its grid is six explicit rows of seven equal
flex cells instead of a percentage-width wrapped collection, so rounding can
never push the Sunday column into a clipped seventh row.
The Time and Date panes now occupy adjacent pages in one measured, two-page
horizontal track. Each page owns an explicit 282 px root and is marked
non-collapsible for Android. Switching tabs moves the whole track by exactly one
measured viewport width, so Date visibility no longer depends on Android
redrawing an initially transparent absolute layer. Date keeps its 42 px header
in normal flow with an explicit 240 px viewport directly beneath it.
The tab selection and selected day explicitly clip to pill and circle geometry,
respectively. The shared content viewport is a fixed 282 px, with Date occupying
the same height from its first frame; it therefore cannot appear below its final
position and then relayout. Time/Date transitions slide a complete page in the
selected direction and briefly stretch horizontally, making the rubber-like
motion clear without an opacity-dependent visibility state.
Pressing its centered month/year title elastically switches to month/day/year
wheel pickers, with the chevron rotating smoothly into its upward state. This
mode was rebuilt as a direct counterpart to Time: month on the left, day in the
middle, and year on the right, all using the same `WheelPicker`. Calendar and
wheel modes remain mounted as adjacent pages in a second measured horizontal
track. That track also moves exactly one viewport width; the inactive page is
offscreen, non-interactive, and excluded from accessibility. Every wheel uses native
scrolling and snapping; muted smaller rows remain underneath a clipped center
band that reveals only the passing portion at full size and contrast, bounded
by two hairline separators. Both layers are windowed; the bright overlay retains
only the selected row and four neighbors on either side, so the long year list
does not create hundreds of animated native text nodes. The center band is
opaque, preventing muted duplicate text from showing behind the selected value.
Every wheel initializes both its scroll position and native animation value at
the controlled selection, and ignores FlatList's temporary startup offset until
the user actually interacts; this prevents minute values from flashing or being
rewritten to zero while a Start/End picker opens.

Time and Date content remain mounted on the measured track and slide with a
short native elastic spring inside the fixed-height clipped viewport. The inactive
page stays prepared offscreen, non-interactive, and hidden from accessibility,
so switching never waits for a calendar or wheel to mount. Memoized
pickers ignore irrelevant updates (time-only updates do not rebuild Date; date-only
updates do not rebuild Time) and use one shared live draft ref when interacted
with, keeping the retained layers inexpensive. The Date/Time tab's accent pill
uses the same native progress value and physically slides between equal-width
targets instead of teleporting. The event editor, Start/End
picker, and validation/delete modal initialize during layout and use
hardware-accelerated entrance and exit motion. Their displayed title/message is
frozen through dismissal so parent-state cleanup cannot blank or rename a modal
mid-animation.

Calendar date/time and validation bottom modals float above the device bottom
safe area by the same six-pixel margin used by the bottom navigation pill.
User-facing compact numeric dates use `day/month/year` slashes (for example,
`17/9/2026`); ISO-style hyphens remain internal-only calendar keys.

Confirming a field updates the editor only when End remains after Start;
otherwise a dismissible localized warning appears. Done requires a title and
saves a normalized event through AsyncStorage in `userCalendarEvents.js`.
These records are the calendar's only current event source, use the existing
event-star marker, and survive app restarts. Same-day
events render as proportional timeline blocks. Multi-day user events intentionally
render only accent endpoint lines explicitly labeled Start and End, never daily blocks. Their
event-star calendar marker appears on every date in the inclusive range. User-event X controls in
the selected-day card and same-day timeline blocks open the same localized,
destructive confirmation bottom modal before removing the stored record.

The full-month calendar keeps its previous, current, and next grids prepared in
one clipped three-page track. Horizontal swipes follow the finger one-to-one and
spring the adjacent, already-rendered month into place with a small elastic settle;
this avoids swapping calendar content in the middle of a gesture. The event-editor
time/date panes and the date calendar/wheel panes remain prepared in measured
two-page tracks, then slide with a short horizontal rubber stretch so neither
view can flash at the left edge or wait for a mount before moving into position.

Home places the calendar directly below the shared header, before the existing
dashboard cards. A day pill or month cell opens the shared timeline; the
calendar-circle button opens the full-screen month grid. Closing a day opened
from the month grid returns to that grid, while closing the grid returns Home.
Each selected-day object pill now fills the panel width and directly opens the
shared type-aware details modal. Its Jump To action passes an explicit target
date and minute, and the timeline remounts its virtual list for that target and
waits for layout before centering it.

## The pages (`RootNavigator.js`)

Tabs are a horizontal pager, not a stack: all four screens stay mounted
side-by-side in one wide strip, and selecting a tab springs the strip to
that page (`Pager.FRICTION` / `Pager.TENSION` in `layout.js`). The
previous page unloads sideways while the new one arrives — both visible
throughout, so there is never a blank gap, and jumping several tabs
glides through the ones between. Tab order is `TAB_ORDER` (exported from
`CustomTabBar.js`, single source of truth).
Touch drags always start from the selected tab rather than an asynchronous
animation sample, and the strip is hard-clamped at Home and Community.
Pager tension is tuned for a quicker settle, and header labels swap immediately
before their short entrance motion rather than waiting at its midpoint.
Opening Settings hides this mounted strip instead of destroying it, preventing
an expensive calendar reconstruction on both entry and return.

The shared top header (`Header.js`: screen title + `ProfilePill.js` with
placeholder DisplayName/`@handle` and a generic avatar circle on the
pill's right) renders once above the pager viewport, NOT inside the
moving strip, so it remains stationary and cannot expose seams while pages
move underneath it. Its surface is explicitly painted with
`Colors.background` (not transparent), so vertically scrolling content can
never show through and reduce header readability. This applies to Settings
as well because it uses the same shared header. The title
cross-slides in the travel direction on every switch (outgoing slides
out + fades, incoming slides in + fades, `HeaderTitle` tokens in
`layout.js`) while the pages glide behind it. Sizing for the
pill/avatar lives in the `ProfilePill` tokens in `layout.js`.

## The bottom tab bar (`CustomTabBar.js`)

Implements the spec behavior:

- **Floating pill** — rounded rect (`TabBar.PILL_RADIUS`) floating above
  the screen bottom, ringed by dock margins painted in
  `Colors.background`, `Colors.navbar` pill surface, soft float shadow.
- **Icon states** — each tab cross-fades between a gray *outline*
  heroicon and a purple *solid* heroicon on focus (`TabBarButton.js`), with
  the label text color animating alongside it. Icons come from
  [`react-native-heroicons`](https://www.npmjs.com/package/react-native-heroicons),
  the official React Native port of [heroicons.com](https://heroicons.com/)
  (`HomeIcon`, `BookOpenIcon`, `CpuChipIcon`, `UserGroupIcon`, `PlusIcon`).
- **Community tab special-case** — when `Community` becomes the active
  tab, all 4 tab icons spring outward away from the pill's horizontal
  center (`fabProgress` spring), and a circular purple Post FAB (white
  `PlusIcon`) pops into the center of the pill (`fabPop` timing value),
  sitting vertically centered inside the dock between the spread tabs.
  With Large or Extra Large type, the pill also expands toward the screen
  edges and moves Practice/Simulators a few extra pixels away from the Post FAB.
  Leaving Community springs the icons back and pops the FAB back out.
  Two values by design: the FAB deliberately does NOT ride the icon
  spring, because springs oscillate after exit and would re-flash the
  button (see the `fabPop` comment in `CustomTabBar.js`).
- The FAB's `onPress` is a `TODO` — it isn't wired to an action yet since
  the "create" flow it should trigger hasn't been defined.

### Extending it

- **New tab:** add its component to `COMPONENTS` in `RootNavigator.js`,
  then add its icon pair + label to the `ICONS` map in `CustomTabBar.js`
  in the SAME position (order is `TAB_ORDER`, shared by both). The
  center-offset spread math auto-adjusts for however many tabs exist.
- **Re-theme:** add or edit an entry in `AccentPresets` in `colors.js`.
  Runtime palette selection is handled by `AppPreferences`.
- **Different animation feel:** icon spread = `friction`/`tension` on the
  `Animated.spring` in `CustomTabBar.js` (`SHIFT_OUTER` / `SHIFT_INNER`
  travel in `layout.js`); Post button pop = `FAB_POP_DURATION` + easing
  on the `Animated.timing` in `CustomTabBar.js`; page glide = `Pager`
  spring in `RootNavigator.js`.

## Notes for whoever (human or AI) picks this up next

- React Native Web compatibility: the event tooltip action row does not use
  the unsupported `direction` style. The progress ring renders a static SVG
  circle on web (where animating SVG props through `Animated` is unsupported)
  and retains its animated SVG path on native Expo targets.

- Every component/file has a header comment explaining its purpose and any
  non-obvious decisions — read those before modifying.
- Don't hardcode colors or spacing values; always import from
  `src/constants/`.
- Screens should be built as `<ScreenContainer>...</ScreenContainer>`
  with `<Card>` for content blocks, to stay visually consistent with what's
  already here. (The header comes from `RootNavigator`, not the screen —
  don't render your own.)
- Privacy/Data and Information actions are UI-only placeholders. Notification
  preferences persist locally but do not schedule OS notifications yet.
