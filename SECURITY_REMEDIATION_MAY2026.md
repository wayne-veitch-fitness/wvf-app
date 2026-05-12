# WVF Training App — Security Remediation Report

**Prepared:** 12 May 2026
**Prepared by:** Erin Veitch / Intelia
**App:** WVF Training App (Next.js 14 · Supabase · Vercel)
**Purpose:** Pre-launch security hardening summary

---

## Overview

A full security audit was conducted across authentication, database access control, file storage, API routes, email handling, dependencies, and deployment configuration. Seventeen issues were identified and addressed. The app is now considered ready for production launch.

---

## What Was Fixed

### Critical — Authentication & Access Control

**1. Open redirect after login (phishing risk)**
An attacker could craft a link that, after a user logged in, silently redirected them to a fake website. Fixed by validating the post-login redirect destination is always internal.

**2. Clients could access the coach portal**
Any logged-in client could navigate directly to coach pages (e.g. `/coach/clients`, `/coach/checkins`). Fixed by adding a role check in both the server middleware and the coach layout — non-coach users are now redirected to their own dashboard.

**3. Clients could write fake coach replies**
Because the database policy was overly broad, a client navigating to a coach page could theoretically submit text into the "coach reply" field of their own check-in. Fixed by splitting the database policy into separate read/write rules, and by the coach portal access fix above.

**4. No access control on photo and video storage**
The `checkin-photos` storage bucket had no explicit access policies. Fixed by adding database-level storage policies so clients can only access their own photos, and the coach can access all. The `resources` bucket was already correctly configured. The `exercise-videos` bucket is not used — exercises link to YouTube URLs instead.

---

### High Priority — Infrastructure & Headers

**5. Demo account credentials in source code**
Three test accounts with known passwords (`Demo1234!`) were documented in a code file that is tracked in version control. The credentials have been removed from the file. The three demo accounts (`trent.demo@wvf.app`, `isla.demo@wvf.app`, `melanie.demo@wvf.app`) must be manually deleted from the Supabase dashboard if they exist in production.

**6. No HTTP security headers**
The app was sending no browser security headers, leaving it open to clickjacking, MIME-sniffing attacks, and content injection. Fixed by adding the following headers to all responses:
- `X-Frame-Options: DENY` — prevents the app being embedded in another site
- `X-Content-Type-Options: nosniff` — prevents MIME-type confusion attacks
- `Strict-Transport-Security` — forces HTTPS
- `Referrer-Policy` — limits URL leakage to third parties
- `Permissions-Policy` — disables camera, microphone, and location access
- `Content-Security-Policy` — restricts which external services the app can connect to

**7. No dependency lockfile**
Without a lockfile, the app could install different package versions on each deployment, and vulnerability scanning (`npm audit`) could not run. A lockfile has been generated and committed.

**8. Critical vulnerability in Next.js (authorization bypass)**
`npm audit` revealed a critical CVE (GHSA-f82v-jwr5-mffw) in the version of Next.js in use, which could allow middleware authentication to be bypassed. Fixed by upgrading Next.js from `14.2.18` to `14.2.35`, the latest stable 14.x release, which patches this and 11 other vulnerabilities.

**9. Email notification endpoints open to any logged-in user**
Two internal API endpoints that send email notifications had no check on *who* was calling them. A client could have triggered emails containing other clients' data. Fixed by adding caller verification — the coach-reply notification now requires a coach session, and the check-in submission notification verifies the caller owns that check-in.

---

### Medium Priority — Data Handling & Hygiene

**10. App configuration exposed in client bundle**
An internal email "from" address was being embedded into the JavaScript sent to browsers via a misconfigured setting in `next.config.js`. Removed.

**11. Project reference ID in example configuration file**
The Supabase project reference (a unique identifier for the database) was hardcoded in a file tracked by version control. Replaced with a placeholder. The example file has also been updated to document all required environment variables for future developers.

**12. No input validation on client creation**
The API endpoint that creates new client accounts only checked that fields weren't empty — it didn't verify that the email was a valid email address, that the password met a minimum length, or that field lengths were within safe bounds. Added proper schema validation using the `zod` library, which returns clear error messages if invalid data is submitted.

---

### Low Priority — Logging & Code Quality

**13. User identifier logged to server logs**
An error message in one API route was including a user's internal ID in the log output. Changed to a generic message with no personal identifiers.

**14. Inconsistent email sending code**
One API route was sending emails using duplicated code rather than the shared email helper that exists for this purpose. Consolidated to use the shared helper, removing duplicate error-handling and API key references.

---

## What Remains (Non-Blocking)

The following items were identified but deferred as they are not launch blockers for a small-scale app:

| Item | Notes |
|---|---|
| **Rate limiting on API endpoints** | For a small number of known clients, existing auth checks are sufficient. Worth adding via Upstash or Vercel's rate limiting post-launch. |
| **Next.js 15 upgrade** | The remaining `npm audit` findings all require upgrading to Next.js 15, which involves breaking changes. The most critical vulnerability (auth bypass) is already resolved in the 14.2.35 upgrade. Plan as a separate post-launch project. |
| **TypeScript strict mode** | Enabling stricter TypeScript rules is good practice but requires a careful migration to avoid introducing new bugs. Recommended for a future sprint. |

---

## One Manual Step Still Required

After deploying the code changes, the following must be done manually in the Supabase dashboard:

### 1. Apply the database security migration

Go to **Supabase dashboard → SQL Editor → New query**, paste the contents of `supabase/migrations/0005_security_fixes.sql`, and click **Run**.

This applies the tightened check-in policies and the new storage access policies for `checkin-photos`.

### 2. Delete demo accounts (if they exist in production)

Go to **Supabase dashboard → Authentication → Users** and search for:
- `trent.demo@wvf.app`
- `isla.demo@wvf.app`
- `melanie.demo@wvf.app`

Delete any that are found. If none appear, no action is needed.

### 3. Confirm storage buckets are private

Go to **Supabase dashboard → Storage** and confirm the following buckets exist and have **Public** toggled **off**:
- `checkin-photos`
- `resources`

If any bucket is missing, create it with Public set to off.

---

## Files Changed

| File | Change |
|---|---|
| `src/app/auth/callback/route.ts` | Fixed open redirect |
| `src/middleware.ts` | Added coach role check |
| `src/app/(coach)/layout.tsx` | Added server-side role guard |
| `src/app/api/email/checkin-submitted/route.ts` | Added caller ownership check |
| `src/app/api/email/coach-replied/route.ts` | Added coach-only check, fixed UUID log, consolidated email helper |
| `src/app/api/coach/clients/route.ts` | Added zod schema validation |
| `next.config.js` | Added security headers, removed client-exposed config |
| `.env.local.example` | Removed real project ID, documented all required vars |
| `supabase/migrations/0003_seed_data.sql` | Removed plaintext demo passwords |
| `supabase/migrations/0005_security_fixes.sql` | New — checkins RLS + storage policies |
| `package.json` / `package-lock.json` | Next.js upgraded to 14.2.35, zod added, lockfile committed |

---

## Launch Readiness

The four critical and four high-priority issues identified in the original audit have all been resolved in code. Subject to the three manual Supabase steps above being completed, the app is considered ready for production launch.
