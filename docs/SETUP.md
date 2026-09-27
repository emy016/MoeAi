# Setting up MoeAI on Vercel and Supabase

Everything in the code is live once these are set. Nothing here goes in the
repository: every value below is a secret or a setting in a dashboard.

## 1. Vercel environment variables

Vercel → project **moe-ai** → Settings → Environment Variables. Add each one
for **Production** (and Preview if you use previews).

| Name | What to put | Needed for |
| --- | --- | --- |
| `GEMINI_API_KEYS` | Several Gemini keys, comma-separated (one per Google account, from aistudio.google.com → Get API key). More keys = more requests before the free limits hit. | every AI answer |
| `GROQ_API_KEYS` | Groq keys, comma-separated (console.groq.com → API Keys). Used when Gemini is busy. | fallback |
| `OPENROUTER_API_KEYS` | Optional third fallback (openrouter.ai → Keys). | fallback |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | sign-in, data |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon / publishable key | sign-in, data |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role / secret key. Server only. | MoeAI rewriting its MEMORY.md, proactive messages, push, Arena question cache |
| `CRON_SECRET` | Any long random string (e.g. run `openssl rand -hex 32`) | the daily job |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Run `npx web-push generate-vapid-keys` on your computer and paste the two keys | browser notifications |
| `VAPID_SUBJECT` | `mailto:` plus your email | browser notifications |
| `NEXT_PUBLIC_SITE_URL` | `https://moe-ai-sable.vercel.app` | links in emails and fallbacks |

Optional limits (defaults in brackets): `MOEAI_DEMO_PER_DAY` (15, the shared
demo accounts), `MOEAI_MAX_PER_DAY` (150, other students), `MOEAI_GUEST_PER_DAY`
(10, per guest IP), `MOEAI_MAX_MESSAGES_PER_HOUR` (40), `MOEAI_GUEST_SALT` (any
random string).

Then **Deployments → the latest → ⋯ → Redeploy**. Environment variables only
apply to deployments made after you save them.

## 2. Rotate the keys that were shared

Keys that were pasted into chats or sent inside a zip (the Telegram bot's
`.env`) should be treated as public: create new ones, put the new ones in
Vercel, and delete the old ones in each provider's console.

## 3. Supabase

The database changes are already applied (daily limits, the alive layer, DM,
push subscriptions, file digests, verified course codes, Arena questions).

- Authentication → URL Configuration: **Site URL** `https://moe-ai-sable.vercel.app`,
  and add the same URL under **Redirect URLs**.
- Optional, for MoeAI to message students every hour instead of once a day:
  Database → Extensions → enable **pg_cron** and **pg_net**, then in the SQL
  editor run (put your real `CRON_SECRET` in place of the placeholder):

  ```sql
  select cron.schedule('moeai-proactive', '15 * * * *', $$
    select net.http_get(
      url := 'https://moe-ai-sable.vercel.app/api/cron?job=proactive',
      headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET')
    )
  $$);
  ```

  Vercel's own cron already runs the full job daily at 06:00 UTC (MoeAI's
  self-review of its mistakes, then proactive messages).

## 4. Check it works

1. Open https://moe-ai-sable.vercel.app/moeai and sign in with the demo student
   **20259999** (same password as before).
2. Community tab → **Turn on** notifications, allow them in the browser.
3. Trigger MoeAI's messages once by hand:
   `curl -H "Authorization: Bearer YOUR_CRON_SECRET" "https://moe-ai-sable.vercel.app/api/cron?job=proactive"`
   A student gets a message only when there is a reason (a deadline in the
   next hours, no lecture opened yet, a quiet few days, or sometimes a fun
   fact), at most three a day and never between 1am and 9am their time.
4. Tutor page: sign in as staff, open a course, **Organize**. It now reads one
   file at a time and names any file it could not read.
5. https://moe-ai-sable.vercel.app/api/health shows which keys and features are
   configured (names only, never values).
