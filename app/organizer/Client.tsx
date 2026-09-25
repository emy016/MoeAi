"use client";
/**
 * The MoeAI Organizer: tutor mode for TAs and professors.
 *
 * Staff upload a course once. MoeAI reads every file, splits it into cited
 * passages, embeds them for retrieval, then organizes the whole course into
 * its "brain" (map, glossary, formulas, common mistakes, practice) and goes
 * and researches the gaps on its own. Anything MoeAI wrote itself waits here
 * for a human to approve before a student can see it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Markdown } from "@/components/moeai/markdown";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Course = { id: string; code: string; title: string; role: string; year: number | null; semester: number | null };
type Material = {
  id: string; title: string; kind: string; week: number | null; status: string; error: string | null;
  pages: number | null; char_count: number | null; chunk_count: number | null; summary: string | null; created_at: string;
};
type Brain = {
  overview: string | null;
  outline: { week?: number | null; topic: string; subtopics?: string[]; materials?: string[] }[] | null;
  glossary: { term: string; definition: string; source?: string }[] | null;
  formulas: { name: string; latex: string; when?: string }[] | null;
  mistakes: { mistake: string; fix: string }[] | null;
  practice: { question: string; answer: string; topic?: string; difficulty?: string }[] | null;
  gaps: { topic: string; why: string }[] | null;
  updated_at?: string;
};
type Me = { signedIn: boolean; name?: string; org?: { role: string; orgName: string; externalId: string } | null };
type Tab = "materials" | "brain" | "review" | "try";

const STATUS: Record<string, { label: string; tone: string }> = {
  queued: { label: "Queued", tone: "" },
  uploading: { label: "Uploading", tone: "warn" },
  processing: { label: "Reading", tone: "warn" },
  ready: { label: "Ready", tone: "live" },
  failed: { label: "Failed", tone: "bad" },
  pending_review: { label: "Needs review", tone: "warn" },
};

async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.json !== undefined ? { "content-type": "application/json" } : undefined,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status}).`);
  return body as T;
}

const list = <T,>(v: T[] | null | undefined) => (Array.isArray(v) ? v : []);

export default function Client() {
  const [me, setMe] = useState<Me | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<string>("");
  const [tab, setTab] = useState<Tab>("materials");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [brain, setBrain] = useState<Brain | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const course = courses.find((c) => c.id === courseId);
  const note = useCallback((line: string) => setLog((l) => [...l.slice(-60), `${new Date().toLocaleTimeString()}  ${line}`]), []);

  useEffect(() => {
    (async () => {
      const who = await api<Me>("/api/auth").catch(() => ({ signedIn: false }) as Me);
      setMe(who);
      if (!who.signedIn) return;
      const { courses: mine } = await api<{ courses: Course[] }>("/api/org/courses").catch(() => ({ courses: [] as Course[] }));
      const teaching = mine.filter((c) => c.role === "teacher");
      setCourses(teaching);
      setCourseId((id) => id || teaching[0]?.id || "");
    })();
  }, []);

  const refresh = useCallback(async () => {
    if (!courseId) return;
    try {
      const [m, b] = await Promise.all([
        api<{ materials: Material[] }>(`/api/organizer/materials?course=${courseId}`),
        api<{ brain: Brain | null }>(`/api/organizer/brain?course=${courseId}`),
      ]);
      setMaterials(m.materials);
      setBrain(b.brain);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this course.");
    }
  }, [courseId]);
  useEffect(() => { setMaterials([]); setBrain(null); void refresh(); }, [refresh]);

  // Finish the course's semantic index in the background: bulk-imported
  // lectures arrive searchable by text, and this adds the embeddings.
  useEffect(() => {
    if (!courseId) return undefined;
    let alive = true;
    (async () => {
      for (let round = 0; alive && round < 12; round++) {
        const r = await api<{ filled: number; remaining: number }>("/api/organizer/reindex", { method: "POST", json: { courseId } }).catch(() => null);
        if (!r || !alive) return;
        if (r.filled) note(`Indexed ${r.filled} passages by meaning${r.remaining ? `, ${r.remaining} to go` : ", index complete"}.`);
        if (!r.remaining || !r.filled) return;
      }
    })();
    return () => { alive = false; };
  }, [courseId, note]);

  const uploaded = materials.filter((m) => m.kind !== "generated");
  const pending = materials.filter((m) => m.status === "pending_review");

  // ── Upload → process ────────────────────────────────────────────────────
  const [week, setWeek] = useState("");
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | File[]) {
    if (!course) return;
    setError("");
    const sb = supabaseBrowser();
    for (const file of Array.from(files)) {
      setBusy(`Uploading ${file.name}`);
      try {
        const { id, path } = await api<{ id: string; path: string }>("/api/organizer/materials", {
          method: "POST",
          json: { courseId: course.id, fileName: file.name, week: week ? Number(week) : null },
        });
        note(`Uploading ${file.name} (${(file.size / 1048576).toFixed(1)} MB)`);
        const { error: upErr } = await sb.storage.from("course-files").upload(path, file, { upsert: true, contentType: file.type || undefined });
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
        await refresh();
        setBusy(`Reading ${file.name}`);
        note(`Reading, splitting and embedding ${file.name}…`);
        const result = await api<{ pages: number; chunks: number; chars: number }>("/api/organizer/process", { method: "POST", json: { courseId: course.id, id } });
        note(`✓ ${file.name}: ${result.pages} pages → ${result.chunks} searchable passages`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed.";
        note(`✗ ${file.name}: ${message}`);
        setError(message);
      }
      await refresh();
    }
    setBusy("");
  }

  async function retry(m: Material) {
    if (!course) return;
    setBusy(`Reading ${m.title}`);
    try {
      const r = await api<{ pages: number; chunks: number }>("/api/organizer/process", { method: "POST", json: { courseId: course.id, id: m.id } });
      note(`✓ ${m.title}: ${r.pages} pages → ${r.chunks} passages`);
    } catch (err) {
      note(`✗ ${m.title}: ${err instanceof Error ? err.message : "failed"}`);
    }
    setBusy("");
    await refresh();
  }

  async function remove(m: Material, action?: "reject") {
    if (!course || !window.confirm(action ? `Discard "${m.title}"?` : `Delete "${m.title}" and everything MoeAI learned from it?`)) return;
    await api(action ? "/api/organizer/materials" : "/api/organizer/materials", {
      method: action ? "PATCH" : "DELETE",
      json: { courseId: course.id, id: m.id, action },
    }).catch((err) => setError(err.message));
    await refresh();
  }

  async function approve(m: Material) {
    if (!course) return;
    await api("/api/organizer/materials", { method: "PATCH", json: { courseId: course.id, id: m.id, action: "approve" } }).catch((err) => setError(err.message));
    note(`✓ Approved "${m.title}": students can now learn from it`);
    await refresh();
  }

  // ── Brain ──────────────────────────────────────────────────────────────
  async function organize(thenResearch: boolean) {
    if (!course) return;
    setError("");
    setTab("brain");
    setBusy("MoeAI is organizing the course");
    note(`Organizing ${course.code} from ${uploaded.filter((m) => m.status === "ready").length} files…`);
    try {
      const { brain: built } = await api<{ brain: Brain }>("/api/organizer/brain", { method: "POST", json: { courseId: course.id } });
      note(`✓ Course map, ${list(built.glossary).length} glossary terms, ${list(built.formulas).length} formulas, ${list(built.mistakes).length} common mistakes, ${list(built.practice).length} practice questions`);
      await refresh();
      if (thenResearch) {
        for (const gap of list(built.gaps)) await research(gap, true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Organizing failed.";
      note(`✗ ${message}`);
      setError(message);
    }
    setBusy("");
  }

  async function research(gap: { topic: string; why: string }, quiet = false) {
    if (!course) return;
    if (!quiet) setBusy(`Researching ${gap.topic}`);
    note(`Researching gap: ${gap.topic}…`);
    try {
      const { note: written } = await api<{ note: { title: string; sources: number } }>("/api/organizer/research", {
        method: "POST",
        json: { courseId: course.id, topic: gap.topic, why: gap.why },
      });
      note(`✓ Wrote "${written.title}"${written.sources ? ` from ${written.sources} web sources` : ""}: waiting for your review`);
    } catch (err) {
      note(`✗ ${gap.topic}: ${err instanceof Error ? err.message : "failed"}`);
    }
    if (!quiet) setBusy("");
    await refresh();
  }

  if (!me) return <main className="org-page"><p className="org-muted">Loading…</p></main>;

  if (!me.signedIn || !courses.length) {
    return (
      <main className="org-page">
        <div className="org-wrap">
          <section className="org-card">
            <div className="org-head">
              <Logo size={40} />
              <div>
                <h1>Tutor page</h1>
                <p>For professors and TAs: manage the MoeAI model for your course. Upload your course once; MoeAI organizes it for every student in it.</p>
              </div>
            </div>
            <ul className="org-muted" style={{ marginTop: 14, lineHeight: 1.7, paddingLeft: 18 }}>
              <li><strong>Materials:</strong> upload lecture slides, sheets and past exams (PDF, PPTX, DOCX). MoeAI reads them and answers students with citations to your files.</li>
              <li><strong>Brain:</strong> the course map, glossary, formulas, common mistakes and practice MoeAI builds from them, which you can regenerate.</li>
              <li><strong>Review:</strong> anything MoeAI wrote on its own waits for your approval before a student sees it.</li>
              <li><strong>Try:</strong> ask MoeAI what a student would ask and see exactly how it answers from your course.</li>
            </ul>
            <p className="org-muted" style={{ marginTop: 14 }}>
              {me.signedIn ? "This account does not teach any course yet. Ask your faculty admin to add you as course staff." : "Sign in with your university staff account to continue."}
            </p>
            <div className="org-row" style={{ marginTop: 14 }}>
              <Link className="org-btn" href="/sso/fue?next=/organizer">Sign in as FUE staff</Link>
              <Link className="org-btn ghost" href="/moeai">Student app</Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="org-page">
      <div className="org-wrap org-wide">
        <section className="org-card">
          <div className="org-head" style={{ flexWrap: "wrap" }}>
            <Logo size={40} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <h1>Tutor page</h1>
              <p>{me.name}{me.org ? ` · ${me.org.orgName}` : ""} · Tutor mode</p>
            </div>
            <Link className="org-btn ghost small" href="/moeai">Student view</Link>
            <button className="org-btn ghost small" onClick={async () => { await api("/api/auth", { method: "POST", json: { action: "logout" } }).catch(() => {}); window.location.href = "/sso"; }}>Sign out</button>
          </div>
          <div className="org-steps" style={{ marginTop: 14 }} aria-label="How MoeAI organizes a course">
            <span>Upload</span><i>→</i><span>Read &amp; split into cited passages</span><i>→</i><span>Embed for search</span><i>→</i>
            <span>Organize the course brain</span><i>→</i><span>Research gaps</span><i>→</i><span>Staff approve</span><i>→</i><span>Students learn</span>
          </div>
        </section>

        <div className="org-grid">
          <aside className="org-card" style={{ alignSelf: "start" }}>
            <div className="org-section">
              <h2>Your courses</h2>
              <div className="org-list" style={{ marginTop: 0 }}>
                {courses.map((c) => (
                  <button key={c.id} className="org-item" onClick={() => setCourseId(c.id)} style={{ cursor: "pointer", borderColor: c.id === courseId ? "rgba(244,63,109,0.6)" : undefined }}>
                    <span style={{ display: "grid" }}>
                      <strong>{c.code}</strong>
                      <span className="org-muted" style={{ margin: 0 }}>{c.title}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="org-section">
              <h2>Activity</h2>
              <div className="org-log" aria-live="polite">
                {log.length ? log.map((l, i) => <div key={i}>{l}</div>) : <div>Nothing yet. Upload a lecture to start.</div>}
              </div>
            </div>
          </aside>

          <section className="org-card" style={{ minWidth: 0 }}>
            <div className="org-row" style={{ justifyContent: "space-between" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>{course?.code} {course?.title}</h2>
                <p className="org-muted">
                  {uploaded.length} files · {uploaded.reduce((n, m) => n + (m.chunk_count ?? 0), 0)} passages
                  {brain?.updated_at ? ` · brain updated ${new Date(brain.updated_at).toLocaleString()}` : " · no brain yet"}
                </p>
              </div>
              <div className="org-tabs" role="tablist">
                {([["materials", "Materials"], ["brain", "MoeAI brain"], ["review", `Review${pending.length ? ` (${pending.length})` : ""}`], ["try", "Try as a student"]] as [Tab, string][]).map(([id, label]) => (
                  <button key={id} role="tab" className="org-tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>
                ))}
              </div>
            </div>
            {busy ? <p className="org-muted" role="status" style={{ marginTop: 10 }}>⏳ {busy}…</p> : null}
            {error ? <p className="org-error" role="alert" style={{ marginTop: 10 }}>{error}</p> : null}

            {tab === "materials" && (
              <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
                <div
                  className={`org-drop${over ? " over" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => input.current?.click()}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") input.current?.click(); }}
                  onDragOver={(e) => { e.preventDefault(); setOver(true); }}
                  onDragLeave={() => setOver(false)}
                  onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) void upload(e.dataTransfer.files); }}
                >
                  <strong style={{ color: "var(--text)" }}>Drop lecture files here</strong> or click to choose
                  <div style={{ marginTop: 4 }}>PDF, PowerPoint (.pptx, speaker notes included), Word (.docx), text · up to 50 MB each</div>
                  <input ref={input} type="file" multiple hidden accept=".pdf,.pptx,.docx,.txt,.md,.csv,.srt,.vtt" onChange={(e) => { if (e.target.files?.length) void upload(e.target.files); e.target.value = ""; }} />
                </div>
                <div className="org-row">
                  <label className="org-muted" style={{ margin: 0 }}>Week (optional)</label>
                  <input className="org-input" style={{ width: 90 }} inputMode="numeric" value={week} onChange={(e) => setWeek(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="e.g. 3" />
                  <span style={{ flex: 1 }} />
                  <button className="org-btn" disabled={!!busy || !uploaded.some((m) => m.status === "ready")} onClick={() => organize(true)}>
                    Organize course with MoeAI
                  </button>
                </div>
                <div className="org-scroll">
                  <table className="org-table">
                    <thead><tr><th>File</th><th>Week</th><th>Status</th><th>Pages</th><th>Passages</th><th /></tr></thead>
                    <tbody>
                      {uploaded.length ? uploaded.map((m) => (
                        <tr key={m.id}>
                          <td><strong>{m.title}</strong>{m.summary ? <div className="org-muted">{m.summary}</div> : null}{m.error ? <div className="org-error">{m.error}</div> : null}</td>
                          <td>{m.week ?? "—"}</td>
                          <td><span className={`org-badge ${STATUS[m.status]?.tone ?? ""}`} style={{ marginInlineStart: 0 }}>{STATUS[m.status]?.label ?? m.status}</span></td>
                          <td>{m.pages ?? "—"}</td>
                          <td>{m.chunk_count ?? "—"}</td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {m.status === "failed" || m.status === "queued" ? <button className="org-btn ghost small" disabled={!!busy} onClick={() => retry(m)}>Retry</button> : null}{" "}
                            <button className="org-btn ghost small" disabled={!!busy} onClick={() => remove(m)} aria-label={`Delete ${m.title}`}>Delete</button>
                          </td>
                        </tr>
                      )) : <tr><td colSpan={6} className="org-muted">No files yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "brain" && <BrainView brain={brain} busy={!!busy} onBuild={() => organize(false)} onResearch={(g) => research(g)} onResearchAll={async () => { setBusy("Researching gaps"); for (const g of list(brain?.gaps)) await research(g, true); setBusy(""); setTab("review"); }} />}

            {tab === "review" && (
              <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                <p className="org-muted">Notes MoeAI researched and wrote to fill gaps in this course. Students only see a note after you approve it.</p>
                {pending.length ? pending.map((m) => (
                  <article key={m.id} className="org-note">
                    <div className="org-row"><strong style={{ flex: 1 }}>{m.title}</strong><span className="org-badge warn">Needs review</span></div>
                    <div className="org-md"><Markdown text={m.summary ?? ""} /></div>
                    <div className="org-row">
                      <button className="org-btn small" onClick={() => approve(m)}>Approve for students</button>
                      <button className="org-btn ghost small" onClick={() => remove(m, "reject")}>Discard</button>
                    </div>
                  </article>
                )) : <p className="org-muted">Nothing waiting for review.</p>}
                {materials.filter((m) => m.kind === "generated" && m.status === "ready").length ? (
                  <div className="org-section">
                    <h2>Approved MoeAI notes</h2>
                    <div className="org-chips">{materials.filter((m) => m.kind === "generated" && m.status === "ready").map((m) => <span key={m.id} className="org-chip">{m.title.replace(/^MoeAI note: /, "")}</span>)}</div>
                  </div>
                ) : null}
              </div>
            )}

            {tab === "try" && course && <TryIt course={course} />}
          </section>
        </div>
      </div>
    </main>
  );
}

function BrainView({ brain, busy, onBuild, onResearch, onResearchAll }: {
  brain: Brain | null; busy: boolean; onBuild: () => void; onResearch: (g: { topic: string; why: string }) => void; onResearchAll: () => void;
}) {
  const [open, setOpen] = useState<number | null>(null);
  if (!brain) {
    return (
      <div style={{ marginTop: 16 }}>
        <p className="org-muted">MoeAI has not organized this course yet. Upload the lectures, then let MoeAI build its brain: the course map, glossary, formulas, the mistakes students will make, practice questions and the gaps it should research.</p>
        <button className="org-btn" style={{ marginTop: 12 }} disabled={busy} onClick={onBuild}>Build the MoeAI brain</button>
      </div>
    );
  }
  return (
    <div style={{ marginTop: 16 }}>
      <div className="org-row"><span style={{ flex: 1 }} /><button className="org-btn ghost small" disabled={busy} onClick={onBuild}>Rebuild from all files</button></div>
      {brain.overview ? <div className="org-section org-md"><h2>Course map</h2><Markdown text={brain.overview} /></div> : null}
      {list(brain.outline).length ? (
        <div className="org-section"><h2>Outline</h2>
          <ol style={{ margin: 0, paddingInlineStart: 20, display: "grid", gap: 6, fontSize: 14 }}>
            {list(brain.outline).map((o, i) => <li key={i}><strong>{o.week ? `Week ${o.week}: ` : ""}{o.topic}</strong>{list(o.subtopics).length ? <span className="org-muted"> · {list(o.subtopics).join(" · ")}</span> : null}</li>)}
          </ol>
        </div>
      ) : null}
      {list(brain.gaps).length ? (
        <div className="org-section"><h2>Gaps MoeAI found</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {list(brain.gaps).map((g, i) => (
              <div key={i} className="org-cite org-row"><span style={{ flex: 1, minWidth: 200 }}><strong>{g.topic}</strong>{g.why}</span><button className="org-btn ghost small" disabled={busy} onClick={() => onResearch(g)}>Research this</button></div>
            ))}
            <div><button className="org-btn small" disabled={busy} onClick={onResearchAll}>Research all gaps</button></div>
          </div>
        </div>
      ) : null}
      {list(brain.formulas).length ? (
        <div className="org-section org-md"><h2>Formulas</h2>
          <Markdown text={list(brain.formulas).map((f) => `**${f.name}**${f.when ? ` · ${f.when}` : ""}\n\n$$${f.latex}$$`).join("\n\n")} />
        </div>
      ) : null}
      {list(brain.mistakes).length ? (
        <div className="org-section"><h2>Mistakes students will make</h2>
          <div style={{ display: "grid", gap: 8 }}>{list(brain.mistakes).map((m, i) => <div key={i} className="org-cite"><strong>{m.mistake}</strong>{m.fix}</div>)}</div>
        </div>
      ) : null}
      {list(brain.glossary).length ? (
        <div className="org-section"><h2>Glossary ({list(brain.glossary).length})</h2>
          <div className="org-scroll"><table className="org-table"><tbody>{list(brain.glossary).map((g, i) => <tr key={i}><td><strong>{g.term}</strong></td><td>{g.definition}{g.source ? <div className="org-muted">{g.source}</div> : null}</td></tr>)}</tbody></table></div>
        </div>
      ) : null}
      {list(brain.practice).length ? (
        <div className="org-section"><h2>Practice questions</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {list(brain.practice).map((p, i) => (
              <div key={i} className="org-cite org-md">
                <Markdown text={`**Q${i + 1}${p.difficulty ? ` (${p.difficulty})` : ""}.** ${p.question}`} />
                {open === i ? <Markdown text={p.answer} /> : <button className="org-btn ghost small" onClick={() => setOpen(i)}>Show answer</button>}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type Citation = { title: string; ref: string; excerpt: string };

/** Ask what a student would ask and see which of your passages MoeAI answers from. */
function TryIt({ course }: { course: Course }) {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [cites, setCites] = useState<Citation[]>([]);
  const [busy, setBusy] = useState(false);
  const suggestions = useMemo(() => (
    /logic/i.test(course.title)
      ? ["Explain how a full adder works using the lecture's notation", "Simplify F = A'B + AB' + AB with a K-map", "What is the difference between a latch and a flip-flop?"]
      : ["How do I solve a separable differential equation?", "Explain the integrating factor method with an example", "When is a first-order ODE exact?"]
  ), [course.title]);

  async function ask(question: string) {
    if (!question.trim()) return;
    setBusy(true); setAnswer(""); setCites([]);
    try {
      const res = await fetch("/api/moeai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ surface: "workspace", messages: [{ role: "user", content: question }], learning: { courseId: course.id, subject: `${course.code} ${course.title}` } }),
      });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error || "MoeAI did not answer.");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.citations) setCites(ev.citations);
          if (ev.delta) setAnswer((a) => a + ev.delta);
          if (ev.error) setAnswer((a) => `${a}\n\n**${ev.error}**`);
        }
      }
    } catch (err) {
      setAnswer(`**${err instanceof Error ? err.message : "MoeAI did not answer."}**`);
    }
    setBusy(false);
  }

  return (
    <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
      <p className="org-muted">Ask what a student would ask. MoeAI answers from this course&apos;s material (including notes awaiting your review, which students cannot see yet) and shows the passages it used.</p>
      <form className="org-row" onSubmit={(e) => { e.preventDefault(); void ask(q); }}>
        <input className="org-input" style={{ flex: 1, minWidth: 200 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about this course…" />
        <button className="org-btn" disabled={busy}>{busy ? "Thinking…" : "Ask"}</button>
      </form>
      <div className="org-chips">{suggestions.map((s) => <button key={s} className="org-chip" style={{ cursor: "pointer", color: "var(--text)" }} onClick={() => { setQ(s); void ask(s); }}>{s}</button>)}</div>
      {cites.length ? (
        <div style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: 13 }}>Answering from</strong>
          {cites.map((c, i) => <div key={i} className="org-cite"><strong>{c.title} · {c.ref}</strong>{c.excerpt}</div>)}
        </div>
      ) : null}
      {answer ? <div className="org-md org-cite"><Markdown text={answer} /></div> : null}
    </div>
  );
}
