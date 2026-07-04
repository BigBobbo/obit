# Memorial Pages

A web app where families create **unlisted memorial pages** for deceased loved
ones. Visitors reach a page via a shared link or a QR code at the grave and can
contribute photos and written memories. Family-moderated, built to resist abuse
with near-zero platform-side ops.

Built per the PRD: Next.js (App Router) + TypeScript · Supabase (Postgres +
RLS, magic-link auth, Storage) · sharp · Claude API (Haiku) · Sightengine ·
Stripe · Resend · `qrcode` · Cloudflare Turnstile · Tailwind.

## Feature map

| PRD section | Where |
|---|---|
| Memorial page (noindex, feed, share, report) | `src/app/m/[slug]/` |
| Page creation (dedupe, Turnstile, rate limits) | `src/app/dashboard/new/`, `src/app/api/pages/route.ts` |
| Memory submission + email verification | `src/components/share-form.tsx`, `src/app/api/memories/` |
| Tier 0 hard blocks (PII/links, Sightengine, bans) | `src/lib/moderation/tier0.ts` |
| Tier 1 LLM scoring (Claude Haiku, structured JSON) | `src/lib/moderation/llm.ts` |
| Tier 2 routing (auto-publish / steward queue) | `src/lib/moderation/pipeline.ts` |
| Tunable thresholds + prompt (no redeploys) | `moderation_config` table |
| QR codes (PNG/SVG free, plaque PDFs paid) | `src/app/api/qr/[pageId]/route.ts`, `src/lib/pdf.ts` |
| Steward dashboard (queue, settings, co-stewards) | `src/app/dashboard/` |
| Reporting & escalation, admin panel | `src/app/api/reports/`, `src/app/admin/` |
| 90-day inactivity fail-safe, soft-delete purge | `src/app/api/cron/inactivity/route.ts` |
| Weekly digests | `src/app/api/cron/digest/route.ts` |
| EXIF stripping + image resizing | `src/lib/images.ts` |
| Freemium gating (Stripe Checkout + Portal) | `src/lib/plan.ts`, `src/app/api/stripe/` |
| RLS (DB-level permissions) | `supabase/migrations/0001_init.sql` |

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migrations in order in the SQL editor (or `supabase db push`):
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_storage.sql`
3. Auth → Providers: enable **Email** with magic links (disable passwords).
   Set the Site URL to your deployment URL and add
   `https://<your-domain>/auth/callback` to the redirect allowlist.
4. To make yourself platform admin:
   `update profiles set is_admin = true where email = 'you@example.com';`

### 2. Environment

Copy `.env.example` to `.env.local` and fill in the keys. Every integration
degrades gracefully in development (e.g. missing Turnstile keys skip the bot
check, missing Resend logs emails to the console), **but all keys are required
in production**.

### 3. Run

```bash
npm install
npm run dev
```

#### Local Supabase (optional, recommended)

Instead of a hosted project you can run the whole stack locally with the
[Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase start          # boots Postgres + Auth + Storage in Docker
supabase db reset       # applies migrations/*.sql in order, then seed.sql
```

`supabase/config.toml` configures ports and passwordless magic-link auth.
`supabase/seed.sql` creates a demo admin steward (`steward@example.com`), a
browsable memorial page, and a pending memory so the moderation queue isn't
empty. Sign in by requesting a magic link for that address and opening it in
Inbucket at <http://localhost:54324>. Point `.env.local` at the local URLs and
keys that `supabase start` prints.

## Continuous integration

`.github/workflows/ci.yml` runs `npm run typecheck` and `npm run build` on every
push to `main` and every pull request, so the default branch stays green. The
build runs with placeholder public env vars — since the app degrades gracefully
when integrations are unconfigured, a keyless build still type-checks every
route end to end.

### 4. Deploy (Vercel)

1. Import the repo into Vercel; set all env vars from `.env.example`.
2. `vercel.json` registers the two cron jobs (daily inactivity/purge, weekly
   digest). Set `CRON_SECRET` — Vercel sends it as the Authorization header.
3. Put the domain **behind Cloudflare (proxied/orange-cloud)** — required for
   CSAM scanning (below) and recommended for Turnstile.

### 5. Stripe

1. Create a product with monthly + annual prices; put the price IDs in
   `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_ANNUAL`.
2. Add a webhook endpoint `https://<domain>/api/stripe/webhook` with events
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`; put its secret in `STRIPE_WEBHOOK_SECRET`.
3. Enable the Customer Portal in the Stripe dashboard.

## CSAM scanning (Tier 0.1) — operational runbook

This tier is **non-negotiable** and runs first, but it lives at the CDN layer,
not in app code:

1. Proxy the production domain through **Cloudflare** (orange cloud).
2. Enable the **CSAM Scanning Tool** (Cloudflare dashboard → Caching →
   Configuration). Cloudflare scans served images against NCMEC hashes.
3. Register with **NCMEC** as a reporting ESP and complete Cloudflare's CSAM
   tool onboarding (it requires your NCMEC credentials).
4. On a match, Cloudflare blocks the URL and notifies you. Internal runbook:
   - Do **not** delete the underlying object (evidence preservation).
   - Freeze the page (admin panel), ban the contributor email/IP.
   - File a CyberTipline report with NCMEC within the legally required window.
   - Document everything in the audit log.
5. Sightengine (nudity/gore/violence) runs in-app **before** any image is
   stored, in `src/lib/moderation/tier0.ts`.

## Moderation tuning (no redeploys)

Thresholds and the Tier 1 prompt live in the `moderation_config` table
(single JSON row). Edit it in the Supabase dashboard; changes take effect
within 60 seconds (per-instance cache).

## Private beta

Set `BETA_INVITE_CODES=code1,code2` to require an invite code at signup.
Existing accounts always get in. Leave empty to open signups.

## Acceptance criteria → implementation notes

- **Unreachable by enumeration/search**: 12-char random IDs (~68 bits), no
  directory/sitemap, `noindex` metadata + `X-Robots-Tag` headers, robots.txt
  disallow, RLS hides anything non-public.
- **No EXIF/GPS on served photos**: every upload re-encoded via sharp
  (metadata dropped); originals private-bucket only.
- **Returning verified contributor auto-publish**: signed contributor cookie +
  `approved_count ≥ 1` + page in auto-publish mode → published with zero human
  action; borderline → steward queue immediately.
- **CSAM/nudity/gore never reach humans**: Sightengine rejects before storage;
  Cloudflare CSAM tool at the CDN; auto-rejected items never enter any queue.
- **91-day inactive page**: daily cron flips `active → inactivity_hold`
  (unless opted out); pipeline holds all new submissions; viewing unaffected;
  any steward dashboard/digest visit lifts the hold.
- **Phone/URL in guest text**: rejected by Tier 0 with a friendly message
  before any moderation or storage.
- **Free-plan fences**: second page, custom slug, plaque PDF and co-stewards
  are blocked server-side (`plan_limit` errors), not just hidden in the UI.
