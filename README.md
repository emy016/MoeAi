# EduMoe · MoeAI

**EduMoe** is a free learning platform for Egyptian university students.
**MoeAI** is its tutor: curriculum-aware, multilingual, and persistent.

- Live: https://moe-ai-sable.vercel.app
- Users today: ~230 first-year CS students, via `t.me/CS_Epic_Save`

---

## How it is put together

Two halves, deliberately built differently, because they are different things.

**The EduMoe pages are plain HTML.** `public/*.html` — no React, no hydration,
no framework on the page at all. They load instantly and the liquid-glass blur
stays smooth because nothing is fighting the compositor for the main thread.
Each page carries its own `<style>` and `<script>`. That is the point; do not
"modernise" them into components.

**MoeAI is a React app.** `/moeai` is a real workspace: conversations, a
library you can drop PDFs into, a study planner, a tool panel, modes, and
per-device settings. It needs state, so it gets a framework.

Next.js hosts both. Clean URLs for the HTML are declared in `next.config.ts`
rather than left to Vercel's `cleanUrls`, so `npm run start` behaves exactly
like production and `/` resolves without an `app/page.tsx`.

---

## Where things live

```
public/*.html            The EduMoe pages. The design. Edit these directly.
public/vendor/           pdf.js worker, for library imports
app/moeai/               The MoeAI workspace route
components/moeai/        Its UI: workspace, library, planner, tools, markdown
lib/moeai/
  personality.md         MoeAI's voice — 36 sections, tuned on real students
  brain.ts               Prompt assembly, provider fallback, streaming
  context.ts             Modes and the user-controlled context block
  workspace.ts           Client-side workspace types and storage
lib/
  language.ts            Arabic / Franco / English detection, per message
  chunk.ts               Paragraph-aligned chunking, PDF + subtitle extraction
  memory.ts              Durable notes about a student, on a cadence
  providers.ts           Non-streaming provider chain, key rotation
  ratelimit.ts           Per-user hourly cap, in Postgres
  supabase-browser.ts    Browser client (RLS)
  supabase-server.ts     Server + service-role clients (server-only)
prompts/                 Behaviour specs. SECURITY.md is loaded at runtime.
app/api/                 moeai, library, quiz, memory, state, ranked,
                         dashboard, auth, conversations, cron
supabase/schema.sql      Every table, every RLS policy, one file
scripts/                 relink-nav, extract-lessons, check-language
docs/                    ARCHITECTURE, DEPLOY, PITCH, LAUNCH-CHECKLIST
```

---

## Running it

```bash
npm install
cp .env.example .env.local     # fill in the values
npm run dev
```

Checks worth running before you push:

```bash
npm run build            # strict TypeScript
npm run check:language   # the language detector's regression cases
```

---

## How a question is answered

1. `POST /api/moeai` — same-origin only, since this endpoint spends money.
2. Signing in is **optional**. The workspace is designed to work on one device
   with nothing stored server-side. Signing in adds what needs an account.
3. Limits: an hourly counter in Postgres when signed in, a per-IP bucket when
   not.
4. `search_material()` retrieves from the shared curriculum *and* the student's
   own library, in one RLS-scoped query. Their workspace uploads already
   arrived in the request.
5. `student_memory` — what past work showed, above all the misconceptions
   quizzes recorded.
6. `detectLanguage` picks the reply language from *this* message.
7. `streamReply` walks the providers, never concatenating two of their answers,
   and streams NDJSON the workspace parses.
8. On close: the call is logged, and every fourth substantial exchange is mined
   for durable notes.

---

## Security posture

- RLS on every table. A student cannot read another student's anything.
- Provider keys are read only inside `app/api/`, never shipped to the browser.
- Retrieved material and stored memory are fenced in the prompt as *data*.
- `prompts/SECURITY.md` is loaded into the system prompt at runtime.
- Same-origin check, per-user and per-IP limits.

---

## Status

**Working:** the HTML platform, the MoeAI workspace, streaming answers with
curriculum grounding, Library Mode, quizzes that feed misconceptions back,
cross-device state, a shared ranked ladder, auth, legal pages, SEO surface.

**Untested end to end:** everything downstream of a live model call and every
signed-in HTTP path — the development sandbox blocks outbound calls to both the
AI providers and `*.supabase.co`. Walk step 5 of `docs/DEPLOY.md` after
deploying.

**Not built:** lecture videos (the courses page has no player yet), simulators,
the rotating 3D book, the mobile client.
