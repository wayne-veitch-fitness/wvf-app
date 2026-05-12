# WVF Training App — Pre-Launch Security Assessment

**Date:** 12 May 2026
**Auditor:** Claude Code
**Stack:** Next.js 14 (App Router) · Supabase · Vercel
**Scope:** Full application review across 10 security domains

---

## CRITICAL ISSUES — Must fix before launch

---

### CRIT-1: Open Redirect in OAuth Callback

**File:** `src/app/auth/callback/route.ts` — line 7, 14

```typescript
const next = searchParams.get('next') ?? '/dashboard'
return NextResponse.redirect(`${origin}${next}`)
```

**Risk:** An attacker crafts a phishing URL like:
`https://app.wvfitness.com.au/auth/callback?next=https://evil.com`
After a legitimate login, the user is silently redirected to the attacker's site. Combined with a password-reset flow, this is a credible credential-harvesting attack.

**Fix:** Validate `next` is a relative path before redirecting:

```typescript
const rawNext = searchParams.get('next') ?? '/dashboard'
// Only allow relative paths starting with /
const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'
return NextResponse.redirect(`${origin}${next}`)
```

---

### CRIT-2: Middleware Does Not Check Role for `/coach/` Routes

**File:** `src/middleware.ts` — line 26
**File:** `src/app/(coach)/layout.tsx`

The middleware only checks that the user is **authenticated**, not that they are the coach. Any client user can navigate to `/coach/clients/[id]`, `/coach/checkins/[id]`, etc. The route group layout has zero role protection.

```typescript
// middleware.ts only does this:
if (!user && !publicPaths.includes(pathname)) {
  return NextResponse.redirect(new URL('/login', request.url))
}
// No role check — authenticated clients pass through to /coach routes
```

**Compound risk with CRIT-3 below.** RLS partially mitigates data leakage but the coach UI and its mutation actions are fully exposed to any logged-in user.

**Fix:** Add a role check in middleware for `/coach` paths:

```typescript
if (request.nextUrl.pathname.startsWith('/coach')) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'coach') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
}
```

---

### CRIT-3: Client Can Write `coach_reply` to Their Own Check-in

**File:** `src/app/(coach)/coach/checkins/[id]/page.tsx` — line 67–85
**Policy:** `supabase/migrations/0001_initial_schema.sql` — line 518

The RLS policy `"Clients can manage their own check-ins"` uses `FOR ALL`, which includes UPDATE with no column restriction:

```sql
create policy "Clients can manage their own check-ins"
  on checkins for all using (client_id = my_client_id());
```

The coach reply form uses the **browser Supabase client**. A client who navigates to `/coach/checkins/[their-own-checkin-id]` can submit a fake coach reply — writing arbitrary text into the `coach_reply` and `reviewed_at` fields on their own checkin. The `isFirstReply` check will also fire the "Wayne has replied" email notification to themselves.

**Fix (two parts):**
1. Implement CRIT-2 to block access to coach routes entirely.
2. Tighten the RLS policy to restrict which columns clients can write:

```sql
-- Drop the all-encompassing policy
drop policy "Clients can manage their own check-ins" on checkins;

-- Allow clients to INSERT and UPDATE only their own columns
create policy "Clients can insert their own check-ins"
  on checkins for insert with check (client_id = my_client_id());

create policy "Clients can update their own check-in data"
  on checkins for update
  using (client_id = my_client_id())
  with check (client_id = my_client_id());
  -- coach_reply and reviewed_at must also be guarded at the API/server action layer

create policy "Clients can select their own check-ins"
  on checkins for select using (client_id = my_client_id());

create policy "Clients can delete their own check-ins"
  on checkins for delete using (client_id = my_client_id());
```

> Note: PostgreSQL RLS `WITH CHECK` cannot restrict specific columns — enforce this restriction at the API/server action layer in addition to route protection.

---

### CRIT-4: No Storage RLS Policies for `checkin-photos` and `exercise-videos` Buckets

**File:** `supabase/storage_rls.sql` — covers **only** the `resources` bucket
**Migration comment:** `0001_initial_schema.sql` lines 544–548

