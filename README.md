# MoeAi

**EduMoe** is a free educational platform for Egyptian university students.
**MoeAI** is its tutor: curriculum-aware, multilingual, and persistent.

One repository. One deployment. One database. MoeAI is a surface inside EduMoe,
not a second product.

- Live: `moe-ai.vercel.app`
- Users today: ~230 first-year CS students at FUE, via `t.me/CS_Epic_Save`

---

## Why this is not a ChatGPT wrapper

Three layers, in the order they matter:

| Layer | What it is | Where it lives |
|---|---|---|
| **Student model** | Misconceptions, preferences, goals, progress | `student_memory`, `progress` |
| **Curriculum** | The student's actual lectures, retrieved per question | `lessons` + `search_lessons()` |
| **Language** | Per-message Arabic / Franco / English detection, enforced | `lib/language.ts` |

The model underneath is replaceable. These three are the product.

---

## Stack

| Concern | Choice | Why not the alternative |
|---|---|---|
| Framework | Next.js 15 App Router | One repo for pages and API. No separate server to run. |
| Language | TypeScript, `strict: true` | The build fails before students do. |
| Styling | Plain CSS + `styled-jsx` | Tailwind would mean rewriting the existing glass design. |
| Database / Auth / Storage | Supabase | Postgres with RLS. No backend to operate. |
| Retrieval | Postgres full-text search | pgvector only once FTS demonstrably fails. |
| Models | Gemini → Groq → OpenRouter, direct `fetch` | No AI SDK. Three fetch calls, two share a shape. |
| Hosting | Vercel | Static, serverless, and cron in one place. |

Explicitly **not** installed: Tailwind, shadcn, Zod, Prisma, Drizzle, React Query,
LangChain, any AI SDK, any vector database. Each was considered and rejected;
see `docs/ARCHITECTURE.md`.

---

## Structure

```
app/
  page.tsx              homepage
  moeai/                the tutor chat — streaming, sidebar, source chips
  library/              Library Mode: upload your own material
  quizzes/              questions generated from your material
  dashboard/            real stats, nudges, everything MoeAI remembers
  courses/              DB-backed course list with YouTube embeds
  login/ legal/ about/ ranked/ simulators/
  not-found.tsx  robots.ts  sitemap.ts  manifest.ts
  api/
    moeai/              the tutor endpoint — the ONLY place API keys are read
    library/            upload, list, delete documents
    quiz/               generate; quiz/attempt/ to take and grade
    conversations/      chat list and history
    memory/             read / write / delete the student model
    cron/               daily proactive nudges
components/             Nav, BottomBar, SetupNotice
lib/
  env.ts                config, tolerant of missing vars
  supabase-browser.ts   browser client (RLS)
  supabase-server.ts    server + service-role clients (server-only)
  language.ts           Arabic + Franco detection, directive, output validation
  chunk.ts              paragraph-aligned chunking, PDF/subtitle extraction
  prompt.ts             prompt assembly under a token budget
  providers.ts          provider chain, multi-key rotation, streaming
  memory.ts             durable-note extraction, on a cadence
  ratelimit.ts          per-user hourly cap
prompts/                RUNTIME, AI_POLICY, SECURITY, TUTORING, MEMORY,
                        PERSONALITY, TOOLS  — MoeAI's actual behaviour
supabase/schema.sql     every table, every RLS policy, one file
docs/                   ARCHITECTURE, DEPLOY, PITCH, LAUNCH-CHECKLIST
```

`prompts/` is the most valuable directory here. It was tuned against real
students. Edit it carefully.

---

## Running it

```bash
npm install
cp .env.example .env.local     # fill in the values
npm run dev
```

Two checks worth running before you push:

```bash
npm run build            # strict TypeScript; catches most AI-generated slips
npm run check:language   # the language detector's regression cases
```

Then paste `supabase/schema.sql` into the Supabase SQL editor and run it once.

Each provider variable takes a **comma-separated list** of keys. The runtime
rotates through them and benches any key that returns 429 for a minute:

```
GEMINI_API_KEYS=key1,key2,key3
```

---

## How a question is answered

1. `proxy.ts` refreshes the session cookie on every request.
2. `POST /api/moeai` identifies the student from that cookie — never from the
   request body.
3. `checkRateLimit` enforces the hourly cap in Postgres.
4. `detectLanguage` picks the reply language from *this* message.
5. `search_material()` retrieves up to five passages from the shared curriculum
   *and* the student's own library, in one RLS-scoped query.
6. `buildSystemPrompt` stacks the prompt files by authority under a token
   budget. The runtime contract and the language directive are never shed.
7. `streamChat` returns the first healthy provider's stream.
8. On close: both turns are persisted with their sources, `validateOutput`
   checks for language drift, the call is written to `ai_logs`, and every
   fourth substantial exchange is mined for durable notes about the student.

---

## Security posture

- RLS on every table. A student cannot read another student's anything.
- Service-role key is read in API routes only, never shipped to the browser.
- Retrieved material and stored memory are fenced in the prompt as *data*.
- No secret is ever printed, even when one appears in context.
- Per-user hourly cap is the spend cap.

---

## Status

**Live database.** Supabase project `MoeAi` has the full schema, RLS on every
table, the signup trigger, retrieval and stats functions, and eight first-year
courses seeded. Verified against the live project: retrieval returns the right
row for both `pointers memory address` and `المؤشر الميموري`, and signing up
creates a profile plus a default library.

**Working:** magic-link auth, streaming chat with conversation history and
source attribution, per-message language detection, Library Mode ingestion
(paste / PDF / subtitles), retrieval across curriculum and library, quiz
generation and grading, student memory with deletion, proactive nudges, rate
limiting, AI logging, legal pages, SEO surface.

**Untested end to end:** everything downstream of a real model call. This
session had no provider API keys, so the chat, quiz-generation and
memory-extraction paths are verified only as far as the provider request is
made. Add one key and walk step 5 of `docs/DEPLOY.md`.

**Not built:** shared lecture content (waiting on the YouTube migration),
simulators, ranked matchmaking, the rotating 3D book, push delivery for
nudges, the Expo mobile client.

See `docs/LAUNCH-CHECKLIST.md` for what stands between here and public, and
`docs/DEPLOY.md` for the environment variables only you can supply.
