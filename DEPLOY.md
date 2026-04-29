# Deployment Guide — WVF Training App

## One-time setup checklist

### 1. Get your Supabase API keys

1. Go to https://supabase.com/dashboard/project/aokchdumugrjqwbpdqnj/settings/api
2. Copy **Project URL** and **anon public** key
3. Create `wvf-app/.env.local` (copy from `.env.local.example`) and paste them in

### 2. Run the database schema

1. Open the Supabase SQL editor: https://supabase.com/dashboard/project/aokchdumugrjqwbpdqnj/sql
2. Paste and run the contents of `supabase/migrations/0001_initial_schema.sql`
3. Verify the tables and tag seed data appeared in Table Editor

### 3. Create Wayne's coach account

1. In Supabase → Authentication → Users → Invite user
2. Enter Wayne's email; he'll receive a set-password link
3. After he sets his password, update his profile row to set `role = 'coach'`:
   ```sql
   update profiles set role = 'coach' where id = '<wayne-user-id>';
   ```
4. Log in at the app URL with Wayne's credentials to confirm the `/coach` redirect works

### 4. Create test client account

1. Invite a test client email the same way
2. Log in with that account — should land on `/dashboard`
3. Confirm the two roles see different views

### 5. Create Supabase storage buckets

In Supabase → Storage → New bucket, create three **private** buckets:
- `exercise-videos` (for Wayne's demo clips)
- `checkin-photos` (for client progress photos)
- `resources` (for PDFs)

### 6. Connect GitHub repo to Vercel

1. Go to https://vercel.com/wayne-veitch-fitness-projects
2. Click **Add New → Project**
3. Import from GitHub: `wayne-veitch-fitness/wvf-app`
4. Framework preset: **Next.js** (auto-detected)
5. Add environment variables (from your `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Deploy

Every push to `main` will auto-deploy. That's it.

### 7. Point the subdomain (Phase 5)

When ready to go live at `app.wvfitness.com.au`:
1. In Vercel project → Settings → Domains → Add `app.wvfitness.com.au`
2. Vercel will give you a CNAME record to add
3. In Squarespace → Domains → DNS Settings → add that CNAME record
4. Takes ~10 minutes to propagate

---

## Running locally

```bash
cd wvf-app
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

App runs at http://localhost:3000

## Regenerating TypeScript types after a schema change

```bash
npx supabase gen types typescript --project-id aokchdumugrjqwbpdqnj > src/lib/supabase/types.ts
```