The SQL files contain no policies for `checkin-photos` or `exercise-videos`. The comment says "all buckets are private; serve via signed URLs" but:

1. No SQL policies exist in the repo — if they weren't applied manually in the dashboard, these buckets may be completely inaccessible (upload will silently fail) or, worse, use permissive defaults.
2. Even with private buckets, without explicit RLS a Supabase admin UI misconfiguration could expose all photos.
3. There is no policy enforcing that a client can only upload to their **own** folder within `checkin-photos`.

**Risk:** Client A could upload to `checkin-photos/client-b-uuid/photo.jpg` if the only check is authentication. Body composition photos are among the most sensitive personal data in the app.

**Fix:** Create and apply these policies:

```sql
-- checkin-photos: client can only upload/read their own folder
create policy "Clients can upload their own checkin photos"
  on storage.objects for insert with check (
    bucket_id = 'checkin-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Clients can view their own checkin photos"
  on storage.objects for select using (
    bucket_id = 'checkin-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from profiles where id = auth.uid() and role = 'coach')
    )
  );

create policy "Coach can manage checkin photos"
  on storage.objects for all using (
    bucket_id = 'checkin-photos'
    and exists (select 1 from profiles where id = auth.uid() and role = 'coach')
  );

-- exercise-videos: authenticated read, coach manages
create policy "Authenticated users can view exercise videos"
  on storage.objects for select using (
    bucket_id = 'exercise-videos' and auth.uid() is not null
  );

create policy "Coach can manage exercise videos"
  on storage.objects for insert with check (
    bucket_id = 'exercise-videos'
    and exists (select 1 from profiles where id = auth.uid() and role = 'coach')
  );
```

---

## HIGH PRIORITY ISSUES — Should fix before launch

---

### HIGH-1: Demo Credentials in Source-Controlled Migration File

**File:** `supabase/migrations/0003_seed_data.sql` — lines 6–8

```sql
-- Demo login: trent.demo@wvf.app / Demo1234!
--             isla.demo@wvf.app  / Demo1234!
--             melanie.demo@wvf.app / Demo1234!
```

Credentials are in git history and plaintext. If this migration was ever applied against the production database, these three accounts exist there with known passwords.

**Fix:**
1. Confirm whether `0003_seed_data.sql` was applied to production. If so, immediately delete or rotate those three auth users via the Supabase dashboard.
2. Remove the password comments from the migration file (or delete the seed migration from production history).
3. For any future seed/demo data, never store passwords in migration files — use a separate local-only script.

---

### HIGH-2: No Security Headers Configured

**File:** `next.config.js` — no `headers()` export present

The app ships with no HTTP security headers. Vercel's default CDN does not inject these automatically. Missing:

| Header | Risk if absent |
|---|---|
| `X-Frame-Options: DENY` | Clickjacking — embed the app in an `<iframe>` to steal clicks |
| `X-Content-Type-Options: nosniff` | MIME-type sniffing attacks |
| `Referrer-Policy: strict-origin-when-cross-origin` | Leaks full URL in `Referer` header to third-party resources |
| `Content-Security-Policy` | XSS escalation — injects scripts from unauthorized origins |
| `Strict-Transport-Security` | Forces HTTPS even if user types `http://` |
| `Permissions-Policy` | Camera/mic access by rogue scripts |

**Fix — add to `next.config.js`:**

```javascript
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options',           value: 'DENY' },
      { key: 'X-Content-Type-Options',    value: 'nosniff' },
      { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com",
          "img-src 'self' data: https://cutvfpqmngujesoozkjo.supabase.co",
          "frame-ancestors 'none'",
        ].join('; '),
      },
    ],
  }]
},
```

---

### HIGH-3: No Lockfile — `npm audit` Cannot Run

**File:** project root — no `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`

Without a lockfile: (a) dependency versions are non-deterministic across installs, (b) `npm audit` cannot run, (c) Vercel may install different versions in CI than locally.

**Fix:** Run `npm install` locally to generate `package-lock.json`, commit it, and never `.gitignore` lockfiles. Once the lockfile exists, run `npm audit` and address any high/critical findings.

