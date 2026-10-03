# MoeAI · by NetWatch

**MoeAI** is the AI that lives digitally in your university: it reads the
course staff's own lectures, knows the course calendar, remembers each student,
and answers with simulations, graphs and practice exams. Course staff run it
from tutor mode in the same app.

**EduMoe** is the website around it (the plain HTML pages under `public/`).

- Live: https://moe-ai-sable.vercel.app (the app is `/moeai`, the showcase `/showcase`)
- Team: Moemen (AI, backend, website), Youssef (the app and its interface),
  Eslam (MoeAI's character, testing)

---

## How it is put together

| Part | What it is | Where |
| --- | --- | --- |
| The app | Youssef's React Native app (Expo), exported to static web and served at `/moeai`; the same code ships to Android | `mobile/`, built into `public/_expo` |
| The API | Next.js 16 route handlers on Vercel: chat, course search, tutor mode, calendar, simulators, practice | `app/api/` |
| The data | Supabase: Postgres with row-level security on every table, pgvector, storage, cron | `supabase/migrations/` |
| The website | Plain HTML pages (home, courses, showcase), no framework on the page | `public/*.html` |

Next.js hosts all of it. Clean URLs for the HTML pages and the `/moeai`
rewrite are declared in `next.config.ts`.

### How a question is answered (`POST /api/moeai`)

1. The student's session decides what they can read (RLS), plus hourly and
   daily limits in Postgres.
2. **Course search (RAG):** the question is embedded (Gemini, 768 dims) and
   matched by meaning and by words at once; `match_course_chunks` fuses both
   rankings (reciprocal-rank fusion) and the lecture the student has open wins
   ties. The top passages and the course map go into the prompt with page
   numbers to cite.
3. **Awareness:** upcoming lectures, quizzes and assignments from the course
   calendar (`lib/awareness.ts`), and what the student did recently.
4. **The student:** their memory (they can read, edit or delete it), skills and
   custom instructions.
5. **Voice:** `prompts/` (Eslam's PERSONALITY and TUTORING, plus policy and
   security) assembled by `lib/emy/prompt.ts`; the reply language is detected
   per message (`lib/emy/language.ts`).
6. **Providers:** Gemini first (several keys, rotated), then Groq, NVIDIA,
   OpenRouter and Cheaper Inference (paid, last). The answer streams back as
   NDJSON and the call is logged in `ai_logs` with real token counts.

### Tutor mode

Staff accounts open the app in tutor mode: Courses (upload, OCR of scanned
pages, indexing, course map, passages), Calendar (events MoeAI is aware of;
paste a schedule and MoeAI drafts the events), People (roles, course access,
an activity log that never shows what a student wrote), Simulators (built-in
engines or ones MoeAI writes, only when staff ask).

---

## Where things live

```
mobile/                  The app (Expo). npm run build:app exports it to public/_expo
  src/tutor/             Tutor mode screens
  src/simulators/        Built-in simulator library and per-course loading
app/api/                 moeai, tutor, calendar, sims, practice, quiz, memory, personal,
                         org, sso, organizer, cron, health, ...
lib/
  rag/                   Extract, OCR, chunk, embed, retrieve, course map (brain)
  ai/embed.ts            Embeddings, with a fast path for questions
  emy/                   Prompt assembly, language detection, voice samples
  moeai/brain.ts         Provider chain and streaming
  providers.ts           Non-streaming chain for background jobs
  keys.ts                One place that knows every API key name
  awareness.ts           Calendar events into the prompt
  sims.ts                Plans and writes simulators on request
prompts/                 Behaviour specs, shipped with the deploy
supabase/migrations/     Every schema change, applied in order
public/*.html            The EduMoe pages and the showcase
scripts/                 Checks (language, emy, logic, calendar, markdown, keys, app bundle)
docs/                    ARCHITECTURE, DEPLOY, SECRETS, ACCOUNTS, PITCH
```

---

## Running it

```bash
npm install
cp .env.example .env.local     # fill in the values (docs/SECRETS.md)
npm run dev
```

Before you push:

```bash
npm run verify     # typecheck, lint, every check script, then a production build
```

After changing anything under `mobile/`, rebuild the web export and commit it:

```bash
npm run build:app
```

---

## Security posture

- RLS on every table; staff-only data goes through `SECURITY DEFINER` functions
  that check the caller's role.
- Provider keys and the service-role key are read only on the server.
- Retrieved material and stored memory are fenced in the prompt as data.
- Tutors see that a student asked MoeAI something, never what they asked.
- Same-origin check on paid endpoints, per-user and per-IP limits.
