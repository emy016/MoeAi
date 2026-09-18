"use client";
/**
 * Room switcher.
 *
 * A room is one course: its material and the people allowed to study it. The
 * same control covers all three situations — a student joining their
 * lecturer's course with a code, a tutor opening a room for their own class,
 * and a solo student with nothing but their own uploads.
 *
 * "Just me" is not a special case in the data, it is the absence of a room:
 * retrieval then falls back to everything the student owns plus the shared
 * curriculum.
 */
import { useCallback, useEffect, useState } from "react";
import { BookOpen, Check, GraduationCap, Plus, ShieldCheck, X } from "lucide-react";

export interface Room {
  id: string;
  title: string;
  subject: string | null;
  org_name: string | null;
  org_verified: boolean;
  role: "teacher" | "student";
  documents: number;
  is_owner: boolean;
}

export type Org = { id: string; name: string };

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [active, setActive] = useState<Room | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [org, setOrg] = useState<Org | null>(null);
  const [justJoined, setJustJoined] = useState<Org | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setSignedIn(Boolean(json.signedIn));
      setRooms(json.rooms ?? []);
      setOrg(json.verifiedOrg ?? null);
      if (json.joinedOrg) setJustJoined(json.joinedOrg);
      // Keep the current selection if it survived the refresh.
      setActive((current) =>
        current ? (json.rooms ?? []).find((r: Room) => r.id === current.id) ?? null : null,
      );
    } catch {
      // Rooms are an enhancement: the workspace still works without them.
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { rooms, active, setActive, signedIn, org, justJoined, clearJoined: () => setJustJoined(null), reload: load };
}

export function RoomSwitcher({
  rooms, active, onSelect, signedIn, onChanged, notify, intent, onIntentHandled,
}: {
  rooms: Room[];
  active: Room | null;
  onSelect: (room: Room | null) => void;
  signedIn: boolean;
  onChanged: () => void;
  notify: (message: string) => void;
  /** Set by the welcome card, so picking a role opens the matching form. */
  intent?: "join" | "create" | null;
  onIntentHandled?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"list" | "join" | "create">("list");

  useEffect(() => {
    if (!intent) return;
    setMode(intent);
    setOpen(true);
    onIntentHandled?.();
  }, [intent, onIntentHandled]);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not join.");
      notify(`Joined ${json.room.title}.`);
      setCode(""); setMode("list"); onChanged();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not join.");
    } finally { setBusy(false); }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subject }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not create.");
      notify(json.room.join_code
        ? `Room created. Share the code ${json.room.join_code} with your students.`
        : "Room created.");
      setTitle(""); setSubject(""); setMode("list"); onChanged();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not create.");
    } finally { setBusy(false); }
  }

  if (!signedIn) return null;

  return (
    <div className="mx-rooms">
      <button className="mx-room-trigger" onClick={() => setOpen(!open)} aria-expanded={open}>
        {active ? <BookOpen size={15} /> : <GraduationCap size={15} />}
        <span>
          <strong>{active ? active.title : "Just me"}</strong>
          <small>
            {active
              ? `${active.documents} material${active.documents === 1 ? "" : "s"}${active.role === "teacher" ? " · you teach this" : ""}`
              : "Your own uploads + shared curriculum"}
          </small>
        </span>
      </button>

      {open && (
        <div className="mx-room-panel">
          {mode === "list" && (
            <>
              <button className="mx-room-item" onClick={() => { onSelect(null); setOpen(false); }}>
                <GraduationCap size={14} />
                <span>Just me</span>
                {!active && <Check size={14} />}
              </button>

              {rooms.map((room) => (
                <button key={room.id} className="mx-room-item"
                        onClick={() => { onSelect(room); setOpen(false); }}>
                  <BookOpen size={14} />
                  <span>
                    {room.title}
                    {room.org_verified && <ShieldCheck size={12} aria-label="Verified organisation" />}
                    <small>{room.org_name ?? (room.role === "teacher" ? "Your room" : "Private tutor")}</small>
                  </span>
                  {active?.id === room.id && <Check size={14} />}
                </button>
              ))}

              {rooms.length === 0 && (
                <p className="mx-room-empty">
                  No courses yet. Join one with a code from your lecturer, or open your own.
                </p>
              )}

              <div className="mx-room-actions">
                <button onClick={() => setMode("join")}><Plus size={13} /> Join with a code</button>
                <button onClick={() => setMode("create")}><GraduationCap size={13} /> I&rsquo;m teaching</button>
              </div>
            </>
          )}

          {mode === "join" && (
            <form className="mx-room-form" onSubmit={join}>
              <header><strong>Join a course</strong>
                <button type="button" onClick={() => setMode("list")} aria-label="Back"><X size={14} /></button></header>
              <label>Your lecturer&rsquo;s code
                <input value={code} onChange={(e) => setCode(e.target.value)}
                       placeholder="ABC-123" autoCapitalize="characters" maxLength={9} />
              </label>
              <button className="mx-room-submit" disabled={busy || code.trim().length < 6}>
                {busy ? "Joining…" : "Join"}
              </button>
            </form>
          )}

          {mode === "create" && (
            <form className="mx-room-form" onSubmit={create}>
              <header><strong>Open a room</strong>
                <button type="button" onClick={() => setMode("list")} aria-label="Back"><X size={14} /></button></header>
              <label>Course name
                <input value={title} onChange={(e) => setTitle(e.target.value)}
                       placeholder="Discrete Mathematics" maxLength={120} />
              </label>
              <label>Code or subject <span>optional</span>
                <input value={subject} onChange={(e) => setSubject(e.target.value)}
                       placeholder="MA102" maxLength={60} />
              </label>
              <p className="mx-room-hint">
                You get a join code to share. Upload your lectures once and every
                student in the room gets a tutor that knows them.
              </p>
              <button className="mx-room-submit" disabled={busy || !title.trim()}>
                {busy ? "Creating…" : "Create room"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}


/**
 * Server-side nudges.
 *
 * The workspace already suggests things from what it can see on this device —
 * an exam in the calendar, a weak topic in local attempts. This adds what only
 * the account knows: misconceptions recorded from quizzes, material published
 * in a room and never opened, a stretch of days away.
 */
export interface Nudge {
  id: string;
  kind: string;
  body: string;
  action_url: string | null;
}

export function useNudges() {
  const [nudges, setNudges] = useState<Nudge[]>([]);

  useEffect(() => {
    fetch("/api/nudges", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { nudges: [] }))
      .then((j) => setNudges(j.nudges ?? []))
      .catch(() => {});
  }, []);

  const dismiss = useCallback((id: string) => {
    setNudges((list) => list.filter((n) => n.id !== id));
    fetch("/api/nudges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }, []);

  return { nudges, dismiss };
}
