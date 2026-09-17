# Architecture decisions

Short entries. Each records what was chosen, what was rejected, and when to
revisit.

## One app, not two

MoeAI is pitched as usable standalone (organisations, solo students, Library
Mode) *and* as part of EduMoe. That is one codebase with two entry surfaces, not
two products. `/moeai` works on its own; the rest of EduMoe is the environment
around it. Library Mode is a scoping rule on retrieval — whose `lessons` rows you
can see — not a fork.

**Revisit** only if an institution demands a separate deployment.

## TypeScript with `strict: true`

Rejected: JavaScript, and `strict: false`.

Most of this code is AI-generated. Strict typing is the cheapest reviewer we
have: a wrong shape fails `npm run build` on Vercel instead of failing in front
of a student. `strict: false` gives the errors without the safety.

## Plain CSS, not Tailwind

The liquid-glass design already exists as hand-tuned CSS across ~15,000 lines of
prototype HTML. Porting it to Tailwind means rewriting the design system, not
migrating it. `styled-jsx` scopes component styles; `globals.css` holds tokens.

## Postgres FTS before pgvector

`search_lessons()` uses a `tsvector` column and a GIN index. First-year CS
lectures are keyword-dense — "pointer", "Kirchhoff", "truth table" — which is
exactly where lexical search is strong and embeddings add cost and latency.

**Revisit** when students ask conceptually ("the thing where memory addresses
point at other memory") and FTS misses. Then add pgvector *beside* FTS, hybrid,
not instead of it.

## Direct `fetch`, no AI SDK

Two of three providers speak the OpenAI shape, so the whole chain is one shared
function plus one Gemini-specific one. An SDK would add a dependency, a version
surface, and an abstraction over three endpoints we already understand.

## Multi-key rotation

Free tiers rate-limit per key. Each provider env var takes a comma-separated
list; a key returning 429 is benched for 60 seconds. Combined with the per-user
hourly cap, this is the whole cost-control story until there is a budget.

**Limitation:** the cooldown map is per serverless instance, so a cold start
forgets it. Acceptable — the worst case is one wasted 429.

## Streaming from day one

Rejected: "add streaming after the pitch."

Perceived latency is the difference between a product and a prototype on demo
day. It cost about forty lines in `providers.ts`.

## Auth in week one, not "later"

Rejected: trusting `userId` from the request body with a `// TODO`.

Without it, any visitor can read and write any student's memory — while the
privacy page claims otherwise. With 230 real students that is not a TODO, it is
a breach. Magic-link auth took an afternoon.

## Language detection is rule-based

Rejected: letting the model pick its own reply language.

Models drift to English the moment a message contains a technical term. The
detector in `lib/language.ts` is deterministic, testable, and was tuned against
real Egyptian students on the prototype. `validateOutput` catches drift after
generation so the caller can retry.

## No tests, with one exception

No Playwright, no component tests. 230 students are better testers than a
suite we would not maintain.

The exception is `lib/language.ts`. It is pure, it is the differentiator, and a
regression there is invisible until a student gets answered in the wrong
language. `scripts/check-language.ts` holds its cases; run `npm run check:language`.
Add a case every time a real student's message is misread.

## Prompts as files, not as a database

`prompts/*.md` ships with the deploy. Editing behaviour is a commit, which means
behaviour changes are reviewable and revertable in git. No versioning scheme
beyond that until more than one person edits them.

## The 3D book is last

It is a brand element, not decoration — but it is also the only item on the
roadmap whose absence cannot break the pitch. It ships lazy-loaded, after
everything that can.
