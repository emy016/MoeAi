# Design QA

## Reference

- Supplied image: compact circular progress indicator on a dark card.
- Required differences: use the active app accent and omit the endpoint dot.

## Source-level checks

- The progress ring uses a muted circular track, rounded accent stroke, centered percentage, and no endpoint dot.
- The lecture count is centered below the percentage and derives from live subject data.
- Subject cards use the existing palette, typography, spacing, elastic press feedback, and two-column mobile layout.
- Subject cards use the new compact height while preserving flexible growth for larger accessibility text.
- Lecture tiles expose their index, percentage, manual completion state, and correctly ordered user-delete action.
- Assignment and Quiz icon/label pairs use the active accent; the new-chat tile is transparent and dashed.
- Large-font safety uses bounded labels, wrapping, and `adjustsFontSizeToFit` on compact controls.
- Calendar fixture data is no longer imported or rendered.
- All application source files parse and all relative imports resolve.

## Chat follow-up checks

- The pending assistant bubble uses three independently translated dots, staggered into a wave with a 500 ms rest between cycles. Disabling Motion leaves a static three-dot indicator.
- CommonMark formatting and KaTeX math share a safe renderer with raw HTML disabled. Italic, bold, strikethrough, headings, lists, quotes, links, code, fenced code, tables, and math are covered by automated source checks.
- Plain and formatted content both clamp to the responsive bubble maximum. Long words, links, code, tables, images, and MathML cannot expand a bubble beyond the screen.
- Long-pressing a history row exposes the same solid destructive Trash icon used by subject actions. Confirmation removes the persisted thread and selects or creates a valid replacement chat.
- Copy feedback uses the navbar's centered radial solid-icon reveal, early outline fade, and a translated label that fades/slides out after three seconds.
- All 54 application JavaScript files parse successfully.
- Expo production export succeeds for both web and Android, including platform-specific KaTeX resolution.

## Runtime visual comparison

No device or simulator was attached for a screenshot comparison. Source, parser, security-escaping, dependency, web-bundle, and Android-bundle checks passed.

final result: source and production bundles verified; device visual QA pending
