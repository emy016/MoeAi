"use client";
import { useState } from "react";
import { ArrowUpRight, BadgeCheck, Building2, GraduationCap, KeyRound, UserRound, X } from "lucide-react";
import type { Org } from "./rooms";

/**
 * Who is this, and what do they need next?
 *
 * The three products share one object — a room — so the difference between a
 * professor, a private tutor and a solo student is entirely about what they
 * should do first. A professor needs to make a room and get a code out of it;
 * a student needs to get into one; someone with no course at all needs to know
 * the tutor works anyway.
 *
 * Shown only when signed in with no rooms yet, and dismissible, because the
 * second time you open MoeAI this is in the way.
 */
type Role = "student" | "teacher" | "organisation";

const ROLES: { id: Role; label: string; blurb: string; icon: typeof UserRound }[] = [
  { id: "student", label: "I'm a student", blurb: "Join a course, or study your own material", icon: UserRound },
  { id: "teacher", label: "I'm teaching", blurb: "Upload a course once, your students get a tutor that knows it", icon: GraduationCap },
  { id: "organisation", label: "We're an institution", blurb: "Verified sign-in for everyone with a university address", icon: Building2 },
];

export function Onboarding({
  org, onJoin, onCreate, onDismiss,
}: {
  org: Org | null;
  onJoin: () => void;
  onCreate: () => void;
  onDismiss: () => void;
}) {
  const [role, setRole] = useState<Role | null>(null);

  return (
    <section className="mx-onboarding">
      <button className="mx-icon mx-onboarding-close" aria-label="Dismiss this" onClick={onDismiss}><X size={16}/></button>
      {org && (
        <p className="mx-onboarding-verified">
          <BadgeCheck size={14}/> Signed in through <strong>{org.name}</strong>. Courses shared inside it are open to you.
        </p>
      )}
      <span className="mx-eyebrow">FIRST TIME HERE</span>
      <h2>Who are you here as?</h2>
      <p className="mx-muted">MoeAI works the same for everyone. What changes is where the material comes from.</p>

      <div className="mx-onboarding-roles" role="radiogroup" aria-label="Your role">
        {ROLES.map(item => (
          <button
            key={item.id}
            role="radio"
            aria-checked={role === item.id}
            className={role === item.id ? "active" : ""}
            onClick={() => setRole(item.id)}
          >
            <item.icon size={19}/>
            <strong>{item.label}</strong>
            <span>{item.blurb}</span>
          </button>
        ))}
      </div>

      {role === "student" && (
        <div className="mx-onboarding-next">
          <p>Your lecturer gives you a six-character code, like <code>ABC-123</code>. Enter it once and their material is part of every answer.</p>
          <div className="mx-inline">
            <button className="mx-primary" onClick={onJoin}><KeyRound size={15}/> Join with a code</button>
            <button className="mx-secondary" onClick={onDismiss}>No course yet — just study <ArrowUpRight size={14}/></button>
          </div>
          <small>No code and no course? Add your own PDFs and notes in Library, and MoeAI answers from those.</small>
        </div>
      )}

      {role === "teacher" && (
        <div className="mx-onboarding-next">
          <p>Make a room for the course, upload the lectures once, and share the code with your students. They get a tutor that answers from <em>your</em> material, and quotes the passage it used.</p>
          <div className="mx-inline">
            <button className="mx-primary" onClick={onCreate}><GraduationCap size={15}/> Create a course room</button>
          </div>
          <small>You stay the owner. Students can read the material through the tutor; they cannot download your room or see each other&rsquo;s conversations.</small>
        </div>
      )}

      {role === "organisation" && (
        <div className="mx-onboarding-next">
          <p>
            A verified institution gets one thing its staff and students cannot get alone: anyone signing in with an address at its
            domain is recognised automatically — no codes, no invitations. Future University in Egypt is the first.
          </p>
          <div className="mx-inline">
            <a className="mx-primary" href="mailto:islamsharawy7@gmail.com?subject=EduMoe%20—%20verifying%20our%20institution">
              Ask about verification <ArrowUpRight size={14}/>
            </a>
            <button className="mx-secondary" onClick={onCreate}>Start with one course room</button>
          </div>
          <small>Verification is manual on purpose: it decides who is trusted to publish material to a whole university.</small>
        </div>
      )}
    </section>
  );
}
