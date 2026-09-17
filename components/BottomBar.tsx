"use client";
// Mobile bottom tab bar. Five items is the limit before labels stop fitting.
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", icon: "M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z" },
  { href: "/library", label: "Library", icon: "M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2zM8 7h8M8 11h8" },
  { href: "/moeai", label: "MoeAI", icon: "M12 3l2.4 5.6L20 11l-5.6 2.4L12 19l-2.4-5.6L4 11l5.6-2.4z" },
  { href: "/quizzes", label: "Practice", icon: "M9 11l3 3 7-7M4 12a8 8 0 1 0 8-8" },
  { href: "/dashboard", label: "You", icon: "M5 21V9m7 12V3m7 18v-7" },
];

export default function BottomBar() {
  const path = usePathname();

  return (
    <nav className="bar" aria-label="Primary">
      {TABS.map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={active ? "tab active" : "tab"}
                aria-current={active ? "page" : undefined}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
                 strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={t.icon} />
            </svg>
            <span>{t.label}</span>
          </Link>
        );
      })}

      <style jsx>{`
        .bar {
          position: fixed;
          left: 12px; right: 12px;
          bottom: calc(12px + env(safe-area-inset-bottom));
          z-index: 60;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          height: var(--bar-h);
          border: 1px solid var(--border);
          border-radius: 22px;
          background: rgba(14, 14, 23, 0.82);
          backdrop-filter: blur(22px) saturate(160%);
          -webkit-backdrop-filter: blur(22px) saturate(160%);
          box-shadow: var(--shadow);
        }
        @media (min-width: 768px) { .bar { display: none; } }

        :global(.tab) {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 3px; font-size: 0.68rem; color: var(--text-muted);
          transition: color 0.15s ease;
        }
        :global(.tab.active) { color: var(--text); }
        :global(.tab.active svg) { stroke: var(--accent-2); }
      `}</style>
    </nav>
  );
}
