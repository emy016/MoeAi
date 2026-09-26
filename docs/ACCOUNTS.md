# Accounts, organizations and plans

How sign-in, onboarding, organizations and plans work, and what still has to be
switched on outside the code.

## Flow

```
/start ─ Student ─ Sign up / Sign in (email or phone + password, Google, Apple)
       │            └─ verify email → profile (handle, consent) → part of an organization?
       │                 ├─ yes → /start/find → SSO (demo university, SAML, or invitation) → /start/access
       │                 └─ no  → /start/plans (Free / Monthly / Yearly)
       └─ Organization ─ Start one → plans → information → setup → /org/admin
                         └─ Part of one → /start/find → SSO → access
```

The next step is never stored in the browser. `my_onboarding()` returns the
facts and `lib/auth/onboarding.ts` derives the step, so refreshes, OAuth/SSO
returns and interrupted steps resume in the right place.

## Where things live

| Piece | File |
| --- | --- |
| Pages | `app/start/*`, `app/account/*`, `app/org/admin/*` |
| API | `app/api/auth`, `app/api/onboarding`, `app/api/account`, `app/api/org/admin`, `app/auth/callback` |
| Rules shared by form and server | `lib/auth/validate.ts`, `lib/auth/next.ts` (redirect safety) |
| Database | `supabase/migrations/20260924_accounts_orgs_plans.sql` |

Everything that grants access (roles, memberships, organizations, plans,
invitations) is written by `SECURITY DEFINER` functions that check
`auth.uid()` themselves. Clients can read their own rows and never write them
directly.

## Commercial values are intentionally empty

`plans` holds Free, Monthly and Yearly for students and for organizations.
Price, currency, features, limits, seat limit, trial, refund, tax and proration
are all `NULL` or empty. Free is `available` (no payment needed); paid plans are
`not_configured`, show "Not available yet", and `choose_plan()` grants nothing
for them. `billing_events` is ready for a provider's verified, idempotent
webhooks. Nothing is charged anywhere.

## To switch on (Supabase dashboard → Authentication)

| What | Where | Without it |
| --- | --- | --- |
| Google | Providers → Google: OAuth client ID and secret from Google Cloud, redirect URL `https://<project>.supabase.co/auth/v1/callback` | The button says Google sign-in is not switched on yet |
| Apple | Providers → Apple: Services ID, key ID, team ID, private key | Same, for Apple |
| Redirect URLs | URL Configuration → add `https://moe-ai-sable.vercel.app/auth/callback` (and preview URLs) | OAuth and email links refuse to return |
| Email confirmation | Providers → Email → Confirm email (recommended on) | Sign-ups are signed in immediately |
| Custom SMTP | Emails → SMTP | Supabase's built-in sender is heavily rate-limited |
| Phone sign-in / verification | Providers → Phone + an SMS provider (Twilio, MessageBird, Vonage) | "Text-message verification is not switched on yet" |
| Two-step verification | Multi-Factor → TOTP enabled | Account settings says it is not switched on |
| Manual linking | Enable manual linking (for Connect Google/Apple in settings) | "Connecting another sign-in method is not switched on yet" |
| SAML SSO for an organization | `supabase sso add` (Pro plan), then set `organizations.sso_provider = 'saml'` and `sso_provider_id` | Members join that organization by invitation |
| Leaked-password protection | Password security → HaveIBeenPwned check | Recommended by the Supabase security advisor |

No new environment variables are needed for any of this: the app uses the
existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. A
billing provider, when chosen, will need its own secret and webhook signing
key.

## Organization verification

A new organization is created **unverified**: it does not appear in search and
nobody joins it automatically by email domain, because typing a domain proves
nothing. Invitations work straight away. Verifying (after confirming domain
ownership) is `update organizations set verified = true where id = …`, done by
MoeAI staff.
