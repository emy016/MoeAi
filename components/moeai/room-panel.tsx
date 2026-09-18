"use client";
/**
 * The course view.
 *
 * The device library holds what a student gathers for themselves. This holds
 * what their lecturer published, which is a different thing: it lives on the
 * server, everyone in the room sees the same list, and only a teacher can add
 * to it.
 *
 * Students see the reading list and can ask about any of it. Teachers get the
 * upload control and the join code to hand out.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Copy, FileText, ShieldCheck, Upload, Users } from "lucide-react";
import type { Room } from "./rooms";

interface RoomDoc {
  id: string;
  title: string;
  source_kind: string;
  char_count: number;
  created_at: string;
}

export function RoomPanel({
  room, onAsk, notify,
}: {
  room: Room;
  onAsk: (prompt: string) => void;
  notify: (message: string) => void;
}) {
  const [docs, setDocs] = useState<RoomDoc[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const upload = useRef<HTMLInputElement>(null);
  const isTeacher = room.role === "teacher";

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/library?room=${room.id}`, { cache: "no-store" });
      if (!res.ok) { setDocs([]); return; }
      setDocs((await res.json()).documents ?? []);
    } catch { setDocs([]); }
  }, [room.id]);

  useEffect(() => { setDocs(null); load(); }, [load]);

  useEffect(() => {
    if (!isTeacher) return;
    // The code is only shown to the teacher, so it is fetched separately
    // rather than shipped in every room listing.
    fetch("/api/rooms", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setJoinCode(j?.rooms?.find((r: { id: string }) => r.id === room.id)?.join_code ?? null))
      .catch(() => {});
  }, [room.id, isTeacher]);

  async function publish(list: FileList) {
    if (!list.length) return;
    setBusy(true);
    let added = 0;
    try {
      for (const file of Array.from(list).slice(0, 8)) {
        const form = new FormData();
        form.append("file", file);
        form.append("roomId", room.id);
        const res = await fetch("/api/library", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `${file.name} could not be read.`);
        added++;
      }
      notify(`${added} item${added === 1 ? "" : "s"} published. Everyone in the room can ask about it now.`);
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Upload failed.");
    } finally { setBusy(false); }
  }

  return (
    <section className="mx-room-view">
      <div className="mx-view-title">
        <div>
          <span className="mx-eyebrow">
            {room.org_name ?? (isTeacher ? "YOUR ROOM" : "YOUR COURSE")}
            {room.org_verified && <ShieldCheck size={12} />}
          </span>
          <h1>{room.title}</h1>
          <p>
            {isTeacher
              ? "Publish your lectures once. Every student in this room gets a tutor that has read them."
              : "Everything your lecturer has published. Ask Moe about any of it."}
          </p>
        </div>
        {isTeacher && (
          <button className="mx-primary" onClick={() => upload.current?.click()} disabled={busy}>
            <Upload size={16} />{busy ? "Publishing…" : "Publish material"}
          </button>
        )}
      </div>

      <input
        hidden ref={upload} type="file" multiple
        accept=".pdf,.md,.txt,.csv,.srt,.vtt"
        onChange={(e) => { if (e.target.files) publish(e.target.files); e.target.value = ""; }}
      />

      {isTeacher && joinCode && (
        <div className="mx-join-card">
          <div>
            <span className="mx-eyebrow">STUDENTS JOIN WITH</span>
            <strong>{joinCode}</strong>
          </div>
          <button
            className="mx-secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(joinCode);
                notify("Code copied. Read it out or paste it in your group.");
              } catch {
                notify("Clipboard unavailable — the code is on screen.");
              }
            }}
          >
            <Copy size={14} /> Copy
          </button>
        </div>
      )}

      {docs === null && <p className="mx-collection-note">Loading the reading list…</p>}

      {docs?.length === 0 && (
        <div className="mx-library-empty">
          <FileText size={34} />
          <h2>{isTeacher ? "Nothing published yet." : "Your lecturer hasn't added material yet."}</h2>
          <p>
            {isTeacher
              ? "Add a PDF, your notes, or subtitles exported from a recorded lecture. Moe indexes it and cites the part it used."
              : "You can still ask Moe anything — it will answer from general knowledge and say so."}
          </p>
          {isTeacher && (
            <button className="mx-secondary" onClick={() => upload.current?.click()}>
              <Upload size={15} /> Publish the first lecture
            </button>
          )}
        </div>
      )}

      {docs && docs.length > 0 && (
        <div className="mx-source-list">
          {docs.map((doc) => (
            <div className="mx-source-row" key={doc.id}>
              <span className="mx-source-check"><FileText size={18} /></span>
              <button
                className="mx-source-title"
                onClick={() => onAsk(`Explain the key ideas in "${doc.title}" from my course material.`)}
              >
                <strong>{doc.title}</strong>
                <span>
                  {doc.source_kind.toUpperCase()} · {Math.max(1, Math.round(doc.char_count / 1000))}k characters · indexed
                </span>
              </button>
              <button
                className="mx-icon"
                aria-label={`Ask about ${doc.title}`}
                onClick={() => onAsk(`Quiz me on "${doc.title}". One question at a time.`)}
              >
                <ArrowUpRight size={17} />
              </button>
            </div>
          ))}
        </div>
      )}

      {docs && docs.length > 0 && (
        <div className="mx-library-dock">
          <span><Check size={16} /> {docs.length} item{docs.length === 1 ? "" : "s"} · Moe has read {docs.length === 1 ? "it" : "them all"}</span>
          <button className="mx-primary" onClick={() => onAsk("Give me a study plan for this course based on the material.")}>
            Plan my revision <ArrowUpRight size={16} />
          </button>
        </div>
      )}

      {!isTeacher && (
        <p className="mx-collection-note">
          <Users size={13} /> Shared with everyone in this room. Your own chats and notes stay private to you.
        </p>
      )}
    </section>
  );
}