---

### HIGH-4: Email Routes Callable by Any Authenticated User (Not Coach-Only)

**Files:** `src/app/api/email/checkin-submitted/route.ts` line 10, `src/app/api/email/coach-replied/route.ts` line 10

Both email API routes check `if (!user)` but **not** `if (user.role !== 'coach')`. A client user can call these endpoints with any `checkinId` and trigger email notifications. The admin client is used to fetch the check-in (bypassing RLS), so any client can cause an email to be sent containing another client's weight and health data to the coach's inbox.

**Fix:** Add a role/ownership check to both email routes. For `coach-replied`, require coach role. For `checkin-submitted`, verify the caller owns the check-in:

```typescript
const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
if (profile?.role !== 'coach') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
```

---

## MEDIUM PRIORITY ISSUES — Fix soon after launch

---

### MED-1: `RESEND_FROM` Exposed as Client-Side Environment Variable

**File:** `next.config.js` — lines 4–6

```javascript
env: {
  RESEND_FROM: 'WVF App <noreply@mail.wvfitness.com.au>',
},
```

The `env` block in `next.config.js` embeds values in the client bundle (equivalent to `NEXT_PUBLIC_`). The from-address itself is not sensitive, but this pattern would be dangerous if a real secret were placed here in future.

**Fix:** Move `RESEND_FROM` to be read server-side only, or hardcode it directly in `lib/email.ts` since it's a static string.

---

### MED-2: Supabase Project ID Embedded in `.env.local.example`

**File:** `.env.local.example` — lines 4–6

```
# Supabase project: aokchdumugrjqwbpdqnj
NEXT_PUBLIC_SUPABASE_URL=https://aokchdumugrjqwbpdqnj.supabase.co
```

