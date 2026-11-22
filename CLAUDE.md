# LingayatBandhu — Claude Code guide

Mobile-first matrimony web app for the Lingayat community (Karnataka & Maharashtra).
Brand: **LingayatBandhu**. The repo/folder name `ligayatshaadi` is legacy.

## How to work on this project

Act as a technical cofounder, not just a coder (carried over from `src/cluade-rules.md`):

- Analyse before coding. If requirements are unclear or conflicting, ask first.
- Challenge weak assumptions; warn clearly about tech debt, security, privacy, scaling or UX risks.
- Before large features: summarise understanding → risks → proposed approach → then code.
- Production-grade, modular, readable code; avoid over-engineering; refactor duplication you touch.
- Debug by root cause, not symptom patches. Never break existing features silently.
- Trust, privacy and safety come first: family-managed profiles, contact/WhatsApp safety, profile abuse prevention, verification.
- Mobile-first UI with clear loading, empty and error states.
- Be concise. State uncertainty instead of guessing.

## Commands

```bash
npm run dev            # local dev on http://localhost:3000 (uses --webpack; clicks work)
npm run build          # production build
npm run lint           # eslint (many rules relaxed in eslint.config.mjs)
npx tsc --noEmit       # type-check (strict mode)
npm run verify:schema  # checks control-center tables exist in the configured Supabase
```

There is **no test suite and no CI** yet. Verify changes with `tsc`, `lint`, and by running the app.
The README's advice to use `npm run dev:prod` because of a click bug is obsolete.

## Environments

| Env | URL | Git branch | Supabase |
|---|---|---|---|
| Local | http://localhost:3000 | any | whatever `.env.local` points to |
| Test | https://test.lingayatbandhu.com | `develop` (Vercel auto-deploy) | LingayatBandhu-Test |
| Prod | https://www.lingayatbandhu.com | `main` (Vercel auto-deploy) | LingayatBandhu-Prod |

- Remote: `github.com/shridharkagi/lingayatshaadi`. Work on `develop`; promote to `main` deliberately.
- `.env.local` may point at a **shared hosted Supabase project**. Treat local writes as real data unless confirmed otherwise.
- Never print secret values from `.env*`. `NODE_TLS_REJECT_UNAUTHORIZED=0` is local-only and must never reach Vercel.

## Architecture

- **Next.js 16 App Router + React 18 + TypeScript + Tailwind v4**, Supabase (auth, Postgres, storage), Vercel.
- Path alias `@/*` → `src/*`.
- `src/app/` — public pages (`page.tsx` landing, `brides`, `grooms`, `profiles`, `p/[slug]`), logged-in app under `(app)/`, profile wizard `profile/complete`, admin console `superadmin/`, API routes `api/`.
- `src/lib/api/*` — browser-side data access (anon Supabase client).
- `src/lib/server/*` — server-only helpers: `requireAuthUser`, `requireSuperAdmin`, `adminAudit`, OTP challenge, magic-link session issue, plan provisioning.
- `src/lib/supabase.ts` — anon client singleton + `createSupabaseAdmin()` (service role; server only).
- `src/contexts/` — `AuthContext` (session, current user/profile), `ProfilesContext`, `AppConfigContext` (site settings), `AuthModalContext`.
- `src/lib/accessPolicy.ts` + `src/lib/dataVisibility.ts` — plan-based access and field masking rules.
- **Route protection is client-side only** (`src/proxy.ts` is a no-op). Every sensitive action must be enforced in an API route or in RLS — never only in the UI.

### Auth & OTP
- Mobile-number only. Signup = phone OTP + password; login = OTP or password; reset = OTP.
- SMS via **Fast2SMS DLT** (`src/lib/fast2smsVerify.ts`); message text in `src/lib/phoneOtpConfig.ts` must match approved DLT templates exactly. Twilio/API HOME code was removed (old docs still mention them).
- OTPs hashed in `phone_otp_challenges`, 10-min TTL, 30-s resend cooldown. Turnstile captcha guards `/api/auth/phone/send` only.
- After OTP verify, the server issues a Supabase session via `issueMagicLinkSession` (recovery link). Every account has a synthetic email `phone_<10digits>@phone.otp.lingayatbandhu.com`.
- `DEV_OTP_BYPASS` / `CAPTCHA_BYPASS` must never be `true` outside local.

### Domain rules
- One login account can own up to **3 profiles** (self/son/daughter/brother/sister/other).
- Subscriptions are **account-level** — see `SUBSCRIPTION_POLICY_REFERENCE.md`. Plans: Free, Gold, Platinum, Diamond; contact-view quotas (total + daily, IST reset). Upgrades are manual (admin assigns after offline payment).
- Profile moderation: `draft → pending_review → approved | rejected`; public sees `approved_snapshot` while edits are pending. Photos and KYC docs have their own pending/approved/rejected states.
- Member IDs: `L[B|G]YYMM#####`; account codes `UYYMM…`.

## Database

- Schema lives as loose `supabase-*.sql` files in the repo root, applied by hand in the Supabase SQL editor. Applied order is in `ENVIRONMENT_RUNBOOK.md` (4 May-2026 files are missing from that list).
- New schema changes: write an idempotent SQL file, apply to **Test first**, record it in the runbook. (Plan: move to `supabase/migrations/`.)
- Use the service role only in API routes after an auth/ownership check.

## Known issues (from Nov 2026 review — fix before adding features)

1. `profiles` RLS SELECT is `USING (true)` → all PII readable with the anon key; masking is UI-only.
2. `profiles` UPDATE policy has no column guard → users can set their own `role='superadmin'`, `moderation_status`, `verified`.
3. OTP verify / reset-password have no attempt limit.
4. `requireSuperAdmin` accepts any email *containing* the admin phone; admin phone hard-coded as fallback.
5. `/api/upload-photo` and `/api/upload-kyc-document` are unauthenticated.
6. `api/superadmin/lifecycle` falls through to hard delete for unknown actions.
7. Search pagination skips rows (`src/lib/api/profiles.ts` cursor logic); Free plan counts as "paid" for masking; blocking not enforced; mock-profile fallback in `ProfilesContext`.

Items 1–2 depend on whether live RLS matches the repo SQL — verify before changing.

## Docs

Many root `*.md` files are stale (Twilio, `test.ligayatshaadi.in`, `prod.lingayatbandhu.com`). Trust code over docs. Reliable references: `ENVIRONMENT_RUNBOOK.md` (except prod URL), `SUBSCRIPTION_POLICY_REFERENCE.md`, `PARTNER_PREFERENCES.md`.
