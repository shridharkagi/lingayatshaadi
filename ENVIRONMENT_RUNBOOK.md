# LingayatBandhu Environment Runbook

This file captures the current environment architecture, migration history, and known fixes so future setup/debug is faster.

## Environment Topology

- Local app + Local Supabase project
- Test app + Test Supabase + Vercel (`develop` branch)
  - URL: `https://test.lingayatbandhu.com`
- Prod app + Prod Supabase + Vercel (`main` branch)
  - URL: `https://prod.lingayatbandhu.com`

## Vercel Branch Mapping

- Test Vercel project -> Production branch: `develop`
- Prod Vercel project -> Production branch: `main`

## Supabase Projects

- `LingayatBandhu-Local` -> local/dev
- `LingayatBandhu-Test` -> staging/test
- `LingayatBandhu-Prod` -> production

## Migration Files Added During Setup

- `supabase-base-schema.sql`
- `supabase-base-rls.sql`
- `supabase-hardening-unrestricted-tables.sql`

These were created from `FULL_STACK_IMPLEMENTATION.md` SQL sections and hardening requirements.

## DB Migration Order (Applied)

1. `supabase-base-schema.sql`
2. `supabase-base-rls.sql`
3. `supabase-schema-notes.sql`
4. `supabase-fix-rls-policies.sql`
5. `supabase-moderation-schema.sql`
6. `supabase-superadmin-control-center.sql`
7. `supabase-phone-otp.sql`
8. `supabase-account-codes.sql`
9. `supabase-profiles-contacts.sql`
10. `supabase-profiles-relationship.sql`
11. `supabase-add-partner-preference.sql`
12. `supabase-add-preferences-visibility.sql`
13. `supabase-autosave-drafts.sql`
14. `supabase-migrate-public-ids-v2.sql`
15. `supabase-find-auth-user-by-phone.sql`
16. `supabase-list-all-auth-users.sql`
17. `supabase-profile-deletion-requests.sql`
18. `supabase-hardening-unrestricted-tables.sql`
19. Realtime enable query:
   - `ALTER PUBLICATION supabase_realtime ADD TABLE messages;`

### Not to Run on Fresh Environments

- `supabase-cleanup-duplicate-9844497002.sql` (incident-specific cleanup only)

## Security Hardening Applied

- Added RLS hardening for previously `UNRESTRICTED` tables with superadmin-only policies.
- Added helper function:
  - `public.is_superadmin()`
- Kept `subscription_plans` publicly readable only for active plans.

## Superadmin Gate (Current Behavior)

A user is treated as superadmin if any condition passes:

1. Phone matches `SUPER_ADMIN_PHONE` (default `9844497002`)
2. Email is listed in `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_EMAILS`
3. Profile has `role = 'superadmin'`

File reference:
- `src/lib/server/requireSuperAdmin.ts`

## Known Gotchas and Fixes

### 1) Profiles seeded but not visible in `/profiles`

Cause:
- Public listing only shows rows where:
  - `moderation_status = 'approved'` OR
  - `approved_snapshot IS NOT NULL`

Fix query:

```sql
UPDATE public.profiles
SET
  moderation_status = 'approved',
  approved_at = COALESCE(approved_at, NOW()),
  approved_snapshot = COALESCE(approved_snapshot, to_jsonb(profiles.*) - 'approved_snapshot')
WHERE moderation_status IS DISTINCT FROM 'approved'
   OR approved_snapshot IS NULL;
```

### 2) Superadmin subscriptions screen: `membership_plans currently has zero rows`

Cause:
- Legacy FK in `user_subscriptions.plan_id -> membership_plans(id)`.

Fix query:

```sql
INSERT INTO public.membership_plans (name, duration, price, features, popular, is_free)
SELECT
  sp.name,
  GREATEST(1, CEIL(sp.duration_days::numeric / 30.0))::int,
  sp.price,
  COALESCE(
    ARRAY(
      SELECT jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(sp.features) = 'array' THEN sp.features ELSE '[]'::jsonb END
      )
    ),
    ARRAY[]::text[]
  ),
  false,
  (sp.price = 0)
FROM public.subscription_plans sp
WHERE sp.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.membership_plans mp
    WHERE lower(mp.name) = lower(sp.name)
      AND mp.price = sp.price
  );
```

### 3) Allowed/Daily limits show 0 in account/activities

Cause:
- `user_subscriptions` active row has null/zero snapshot fields.

Fix query (free-plan fallback):

```sql
WITH free_plan AS (
  SELECT name, total_contact_views, daily_contact_view_limit
  FROM public.subscription_plans
  WHERE code = 'free' AND is_active = true
  LIMIT 1
)
UPDATE public.user_subscriptions us
SET
  plan_name_snapshot = COALESCE(us.plan_name_snapshot, fp.name),
  total_contact_views_snapshot = CASE
    WHEN COALESCE(us.total_contact_views_snapshot, 0) = 0 THEN fp.total_contact_views
    ELSE us.total_contact_views_snapshot
  END,
  daily_contact_view_limit_snapshot = CASE
    WHEN COALESCE(us.daily_contact_view_limit_snapshot, 0) = 0 THEN fp.daily_contact_view_limit
    ELSE us.daily_contact_view_limit_snapshot
  END
FROM free_plan fp
WHERE us.status = 'active'
  AND us.starts_at <= now()
  AND us.expires_at >= now()
  AND (
    us.plan_name_snapshot IS NULL
    OR COALESCE(us.total_contact_views_snapshot, 0) = 0
    OR COALESCE(us.daily_contact_view_limit_snapshot, 0) = 0
  );
```

### 4) Wrong profile links in Activities -> Contacted

Cause:
- Stale localStorage contact history across migrations/ID changes.

Browser fix:

```js
localStorage.removeItem("contact_view_history");
location.reload();
```

## Vercel 404 Recovery Note (Already Fixed)

Observed:
- Deployment ready but all prod URLs returned `404: NOT_FOUND`.

Root cause:
- Production override/framework mismatch (`Other` override vs `Next.js` project setting).

Fix:
- Remove override mismatch
- Redeploy from `main` without cache

## Post-Setup Smoke Test Checklist

- OTP signup/login/reset
- `/auth/callback` redirect
- Profile create/edit
- Photo upload
- Search/listing/profile detail
- Superadmin subscriptions assignment
- Account limits (`Allowed`, `Daily`) display correctly
- Activities -> contacts list links work
- No critical 500s in Vercel/Supabase logs

