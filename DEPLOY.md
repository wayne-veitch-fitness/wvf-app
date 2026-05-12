# Deployment Guide — WVF Training App

## One-time setup checklist

### 1. Get your Supabase API keys

1. Go to your Supabase project → **Settings → API**
2. Copy **Project URL** and **Publishable (anon) key**
3. Create `wvf-app/.env.local` (copy from `.env.local.example`) and fill in all values

### 2. Run the database migrations

Open the Supabase SQL editor (**SQL Editor → New query**) and run each file in order:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_schema_updates.sql`
3. `supabase/migrations/0004_subfolder_support.sql`
4. `supabase/migrations/0005_security_fixes.sql`
5. `supabase/storage_rls.sql`

> Do **not** run `0003_seed_data.sql` on production — it is for local development only.

### 3. Create Wayne's coach account

1. In Supabase → **Authentication → Users → Invite user**
2. Enter Wayne's email; he'll receive a set-password link
3. After he sets his password, run this in the SQL editor to give him the coach role:
   ```sql
   update profiles set role = 'coach' where id = '<wayne-user-id>';
   ```
   (Find the user ID in Authentication → Users)
4. Log in at the app URL with Wayne's credentials to confirm the `/coach` redirect works

### 4. Create a test client account

1. Invite a test client email the same way
2. Log in with that account — should land on `/dashboard`
3. Confirm the two roles see different views

### 5. Create Supabase storage buckets

In Supabase → **Storage → New bucket**, create two **private** buckets:
- `checkin-photos` — for client progress photos (max 10MB per file)
- `resources` — for PDFs and documents (max 50MB per file)

Both must have **Public bucket** toggled **off**.

> Exercise videos are linked via YouTube URL — no storage bucket is needed.

### 6. Connect GitHub repo to Vercel

1. Go to [vercel.com](https://vercel.com) and open your project
2. Under **Settings → Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `COACH_EMAIL`
   - `NEXT_PUBLIC_APP_URL`
3. Deploy

Every push to `main` will auto-deploy.

### 7. Point the subdomain

When ready to go live at `app.wvfitness.com.au`:
1. In Vercel project → **Settings → Domains** → Add `app.wvfitness.com.au`
2. Vercel will give you a CNAME record to add
3. In Squarespace → **Domains → DNS Settings** → add that CNAME record
4. Takes ~10 minutes to propagate

---

## Running locally

```bash
cd wvf-app
cp .env.local.example .env.local
# fill in values from your Supabase project settings
npm install
npm run dev
```

App runs at http://localhost:3000

## Regenerating TypeScript types after a schema change

```bash
npx supabase gen types typescript --project-id <your-project-ref> > src/lib/supabase/types.ts
```
