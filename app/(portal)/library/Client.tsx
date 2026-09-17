"use client";
/**
 * Library Mode. Upload your own material and MoeAI answers from it.
 *
 * This page is the answer to "the AI does not know my course yet" — you give it
 * the course. Paste lecture notes, drop a PDF, or upload subtitles exported
 * from a lecture video.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Doc {
  id: string;
  title: string;
  source_kind: string;
  char_count: number;
  created_at: string;
}

export default function Client() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/library");
    if (res.status === 401) { setDocs([]); setError("signed-out"); return; }
    const json = await res.json();
    setDocs(json.documents ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function send(init: RequestInit) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/library", { method: "POST", ...init });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed.");
      setNotice(`Indexed “${json.document.title}” into ${json.chunks} searchable parts.`);
      setTitle("");
      setContent("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  function submitText(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    send({
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
  }

  function submitFiles(files: FileList | null) {
    if (!files?.length) return;
    const form = new FormData();
    form.append("file", files[0]);
    send({ body: form });
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete “${name}”? MoeAI will stop using it.`)) return;
    await fetch(`/api/library?id=${id}`, { method: "DELETE" });
    await load();
  }

  if (error === "signed-out") {
    return (
      <section className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
        <h1>Your library</h1>
        <p>Sign in to upload material MoeAI can teach from.</p>
        <Link className="btn btn-primary" href="/login">Sign in</Link>
      </section>
    );
  }

  return (
    <div className="stack">
      <section className="card">
        <h1>Your library</h1>
        <p>
          MoeAI answers from whatever you put here. Paste lecture notes, drop a PDF,
          or upload subtitles exported from a lecture video. Nothing here is visible
          to anyone else.
        </p>
      </section>

      <section
        className={dragging ? "card drop active" : "card drop"}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); submitFiles(e.dataTransfer.files); }}
      >
        <h2>Add material</h2>

        <form onSubmit={submitText} className="stack">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title — e.g. CS102 Lecture 4: Pointers"
            dir="auto"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={7}
            dir="auto"
            placeholder="Paste your lecture notes, slides, or transcript here…"
          />
          <div className="row">
            <button className="btn btn-primary" type="submit" disabled={busy || !content.trim()}>
              {busy ? "Indexing…" : "Add to library"}
            </button>
            <button type="button" className="btn" onClick={() => fileInput.current?.click()} disabled={busy}>
              Upload a file
            </button>
            <span className="muted small">PDF, .txt, .md, .srt, .vtt — up to 8MB. Or drag one here.</span>
          </div>
        </form>

        <input
          ref={fileInput}
          type="file"
          hidden
          accept=".pdf,.txt,.md,.markdown,.csv,.srt,.vtt,text/*,application/pdf"
          onChange={(e) => submitFiles(e.target.files)}
        />

        {notice && <p className="ok" role="status">{notice}</p>}
        {error && error !== "signed-out" && <p className="err" role="alert">{error}</p>}
      </section>

      <section className="card">
        <h2>Indexed material</h2>

        {docs === null && <div className="skeleton" style={{ height: 72 }} />}

        {docs?.length === 0 && (
          <p>
            Nothing yet. Add one lecture and then ask MoeAI about it — it will cite the
            part it used.
          </p>
        )}

        {docs && docs.length > 0 && (
          <ul className="docs">
            {docs.map((d) => (
              <li key={d.id}>
                <div>
                  <strong dir="auto">{d.title}</strong>
                  <span className="muted small">
                    {d.source_kind.toUpperCase()} · {d.char_count.toLocaleString()} characters ·{" "}
                    {new Date(d.created_at).toLocaleDateString()}
                  </span>
                </div>
                <button className="btn" onClick={() => remove(d.id, d.title)}>Delete</button>
              </li>
            ))}
          </ul>
        )}

        {docs && docs.length > 0 && (
          <Link className="btn btn-primary" href="/moeai">Ask MoeAI about it</Link>
        )}
      </section>

      <style jsx>{`
        .drop { transition: border-color 0.15s ease, background 0.15s ease; }
        .drop.active { border-color: var(--accent-2); background: var(--surface-2); }

        input, textarea {
          width: 100%;
          padding: 12px 14px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: var(--surface);
          resize: vertical;
        }
        .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .small { font-size: 0.8rem; }

        .ok  { color: #86efac; margin-top: 12px; }
        .err { color: #fda4af; margin-top: 12px; }

        .docs { list-style: none; margin: 0 0 16px; padding: 0; display: grid; gap: 10px; }
        .docs li {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--surface);
        }
        .docs li div { display: grid; gap: 2px; min-width: 0; }
        .docs strong { overflow-wrap: anywhere; }
      `}</style>
    </div>
  );
}
