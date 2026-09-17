// Site footer. Exists mainly so the legal pages are actually reachable — a
// privacy policy nothing links to satisfies nobody.
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="foot">
      <div className="inner">
        <div className="brand">
          <span className="mark" aria-hidden="true" />
          <div>
            <strong>EduMoe</strong>
            <span className="muted"> · MoeAI</span>
            <p className="muted">
              Curriculum-aware AI tutoring for Egyptian university students.
            </p>
          </div>
        </div>

        <nav aria-label="Footer">
          <Link href="/moeai">MoeAI</Link>
          <Link href="/library">Library</Link>
          <Link href="/courses">Courses</Link>
          <Link href="/about">About</Link>
          <Link href="/legal">Terms</Link>
          <Link href="/legal#privacy">Privacy</Link>
          <Link href="/legal#cookies">Cookies</Link>
          <a href="https://t.me/CS_Epic_Save" rel="noopener noreferrer" target="_blank">
            Telegram
          </a>
        </nav>
      </div>
      <p className="muted small">
        MoeAI can be wrong. Check anything that matters against your lecture notes.
      </p>
    </footer>
  );
}
