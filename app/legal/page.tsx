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
        <p>Last updated: September 2026 · version 2026-09. When you create an account you accept this version; if it changes, you will be asked again.</p>
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
        <p>
          <strong>Your account.</strong> One account per person. Keep your password
          and any sign-in method you connect (Google, Apple) to yourself; you can turn
          on two-step verification in Account settings.
        </p>
        <p>
          <strong>Organizations.</strong> If you use MoeAI through a university, school
          or other organization, that organization decides who is a member and can
          suspend or remove your membership there; your personal account stays yours.
          Whoever creates an organization is its owner and is responsible for inviting
          only people who belong to it.
        </p>
        <p>
          <strong>Plans.</strong> MoeAI currently offers a Free plan. Paid plans are
          listed but not yet available, and nothing is charged. Prices and terms for
          paid plans will be published here before they can be bought.
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
          <li>Your account: email, display name, handle, and optionally a phone number; which sign-in methods you connected; your university, faculty and year.</li>
          <li>Which organizations you belong to, your role there and whether your membership is active.</li>
          <li>Which version of these terms and this policy you accepted, and when.</li>
          <li>A security log of sign-ins and account changes (never your password, codes or tokens), so you can spot anything you did not do.</li>
          <li>Thumbs up or down you give an answer. In a university course, that course&rsquo;s staff can see it, to fix where MoeAI falls short on their material.</li>
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
          <strong>Dictation.</strong> Speech to text uses the speech recognition
          built into your browser or phone. MoeAI receives only the text. Some browsers
          (for example Chrome) send audio to their own speech service to transcribe it;
          that is governed by the browser&rsquo;s terms.
        </p>
        <p>
          <strong>Your rights:</strong> you can view and delete everything MoeAI
          remembers about you from your dashboard; download everything we store about
          you as a file from Account settings; and delete your account there, which
          removes your profile, conversations, memory and progress. Content that belongs
          to an organization (for example lectures its staff uploaded) stays with that
          organization.
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

      <section className="card" id="licenses">
        <h2>Open-source licenses</h2>
        <p>EduMoe and MoeAI are built on open-source work. With thanks to:</p>
        <ul>
          <li>Next.js, React, React Native and Expo (MIT)</li>
          <li>Supabase client libraries (MIT)</li>
          <li>KaTeX, Mermaid, highlight.js (MIT, MIT, BSD-3-Clause)</li>
          <li>math.js and pdf.js (Apache-2.0)</li>
          <li>Heroicons (MIT) and Lucide (ISC)</li>
          <li>Nunito Sans and Inter fonts (SIL Open Font License 1.1)</li>
          <li>Twemoji graphics (CC BY 4.0)</li>
          <li>PhET Interactive Simulations, University of Colorado Boulder (CC BY 4.0), shown from PhET&rsquo;s own site</li>
        </ul>
      </section>
    </div>
  );
}
