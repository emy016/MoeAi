import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms, Privacy and Cookies",
  description: "How EduMoe handles your data, what you agree to by using it, and what we store.",
  alternates: { canonical: "/legal" },
};

/**
 * NOTE: this is a plain-language starting point written by the team, not legal
 * advice, and it has not been reviewed by a lawyer. Have it reviewed before
 * onboarding any institution. Egypt's Personal Data Protection Law
 * (Law 151 of 2020) is the governing regime.
 */
export default function Legal() {
  return (
    <div className="stack">
      <section className="card" id="terms">
        <h1>Terms of Service</h1>
        <p>Last updated: September 2026.</p>
        <p>
          EduMoe is a free educational platform. By using it you agree to use it for
          learning, not to submit its output as your own graded work. MoeAI is a tutor:
          it explains, questions and corrects. Passing its answers off as your own may
          breach your university&rsquo;s academic-integrity rules, and that is your
          responsibility, not ours.
        </p>
        <p>
          MoeAI can be wrong. It is grounded in uploaded course material where that
          material exists, but it is a language model and you should verify anything
          that matters against your lecture notes and your instructor.
        </p>
        <p>
          We may rate-limit or suspend accounts that abuse the service, attempt to
          extract the system configuration, or attack the infrastructure.
        </p>
      </section>

      <section className="card" id="privacy">
        <h2>Privacy Policy</h2>
        <p>
          We process personal data under Egypt&rsquo;s Personal Data Protection Law
          (Law 151 of 2020). We collect the minimum needed to run a tutor that remembers
          you.
        </p>
        <p><strong>What we store:</strong></p>
        <ul>
          <li>Your account: email, display name, university, faculty, year.</li>
          <li>Your conversations with MoeAI, so it has context next time.</li>
          <li>
            Study notes MoeAI derives about you — topics you struggled with, stated
            preferences, goals.
          </li>
          <li>Progress through lessons and quizzes.</li>
          <li>
            Technical logs of each AI call: which provider answered, how long it took,
            roughly how many tokens. These exist for cost control and debugging.
          </li>
        </ul>
        <p><strong>What we do not do:</strong> we do not sell your data, we do not
          show you advertising, and we do not use your conversations to train models.</p>
        <p>
          Your messages are sent to third-party model providers (Google, Groq,
          OpenRouter) to generate a reply. Their handling is governed by their own terms.
        </p>
        <p>
          <strong>Your rights:</strong> you can view and delete everything MoeAI
          remembers about you from your dashboard, and you can delete your account,
          which removes your conversations and memory.
        </p>
        <p>
          If you are under 18, use EduMoe with the awareness of a parent or guardian.
        </p>
      </section>

      <section className="card" id="cookies">
        <h2>Cookies</h2>
        <p>
          We use one category of cookie: the session cookie that keeps you signed in.
          It is strictly necessary for the service to work, so there is nothing here to
          opt out of without also signing out.
        </p>
        <p>
          We do not use advertising or cross-site tracking cookies. If we ever add
          product analytics, this page will say so before it ships and consent will be
          asked for.
        </p>
      </section>
    </div>
  );
}
