"use client";
// Desktop top navigation. Hidden below 768px, where BottomBar takes over.
import Link from "next/link";
import { usePathname } from "next/navigation";

// MoeAI and the library come first: the tutor is the product, EduMoe is the
// environment around it.
const LINKS = [
  { href: "/moeai", label: "MoeAI" },
  { href: "/library", label: "Library" },
  { href: "/quizzes", label: "Quizzes" },
  { href: "/courses", label: "Courses" },
  { href: "/simulators", label: "Simulators" },
  { href: "/ranked", label: "Ranked" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/about", label: "About" },
];

export default function Nav() {
  const path = usePathname();

  return (
    <header className="nav">
      <Link href="/" className="brand" aria-label="EduMoe home">
        <span className="mark" aria-hidden="true" />
        <span className="gradient-text">EduMoe</span>
      </Link>
      <nav aria-label="Main">
        <ul>
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} aria-current={path === l.href ? "page" : undefined}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <style jsx>{`
        .nav {
          display: none;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          height: var(--nav-h);
          padding-inline: 24px;
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(7, 7, 12, 0.72);
          backdrop-filter: blur(18px) saturate(140%);
          -webkit-backdrop-filter: blur(18px) saturate(140%);
          border-bottom: 1px solid var(--border);
        }
        @media (min-width: 768px) { .nav { display: flex; } }

        .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 1.05rem; }
        .mark {
          width: 22px; height: 22px; border-radius: 6px;
          background: var(--gradient);
          clip-path: polygon(0 100%, 25% 0, 50% 55%, 75% 0, 100% 100%);
        }
        ul { display: flex; gap: 4px; list-style: none; margin: 0; padding: 0; }
        li :global(a) {
          display: block;
          padding: 8px 12px;
          border-radius: 999px;
          color: var(--text-muted);
          font-size: 0.88rem;
          transition: color 0.15s ease, background 0.15s ease;
        }
        li :global(a:hover) { color: var(--text); background: var(--surface); }
        li :global(a[aria-current="page"]) { color: var(--text); background: var(--surface-2); }
      `}</style>
    </header>
  );
}
