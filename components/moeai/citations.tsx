"use client";
import { useState } from "react";
import { BookOpen, ChevronDown, Quote } from "lucide-react";
import type { Citation } from "@/lib/moeai/workspace";

/**
 * What the answer was built on.
 *
 * A tutor that says "your week 11 lecture covers this" is only trustworthy if
 * the student can open week 11 and check. Collapsed by default — the answer is
 * the point — and every entry carries the passage that was actually retrieved,
 * so a wrong citation is visible rather than hidden behind a title.
 */
export function Citations({ items }: { items: Citation[] }) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState<string | null>(null);
  return (
    <div className={`mx-citations ${open ? "open" : ""}`}>
      <button className="mx-citations-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <BookOpen size={13} />
        Built on {items.length} passage{items.length > 1 ? "s" : ""} from your material
        <ChevronDown size={13} />
      </button>
      {open && (
        <ol className="mx-citations-list">
          {items.map((item, index) => {
            const id = `${item.ref}-${index}`;
            return (
              <li key={id}>
                <button onClick={() => setShown(shown === id ? null : id)} aria-expanded={shown === id}>
                  <span className="mx-citation-index">{index + 1}</span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.source === "library" ? "Your library" : "Course material"} · {item.ref}</small>
                  </span>
                </button>
                {shown === id && (
                  <blockquote>
                    <Quote size={12} />
                    {item.excerpt}
                    {item.excerpt.length >= 420 ? "…" : ""}
                  </blockquote>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
