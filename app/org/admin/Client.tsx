"use client";
/**
 * Organization admin dashboard. Everything shown and every action is checked
 * by the database (owner-only functions and RLS); this page only renders what
 * /api/org/admin returns, so someone who is not an owner simply sees nothing.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Copy, MailPlus, Users } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

type Org = { id: string; name: string; slug: string; type: string | null; verified: boolean; status: string; sso_provider: string | null; email_domain: string | null };
type Member = { user_id: string; display_name: string | null; handle: string | null; role: string; status: string; joined_at: string };
type Invite = { id: string; email: string; role: string; status: string; expires_at: string };
type Sub = { plan_id: string; status: string; plans: { name: string; price_minor: number | null; currency: string | null; seat_limit: number | null } | null } | null;
type Data = { orgs: Org[]; org: Org | null; roster: Member[]; invitations: Invite[]; subscription: Sub; courses: { id: string; code: string; title: string }[] };

async function call(url: string, body?: unknown) {
  const res = await fetch(url, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export default function Client() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [orgId, setOrgId] = useState("");
  const [invite, setInvite] = useState({ email: "", role: "student" });
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const load = useCallback(async (id = orgId) => {
    try { setData(await call(`/api/org/admin${id ? `?org=${id}` : ""}`)); setError(""); } catch (e) { setError((e as Error).message); }
  }, [orgId]);
  useEffect(() => { void load(); }, [load]);

  if (error) return <main className="org-page"><div className="org-wrap"><section className="org-card"><p className="org-error">{error}</p><button className="org-btn" onClick={() => load()}>Try again</button></section></div></main>;
  if (!data) return <main className="org-page"><div className="org-wrap"><section className="org-card"><div className="org-row" role="status"><span className="st-spinner" /> Loading your organization…</div></section></div></main>;
  if (!data.org) {
    return (
      <main className="org-page"><div className="org-wrap"><section className="org-card st-card">
        <div className="org-head"><Logo size={40} /><div><h1>No organization to manage</h1><p>You are not an owner of any organization.</p></div></div>
        <div className="org-form"><Link className="org-btn" href="/start/organization">Start an organization</Link><Link className="org-btn ghost" href="/moeai">Back to MoeAI</Link></div>
      </section></div></main>
    );
  }
  const org = data.org;
  const active = data.roster.filter((m) => m.status === "active").length;
  const plan = data.subscription?.plans;
  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault(); setNote(""); setLink("");
    try { const r = await call("/api/org/admin", { action: "invite", orgId: org.id, ...invite }); setLink(r.link); setInvite({ email: "", role: "student" }); void load(); } catch (err) { setNote((err as Error).message); }
  };
  const setStatus = async (m: Member, status: string) => {
    try { await call("/api/org/admin", { action: "status", orgId: org.id, userId: m.user_id, status }); void load(); } catch (err) { setNote((err as Error).message); }
  };
  const revoke = async (i: Invite) => {
    try { await call("/api/org/admin", { action: "revoke", orgId: org.id, id: i.id }); void load(); } catch (err) { setNote((err as Error).message); }
  };
  return (
    <main className="org-page">
      <div className="org-wrap st-wide">
        <div className="org-head" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          <div className="org-head"><Logo size={40} /><div><h1>{org.name}</h1><p>Organization admin · <span className={`org-badge ${org.verified ? "live" : "warn"}`}>{org.verified ? "Verified" : "Awaiting verification"}</span></p></div></div>
          <div className="org-row">
            {data.orgs.length > 1 ? (
              <select className="org-select" value={org.id} onChange={(e) => { setOrgId(e.target.value); void load(e.target.value); }} aria-label="Organization">
                {data.orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            ) : null}
            <Link className="org-btn ghost small" href="/organizer">Organizer</Link>
            <Link className="org-btn ghost small" href="/account">Account</Link>
          </div>
        </div>

        <div className="st-kpis">
          <div className="st-kpi"><b>{active}</b><span>Active members</span></div>
          <div className="st-kpi"><b>{data.invitations.filter((i) => i.status === "pending").length}</b><span>Pending invitations</span></div>
          <div className="st-kpi"><b>{data.courses.length}</b><span>Courses</span></div>
          <div className="st-kpi"><b>{plan?.name ?? "—"}</b><span>Plan{data.subscription ? ` · ${data.subscription.status}` : ""}{plan?.seat_limit != null ? ` · ${plan.seat_limit} seats` : ""}</span></div>
        </div>

        {!org.verified ? (
          <p className="st-status warn">Until MoeAI verifies {org.name}, it does not appear in organization search and nobody joins it automatically by email domain. Invitations work now.</p>
        ) : null}

        <div className="org-grid">
          <section className="org-card">
            <div className="org-section">
              <h2><MailPlus size={15} aria-hidden="true" /> Invite someone</h2>
              <form className="org-form" onSubmit={sendInvite} style={{ marginTop: 8 }}>
                <label className="st-field">Email<input className="org-input" type="email" required value={invite.email} onChange={(e) => setInvite((s) => ({ ...s, email: e.target.value }))} /></label>
                <label className="st-field">Role
                  <select className="org-select" value={invite.role} onChange={(e) => setInvite((s) => ({ ...s, role: e.target.value }))}>
                    <option value="student">Student</option><option value="teacher">Teacher / TA</option>
                  </select>
                </label>
                <button className="org-btn small" type="submit">Create invitation</button>
              </form>
              {link ? (
                <div className="org-form">
                  <p className="st-hint">Send this link to them. It works once, only for that email address, and expires in 14 days.</p>
                  <div className="st-copy"><code>{link}</code><button className="org-btn ghost small" onClick={() => navigator.clipboard.writeText(link).then(() => setNote("Copied."))}><Copy size={14} aria-hidden="true" /> Copy</button></div>
                </div>
              ) : null}
              {note ? <p className="st-status" role="status" style={{ marginTop: 10 }}>{note}</p> : null}
            </div>
            <div className="org-section">
              <h2>Invitations</h2>
              {data.invitations.length ? data.invitations.map((i) => (
                <div key={i.id} className="org-item" style={{ marginTop: 6 }}>
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{i.email}</span>
                  <span className={`org-badge ${i.status === "accepted" ? "live" : i.status === "pending" ? "warn" : ""}`}>{i.status}</span>
                  {i.status === "pending" ? <button className="org-btn ghost small" onClick={() => revoke(i)}>Revoke</button> : null}
                </div>
              )) : <p className="org-muted">None yet.</p>}
            </div>
          </section>

          <section className="org-card">
            <div className="org-section">
              <h2><Users size={15} aria-hidden="true" /> Members</h2>
              <div className="org-scroll">
                <table className="org-table">
                  <thead><tr><th>Name</th><th>Role</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {data.roster.map((m) => (
                      <tr key={m.user_id}>
                        <td>{m.display_name || "Member"}{m.handle ? <div className="org-muted">@{m.handle}</div> : null}</td>
                        <td>{m.role}</td>
                        <td><span className={`org-badge ${m.status === "active" ? "live" : m.status === "suspended" ? "warn" : "bad"}`}>{m.status}</span></td>
                        <td>{m.role !== "owner" ? (m.status === "active"
                          ? <button className="org-btn ghost small" onClick={() => setStatus(m, "suspended")}>Suspend</button>
                          : <button className="org-btn ghost small" onClick={() => setStatus(m, "active")}>Reactivate</button>) : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="org-section">
              <h2><Building2 size={15} aria-hidden="true" /> Details</h2>
              <p className="org-muted">Type: {org.type ?? "—"} · Domain: {org.email_domain ?? "—"} · Single sign-on: {org.sso_provider === "demo" ? "MoeAI demo sign-in" : org.sso_provider ? org.sso_provider.toUpperCase() : "not connected"}</p>
              <p className="org-muted">Connecting your identity provider (SAML) is done with MoeAI support; until then, members join by invitation.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
