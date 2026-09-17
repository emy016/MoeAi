# Where the keys go

The repository is public. Nothing secret is ever committed to it, and nothing
secret is ever sent to the browser. There are exactly two places a value can
live, and which one depends on a single rule.

## The rule

**A variable named `NEXT_PUBLIC_*` is baked into the JavaScript every visitor
downloads. Everything else stays on the server.**

That prefix is the whole security boundary. Get it wrong in one direction and
the app breaks; get it wrong in the other and you have published a key.

## Where to put them

Vercel → your project → **Settings → Environment Variables**. Add each to
**Production** and **Preview**. Never in a file in this repo.

### Public — safe in the browser, by design

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your project address. Public. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Published on purpose. |
| `NEXT_PUBLIC_SITE_URL` | Your live URL. |

The anon key alarms people. It is *meant* to be public — it identifies the
project, it does not grant access. What actually protects student data is
row-level security: every table has policies so a signed-in student can read
only their own rows, and a signed-out visitor can read almost nothing. That is
verified directly against the database: one student sees their own state row
and zero of another's.

**If RLS were ever switched off, the anon key would become a real key.** Do not
disable it on any table.

### Secret — server only, never prefixed

| Variable | What it gets you if leaked |
|---|---|
| `GEMINI_API_KEY` | Your Google quota, billed to you |
| `GROQ_API_KEY` | Same, on Groq |
| `GEMINI_BACKUP_API_KEY` | Same |
| `SUPABASE_SERVICE_ROLE_KEY` | **Everything.** Bypasses RLS entirely. Every student's data. |
| `CRON_SECRET` | Ability to trigger the daily job |
| `MOEAI_SYSTEM_PROMPT` | Your prompt (prefer the file; see below) |

`SUPABASE_SERVICE_ROLE_KEY` is the one that matters most. Treat it like the
password to the whole database, because that is what it is.

## Local development

Put them in `.env.local`. It is gitignored (`.env`, `.env.*`, `.env.local` are
all listed), so it cannot be committed by accident.

## How the codebase enforces this

Only five files read a secret, all server-side:

```
app/api/cron/route.ts      app/api/moeai/route.ts
lib/moeai/brain.ts         lib/providers.ts
lib/supabase-server.ts     (+ lib/memory.ts, lib/ratelimit.ts)
```

Each starts with `import "server-only"`. If anyone ever imports one of them
from a client component, **the build fails** rather than quietly shipping the
key to every visitor. That is the guard, and it is deliberate: relying on
"nobody will make that mistake" is not a security control.

## Verifying it yourself

Plant fake values, build, and grep what the browser actually receives:

```bash
rm -rf .next
GEMINI_API_KEY=CANARY_ONE SUPABASE_SERVICE_ROLE_KEY=CANARY_TWO \
NEXT_PUBLIC_SUPABASE_URL=https://x.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=y \
npm run build
grep -rl "CANARY_ONE\|CANARY_TWO" .next/static public   # must print nothing
```

If that ever prints a file, a secret is being shipped. Rotate the key and find
the import.

## Rotating a key

Because it will happen.

1. Create the new key at the provider.
2. Update it in Vercel's environment variables.
3. Redeploy.
4. **Delete the old key at the provider.** Not "stop using it" — delete it.

A key that has ever been in a public repo, a screenshot, or a chat is burned.
Editing the file does not help: it is still in git history and still works
until revoked at the source.

## Currently outstanding

The Gemini key that was hardcoded in the old `moeai.html` was public. It is
removed from the working tree but remains in git history and was served to
visitors. **Revoke it in Google AI Studio.** Nothing else undoes that.
