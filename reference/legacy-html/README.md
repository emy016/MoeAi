# Legacy HTML — the source of truth for the port

These are the original single-file pages, unmodified. Every `app/**` route is a
mechanical conversion of the matching file here:

- CSS is lifted byte-for-byte into the route's `.css` file. Nothing is retyped.
- Markup is converted HTML → JSX (`class`→`className`, void tags self-closed,
  inline `style` strings → objects). No restyling, no "improvements".
- Page scripts keep their original logic, moved into a client component.

If a ported page ever looks wrong, diff it against the file here rather than
guessing at the design. Do not delete these.
