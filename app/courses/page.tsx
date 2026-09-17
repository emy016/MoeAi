"use client";
/**
 * Courses — the EduMoe side. Reads real rows from the database; lecture videos
 * are YouTube embeds built from a stored video id.
 *
 * The id is stored rather than a full URL so a pasted tracking link can never
 * inject parameters into the iframe src.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";

interface Course {
  id: string; code: string; title: string; description: string | null;
  semester: number; accent: string;
}
interface Lesson {
  id: string; title: string; summary: string | null;
  youtube_id: string | null; duration: string | null; order_index: number;
}

/** Accept only a real YouTube id; anything else renders as "no video yet". */
function safeYouTubeId(raw: string | null): string | null {
  return raw && /^[A-Za-z0-9_-]{11}$/.test(raw) ? raw : null;
}

export default function Courses() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser()
      .from("courses")
      .select("id, code, title, description, semester, accent")
      .order("order_index", { ascending: true });
    setCourses(data ?? []);
  }, []);

  useEffect(() => {
    supabaseBrowser().auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
      if (data.user) load();
    });
  }, [load]);

  async function openCourse(id: string) {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
    setPlaying(null);
    const { data } = await supabaseBrowser()
      .from("lessons")
      .select("id, title, summary, youtube_id, duration, order_index")
      .eq("course_id", id)
      .order("order_index", { ascending: true });
    setLessons(data ?? []);
  }

  if (signedIn === false) {
    return (
      <section className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
        <h1>Courses</h1>
        <p>Sign in to see the first-year Computer Science material.</p>
        <Link className="btn btn-primary" href="/login">Sign in</Link>
      </section>
    );
  }

  return (
    <div className="stack">
      <section className="card">
        <h1>Courses</h1>
        <p>
          First-year Computer Science at FUE. Lectures are being migrated from the
          Telegram archive to YouTube and indexed here so MoeAI can teach from them.
        </p>
      </section>

      {courses === null && (
        <div className="grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 120 }} />
          ))}
        </div>
      )}

      {courses?.length === 0 && (
        <section className="card">
          <h2>No courses published yet</h2>
          <p>
            The shared curriculum is still being loaded. In the meantime, MoeAI works
            from whatever you put in your own library.
          </p>
          <Link className="btn btn-primary" href="/library">Add your material</Link>
        </section>
      )}

      {courses && courses.length > 0 && (
        <div className="grid">
          {courses.map((c) => (
            <article
              key={c.id}
              className="card course"
              style={{ borderTopColor: c.accent || "var(--accent-2)" }}
            >
              <span className="code">{c.code}</span>
              <h2>{c.title}</h2>
              <p>{c.description || "Lectures and notes."}</p>
              <button className="btn" onClick={() => openCourse(c.id)}>
                {openId === c.id ? "Hide lectures" : "View lectures"}
              </button>
            </article>
          ))}
        </div>
      )}

      {openId && (
        <section className="card">
          <h2>Lectures</h2>
          {lessons.length === 0 && (
            <p>No lectures uploaded for this course yet.</p>
          )}
          <ul className="lessons">
            {lessons.map((l) => {
              const vid = safeYouTubeId(l.youtube_id);
              return (
                <li key={l.id}>
                  <div className="head">
                    <div>
                      <strong dir="auto">{l.title}</strong>
                      {l.summary && <span className="muted small" dir="auto">{l.summary}</span>}
                    </div>
                    {vid ? (
                      <button className="btn" onClick={() => setPlaying(playing === l.id ? null : l.id)}>
                        {playing === l.id ? "Close" : `Watch${l.duration ? ` · ${l.duration}` : ""}`}
                      </button>
                    ) : (
                      <span className="muted small">Video coming</span>
                    )}
                  </div>

                  {vid && playing === l.id && (
                    <div className="player">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${vid}`}
                        title={l.title}
                        loading="lazy"
                        allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <style jsx>{`
        .course { border-top: 3px solid var(--accent-2); display: grid; gap: 8px; align-content: start; }
        .code {
          font-size: 0.72rem; letter-spacing: 0.08em; color: var(--text-muted);
          text-transform: uppercase;
        }
        .course h2 { font-size: 1.15rem; margin: 0; }

        .lessons { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
        .lessons li {
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--surface);
          padding: 12px 14px;
        }
        .head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .head div { display: grid; gap: 2px; min-width: 0; }
        .small { font-size: 0.8rem; }

        .player { margin-top: 12px; aspect-ratio: 16 / 9; }
        .player :global(iframe) {
          width: 100%; height: 100%; border: 0; border-radius: var(--radius-sm);
        }
      `}</style>
    </div>
  );
}
