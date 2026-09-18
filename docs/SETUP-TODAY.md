# Ten minutes, and MoeAI is answering

Everything is built and deployed. What is left needs your Vercel dashboard,
which I have no access to.

## 1 · Get a Google key that works (2 min)

The two Google values you sent (`AQ.Ab8RN6…`) are **OAuth access tokens, not
API keys** — they expire in about an hour and will not authenticate.

Go to **aistudio.google.com → Get API key → Create API key**. It starts with
`AIza`.

Your Groq and OpenRouter keys are the right shape and work as-is. Groq alone is
enough — the provider chain falls through.

## 2 · Paste them into Vercel (5 min)

**vercel.com → the `moe-ai` project → Settings → Environment Variables.**

For each row: type the Name, paste the Value, tick **Production** *and*
**Preview**, Save.

| Name | Value |
|---|---|
| `GROQ_API_KEY` | your `gsk_…` key |
| `OPENROUTER_API_KEY` | your `sk-or-v1-…` key |
| `GEMINI_API_KEY` | the new `AIza…` key from step 1 |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nyrbrsftqqqqompqxxbk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → **anon public** |
| `SUPABASE_SERVICE_ROLE_KEY` | same page → **service_role** (secret) |
| `CRON_SECRET` | any long random string you invent |
| `NEXT_PUBLIC_SITE_URL` | `https://moe-ai-sable.vercel.app` |

## 3 · Redeploy (1 min)

**Deployments → the top one → ⋯ → Redeploy.** Environment variables are read at
build time, so the existing build will not pick them up.

## 4 · One Supabase setting (1 min)

**Supabase → Authentication → URL Configuration → Site URL** →
`https://moe-ai-sable.vercel.app`

Without it, the sign-in emails point at localhost.

## 5 · Walk it (3 min)

1. Open the site. No yellow banner.
2. `/moeai` → sign up.
3. Sidebar → **I'm teaching** → create "Discrete Mathematics".
4. Publish a PDF or paste notes into it.
5. Ask a question about that material — the answer should cite it.
6. Ask the same thing in Franco: `msh fahem el recursion`. It replies in Franco.
7. Copy the join code, open a private window, sign up as a second student, join
   with the code — they see the material, and nothing of yours.

If step 5 cites nothing, retrieval found no overlap between your question and
the uploaded text. That is the honest behaviour, not a bug: MoeAI says it has
no material rather than inventing a syllabus.

## Still outstanding

**Revoke the old Gemini key** from the original `moeai.html`. It was public and
is still in git history. Nothing else undoes that.
