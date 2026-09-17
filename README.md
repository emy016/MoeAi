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
  layout.tsx            shell, metadata defaults
  page.tsx              homepage
  moeai/page.tsx        the tutor chat (streaming)
  login/page.tsx        magic-link sign-in
  legal/page.tsx        terms, privacy (Law 151/2020), cookies
  courses|quizzes|simulators|ranked|dashboard|about/
  not-found.tsx         custom 404
  robots.ts sitemap.ts manifest.ts
  api/
    moeai/route.ts      the tutor endpoint — the ONLY place API keys are read
    memory/route.ts     read / write / delete the student model
    cron/route.ts       daily proactive job
components/             Nav, BottomBar
lib/
  supabase-browser.ts   browser client (RLS)
  supabase-server.ts    server + service-role clients (server-only)
  language.ts           Arabic + Franco detection, directive, output validation
  prompt.ts             prompt assembly under a token budget
  providers.ts          provider chain, multi-key rotation, streaming
  ratelimit.ts          per-user hourly cap
prompts/                RUNTIME, AI_POLICY, SECURITY, TUTORING, MEMORY,
                        PERSONALITY, TOOLS  — MoeAI's actual behaviour
supabase/schema.sql     every table, every RLS policy, one file
docs/                   ARCHITECTURE, PITCH, LAUNCH-CHECKLIST
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
5. `search_lessons()` retrieves up to four passages from the student's syllabus.
6. `buildSystemPrompt` stacks the prompt files by authority under a token
   budget. The runtime contract and the language directive are never shed.
7. `streamChat` returns the first healthy provider's stream.
8. On close: both turns are persisted, `validateOutput` checks for language
   drift, and the call is written to `ai_logs`.

---

## Security posture

- RLS on every table. A student cannot read another student's anything.
- Service-role key is read in API routes only, never shipped to the browser.
- Retrieved material and stored memory are fenced in the prompt as *data*.
- No secret is ever printed, even when one appears in context.
- Per-user hourly cap is the spend cap.

---

## Status

Working: auth, streaming chat, language detection, curriculum retrieval,
student memory, rate limiting, AI logging, legal pages, SEO surface.

Not built yet: real course content, quizzes, simulators, ranked, dashboard
data, the rotating 3D book, proactive delivery, the Expo mobile client.

See `docs/LAUNCH-CHECKLIST.md` for what stands between here and public.
