# Deploying

The database is already live. What is left is the part only you can do: the
secrets.

## 1. Supabase — done

Project `MoeAi` (`nyrbrsftqqqqompqxxbk`, eu-central-1) has the full schema,
RLS on every table, the signup trigger, `search_material()`, `dashboard_stats()`,
and the eight first-year courses seeded.

Applied migrations: `core_tables`, `rls_policies`, `triggers_and_search_functions`,
`revoke_trigger_function_execute`.

Nothing to do here unless you change `supabase/schema.sql`, in which case run
the changed part in the Supabase SQL editor.

**One setting to check:** Authentication → URL Configuration → Site URL must be
your Vercel URL, or the magic-link emails will point at `localhost`.

## 2. Vercel environment variables

Project Settings → Environment Variables. Add these to **Production** and
**Preview**:

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nyrbrsftqqqqompqxxbk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → anon/publishable |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → **service_role** |
| `GEMINI_API_KEYS` | aistudio.google.com — comma-separated list |
| `GROQ_API_KEYS` | console.groq.com — comma-separated list |
| `OPENROUTER_API_KEYS` | openrouter.ai — comma-separated list |
| `CRON_SECRET` | any long random string you invent |
| `NEXT_PUBLIC_SITE_URL` | your live URL, e.g. `https://moe-ai.vercel.app` |

The first two are public by design and safe in the browser. The rest are
server-only and are read exclusively inside `app/api/*`.

**Multiple keys per provider is the point.** Free tiers rate-limit per key, so:

```
GEMINI_API_KEYS=key_one,key_two,key_three
```

A key that returns 429 is benched for 60 seconds and the next one is used. When
a whole provider is exhausted, the chain falls through to the next provider.
You only need one provider configured for the app to work; three makes it
survive a demo.

Until these exist, the site still builds and loads — it shows a yellow banner
saying setup is incomplete, rather than failing the deployment.

## 3. Rotate the old keys first

Before pasting anything: the Gemini key hardcoded in the old `moeai.html`, and
the Telegram bot token plus Gemini and Groq keys in the old `.env`, have both
travelled through shared archives. **Revoke them.** Do not reuse them here.

## 4. Deploy

The repo is connected to Vercel, so a push to the production branch deploys.
Vercel Cron calls `/api/cron` daily at 06:00 UTC using `CRON_SECRET`.

## 5. Verify, in this order

1. Open the site. The yellow setup banner should be gone.
2. `/login` → enter your email → click the link in your inbox.
3. `/library` → paste a lecture → it reports how many parts it indexed.
4. `/moeai` → ask about that lecture → the answer should carry a 📕 chip naming
   your document.
5. Ask the same thing in Franco (`msh fahem...`) → the reply comes back in Franco.
6. `/quizzes` → type that topic → five questions from your own material.
7. `/dashboard` → the counts move.

If step 4 shows no chip, retrieval found nothing — the question's keywords do
not appear in the uploaded text. That is the honest behaviour, not a bug:
MoeAI says it has no material rather than inventing a syllabus.
