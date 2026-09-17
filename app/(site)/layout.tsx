/**
 * Layout for the ported pages.
 *
 * Deliberately empty. Each of these routes is a conversion of a standalone
 * HTML document that brought its own navbar, footer and bottom tab bar. Adding
 * shared chrome here would double it up and change how the pages look.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
