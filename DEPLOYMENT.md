# Deployment Guide: Vercel + Supabase

This guide walks through deploying LingayatBandhu to Vercel with Supabase backend.

---

## Prerequisites

- [ ] Supabase project created
- [ ] Vercel account
- [ ] Git repository (main branch for auto-deploy)

---

## 1. Supabase Setup

### 1.1 Create Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose region (e.g. Mumbai for India)
3. Set a strong database password and save it
4. Wait for project to provision

### 1.2 Run SQL Migrations

In **Supabase Dashboard → SQL Editor**, run in order:

1. **Main schema** – from `FULL_STACK_IMPLEMENTATION.md` (profiles, interests, messages, notifications, etc.)
2. **Additional schema** – from `supabase-schema-notes.sql` (profile_views, shortlist, blocked, notes, etc.)
3. **Realtime for messages** (required for live chat):

```sql
-- Enable Realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

### 1.3 Storage Bucket

1. Go to **Storage** in Supabase
2. **New bucket** → Name: `profile-photos`
3. Set as **Public** (or keep private and use signed URLs)
4. (Optional) Create `profile-documents` as **Private**

### 1.4 Authentication

1. **Authentication → Providers**
   - Enable **Email** (OTP)
   - Enable **Phone** (optional, needs Twilio – see `PHONE_AUTH_SETUP.md`)
2. Add **Redirect URLs** in Auth settings:
   - `https://your-app.vercel.app/**`
   - `https://test.ligayatshaadi.in/**` (or your domain)

---

## 2. Environment Variables

### Local (`.env.local`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # Server-side only (photo uploads, etc.)
```

Get values from **Supabase → Settings → API**.

### Vercel

1. Go to **Vercel → Your Project → Settings → Environment Variables**
2. Add the same variables:
   - `NEXT_PUBLIC_SUPABASE_URL` (Production, Preview, Development)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Production, Preview, Development)
   - `SUPABASE_SERVICE_ROLE_KEY` (Production, Preview – avoid in Development if possible)

### Security

- Never commit `.env.local` or service role key
- Use different Supabase projects for staging vs production if needed

---

## 3. Vercel Deployment

### 3.1 Connect Repository

1. [vercel.com](https://vercel.com) → Add New → Project
2. Import your Git repo
3. Framework: **Next.js** (auto-detected)
4. Root directory: `.` (or your app root)
5. Build command: `npm run build` (default)
6. Output directory: `.next` (default)

### 3.2 Deploy

1. Click **Deploy**
2. After build, Vercel gives a URL (e.g. `xxx.vercel.app`)
3. Re-deploy on every push to `main` (default)

### 3.3 Custom Domain (optional)

1. **Settings → Domains**
2. Add `test.ligayatshaadi.in` (or your domain)
3. Follow DNS instructions (CNAME or A record)
4. SSL is automatic

---

## 4. Post-Deployment Checklist

- [ ] Homepage loads
- [ ] Sign up / Login works (email OTP)
- [ ] Profile completion saves
- [ ] Search and filters work
- [ ] Interests send/receive
- [ ] Messages send (and real-time updates if Realtime enabled)
- [ ] Notifications show and “mark as read” works
- [ ] Photo upload works
- [ ] No CORS or auth errors in browser console

---

## 5. Troubleshooting

### Build fails

- Check build logs in Vercel
- Run `npm run build` locally
- Ensure all env vars are set in Vercel

### “Supabase not configured”

- Ensure `NEXT_PUBLIC_*` vars are set (needed at build time)
- Redeploy after adding variables

### Realtime not working

1. Verify `ALTER PUBLICATION supabase_realtime ADD TABLE messages;` was run
2. Check **Database → Replication** in Supabase
3. Ensure RLS allows users to read messages in their conversations

### Auth redirect issues

- Add production URL to Supabase **Auth → URL Configuration → Redirect URLs**
- Use absolute URLs for redirects (e.g. `window.location.origin`)

### Storage upload fails

- Confirm `profile-photos` bucket exists and policies allow upload
- RLS or storage policies may need `auth.uid()` checks
- Check `SUPABASE_SERVICE_ROLE_KEY` is set if using service role

---

## 6. Quick Reference

| Task              | Where                       |
|-------------------|-----------------------------|
| Supabase keys     | Settings → API              |
| SQL migrations    | SQL Editor                  |
| Realtime config   | Run `ALTER PUBLICATION` SQL |
| Storage buckets   | Storage                     |
| Auth settings     | Authentication → Providers  |
| Vercel env vars   | Project → Settings → Env Vars |

---

## Related Docs

- **Full schema & RLS** – `FULL_STACK_IMPLEMENTATION.md`
- **Extra tables** – `supabase-schema-notes.sql`
- **Phone OTP (Twilio)** – `PHONE_AUTH_SETUP.md`