The project reference ID is in version control. This enables targeted reconnaissance (database enumeration via Supabase's REST API, finding publicly accessible storage objects, etc.).

**Fix:** Replace with a placeholder: `NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co`

---

### MED-3: No Input Validation Library or Schema Validation on API Routes

**File:** `src/app/api/coach/clients/route.ts` — lines 13–16

API routes perform only presence checks (`if (!full_name || !email || !password)`). No email format validation, no password complexity enforcement, no length limits.

**Fix:** Add `zod` for boundary validation:

```typescript
import { z } from 'zod'
const schema = z.object({
  full_name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  package_label: z.string().max(100).optional(),
  checkin_day: z.number().int().min(0).max(6).optional(),
})
```

---

### MED-4: No Rate Limiting on API Endpoints

**Files:** All routes under `src/app/api/`

The email routes have no rate limiting and could be abused to spam Wayne's inbox from an authenticated client session. The create-client route has no protection against rapid repeated calls.

**Fix:** Use Vercel's built-in rate limiting (Pro plan) or add `@upstash/ratelimit` middleware.

---

### MED-5: Coach Layout Has No Server-Side Auth Guard

**File:** `src/app/(coach)/layout.tsx`

The layout is a pure presentational wrapper. All auth protection comes from middleware, which (before CRIT-2 is fixed) does not check role. Add defence-in-depth:

```typescript
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export default async function CoachLayout({ children }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') redirect('/dashboard')
  // render layout...
}
```

---

## LOW PRIORITY / NOTES — Best practice improvements

---

### LOW-1: `console.warn` Logs a User's UUID in Production

**File:** `src/app/api/email/coach-replied/route.ts` — line 33

```typescript
console.warn(`No email found for profile ${profileId}`)
```

Logs a user's `profile_id` UUID to Vercel logs. Not a direct vulnerability but leaks internal identifiers if log access is not tightly controlled.

**Fix:** `console.warn('No email found for client — skipping notification')`

---

### LOW-2: `APP_URL` Hardcoded as Fallback in Login Page

**File:** `src/app/(auth)/login/page.tsx` — line 7

```typescript
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.wvfitness.com.au'
```

If `NEXT_PUBLIC_APP_URL` is missing from Vercel env config, this silently falls back to the production domain, masking a misconfiguration. Prefer a build-time error for missing required env vars.

---

### LOW-3: TypeScript `strict: false` in tsconfig

**File:** `tsconfig.json` — lines 10, 29

`"strict": false` and `"noImplicitAny": false` allow untyped values to flow through the codebase, which can mask security-relevant bugs. Enabling strict mode before launch is recommended.

---

### LOW-4: Direct Resend API Fetch in `coach-replied` Inconsistent With Helper

**File:** `src/app/api/email/coach-replied/route.ts` — lines 53–65

This route makes a raw `fetch` to Resend while `src/lib/email.ts` provides a `sendEmail` helper. Error handling and the API key reference are duplicated.

**Fix:** Use the `sendEmail` helper from `lib/email.ts` consistently across all email routes.

---

### LOW-5: Seed Migration Leaves Predictable UUIDs in Database if Applied to Production

**File:** `supabase/migrations/0003_seed_data.sql` — lines 16–23

Demo client UUIDs follow a trivially guessable pattern (`a0000001-0000-0000-0000-000000000001`, etc.). If the seed was applied to production, those UUIDs are guessable by anyone who has read the migration file.

**Fix:** Confirm seed was not applied to production. If it was, recreate those demo clients with randomly generated UUIDs.

---

### LOW-6: Storage Policies Not Tracked as Numbered Migrations

**File:** `supabase/storage_rls.sql`

Storage policies are in a standalone SQL file that must be manually applied via the Supabase SQL editor. There is no way from the codebase to confirm they are live.

**Fix:** Move storage policies into the numbered migrations directory (`supabase/migrations/`) so they are tracked and applied automatically via `supabase db push`.

---

## RLS Coverage Summary

| Table | RLS Enabled | Client isolation | Coach access | Notes |
|---|---|---|---|---|
| profiles | ✓ | ✓ own row only | ✓ all | Good |
| clients | ✓ | ✓ own row only | ✓ all | Good |
| exercises | ✓ | read-only | ✓ all | Good |
| tags / exercise_tags | ✓ | read-only | ✓ all | Good |
| programs | ✓ | ✓ assigned only | ✓ all | Good |
| client_programs | ✓ | ✓ own only | ✓ all | Good |
| program_days/sections/exercises | ✓ | ✓ assigned only | ✓ all | Good |
| workout_logs / set_logs | ✓ | ✓ own only | read | Good |
| checkins | ✓ | ✓ own only (FOR ALL — see CRIT-3) | ✓ all | Fix CRIT-3 |
| food_diary | ✓ | ✓ own only | read | Good |
| resource_folders / resources | ✓ | read-only | ✓ all | Good |
| storage: resources | ✓ | read-only | ✓ all | Good |
| storage: checkin-photos | ? | **NOT CONFIRMED** | **NOT CONFIRMED** | Fix CRIT-4 |
| storage: exercise-videos | ? | **NOT CONFIRMED** | **NOT CONFIRMED** | Fix CRIT-4 |

---

## Launch Readiness Summary

**Verdict: Not ready to launch.** There are four critical issues and four high-priority issues that must be resolved first. The core data model is well-designed — RLS is enabled on every database table, coach/client data isolation is correctly implemented at the database layer, and secrets are properly kept server-side. The problems are in the application layer above the database.

### Top 3 Blockers

**Blocker 1 — Open Redirect (CRIT-1)**
A two-line fix in `src/app/auth/callback/route.ts`. Exploitable without any authentication as a phishing vector. Fix in under 5 minutes.

**Blocker 2 — No Role Check on `/coach/` Routes (CRIT-2 + CRIT-3)**
Any authenticated client can access the coach UI and — critically — write fake coach replies to their own check-ins due to the overly broad `FOR ALL` RLS policy on the checkins table. Requires a middleware update, layout guard, and RLS policy refinement.

**Blocker 3 — No Storage Policies for `checkin-photos` and `exercise-videos` (CRIT-4)**
Body composition photos have no confirmed access control policy in tracked code. Must be audited against the live Supabase dashboard and explicit policies applied before client photo uploads go live.

After these three are resolved, address HIGH-1 (demo credentials) and HIGH-2 (security headers) and the app will be in a sound security posture for a small-scale production launch.
