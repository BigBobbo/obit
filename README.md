# Memorial Pages

A web app where families create **private memorial pages** for deceased loved
ones, with an optional **public announcement** for the funeral week. Visitors
reach a page via a shared link or a QR code at the grave; the family chooses who
can read the memories. Family-moderated, built to resist abuse with near-zero
platform-side ops.

Built per the PRD: Next.js (App Router) + TypeScript · Supabase (Postgres +
RLS, magic-link auth, Storage) · sharp · Claude API (Haiku) · Sightengine ·
Stripe · Resend · `qrcode` · Cloudflare Turnstile · Tailwind.

## Feature map

### v2 — access, the week-one kit, and giving

Built against [`docs/PRD-v2.md`](docs/PRD-v2.md); the decisions, deviations and
what was deliberately left unbuilt are in
[`docs/PRD-v2-implementation.md`](docs/PRD-v2-implementation.md).

| PRD v2 section | Where |
|---|---|
| Access modes (`link` / `code` / `approved`) and the visitor cookie | `src/lib/access.ts`, `src/lib/access-server.ts` |
| Code entry, access requests, pre-approval, silent declines | `src/app/api/pages/[id]/access/`, `src/app/m/[slug]/access/verify/` |
| Announcement surface and the gate | `src/app/m/[slug]/page.tsx`, `src/components/access-gate.tsx` |
| Services, RSVP and `.ics` | `src/lib/events.ts`, `src/components/event-block.tsx`, `src/app/api/events/` |
| Share card (OG image) and share sheet | `src/app/api/og/[pageId]/`, `src/components/share-sheet.tsx` |
| Guided prompts, kind declines, approval latency | `src/lib/prompts.ts`, `src/lib/decline-templates.ts`, `src/lib/latency.ts` |
| Charity giving, and its compliance checklist | `src/lib/giving/`, [`docs/giving-compliance.md`](docs/giving-compliance.md) |
| Free-for-now (`ALL_FEATURES_FREE`) | `src/lib/plan.ts` |

### v1 — the MVP underneath

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
| Report lifecycle (steward → admin → reporter follow-up) | `src/lib/reports.ts` |
| Co-steward request flow | `src/app/m/[slug]/join/`, `src/app/api/steward-requests/` |
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
   - `supabase/migrations/0003_hardening.sql`
   - `supabase/migrations/0004_report_lifecycle.sql`
   - `supabase/migrations/0005_access_and_week_one.sql`
   - `supabase/migrations/0006_giving.sql`
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

Two of them are enforced rather than assumed. `TURNSTILE_SECRET_KEY` and the
`SIGHTENGINE_*` pair fail **closed** when `NODE_ENV=production`: an unset
Turnstile key rejects every submission, page creation and report, and unset
Sightengine credentials reject every photo upload. Skipping a safety check is a
silent failure that nothing alerts on, so production refuses the request
instead. **Set both before deploying, or the live site will turn contributors
away.**

`CONTRIBUTOR_COOKIE_SECRET` likewise has no safe default. It signs two bearer
cookies — the one that lets a returning contributor skip email verification, and
the per-page one that opens a gated memorial — so the app refuses to sign or
read either in production without it. Generate one with
`openssl rand -base64 32`.

`ALL_FEATURES_FREE=1` opens every plan fence for everyone (PRD v2 §2.4).
Pricing is deferred, not deleted: the fences, the Stripe routes and their tests
all stay in place, so coming back to pricing is a config change.

Charity giving is **off** unless `GIVING_PARTNER` and the partner keys are set,
and it should stay off until the launch checklist in
[`docs/giving-compliance.md`](docs/giving-compliance.md) is complete.

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
`supabase/seed.sql` creates a demo admin steward (`steward@example.com`), an
open memorial page with a pending memory so the moderation queue isn't empty,
and a **code-gated page with an announcement and three services** so the gate,
the announcement view and the service block are all browsable. Its access code
is `nana-rose`. Sign in by requesting a magic link for that address and opening
it in Inbucket at <http://localhost:54324>. Point `.env.local` at the local URLs
and keys that `supabase start` prints.

### 4. Deploy (Vercel)

1. Import the repo into Vercel; set all env vars from `.env.example`.
2. `vercel.json` registers the two cron jobs (daily inactivity/purge, weekly
   digest). Set `CRON_SECRET` — Vercel sends it as the Authorization header.
   Both jobs declare `maxDuration = 60` to stay inside the Hobby tier's cap and
   work in batches of 100, so a run that hits the ceiling resumes next time
   rather than being killed mid-purge. The digest accepts `?after=<page id>`
   and returns `nextCursor` when more pages remain; both jobs write a
   completion record to the audit log.
3. Put the domain **behind Cloudflare (proxied/orange-cloud)** — required for
   CSAM scanning (below) and recommended for Turnstile.

### 5. Stripe

1. Create a product with monthly + annual prices; put the price IDs in
   `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_ANNUAL`.
2. Add a webhook endpoint `https://<domain>/api/stripe/webhook` with events
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`; put its secret in `STRIPE_WEBHOOK_SECRET`.
3. Enable the Customer Portal in the Stripe dashboard.

### 6. Charity giving (optional, and gated on a checklist)

Giving stays off until `GIVING_PARTNER`, `EVERY_ORG_API_KEY` and
`EVERY_ORG_WEBHOOK_TOKEN` are all set — and it should stay off until every box
in [`docs/giving-compliance.md`](docs/giving-compliance.md) is ticked by a
person. The three constraints the design rests on are not preferences: named
verified 501(c)(3) charities only, 0% platform fee, and **we never hold funds**.
Register the partner webhook against `POST /api/giving/webhook` with the same
token you put in `EVERY_ORG_WEBHOOK_TOKEN`.

## Tests

```bash
npm test          # vitest, no database required
npm run test:watch
npm run lint
```

The suite covers the decisions that have to be right when nobody is watching:

| Area | File |
|---|---|
| Tier 2 routing matrix (publish / queue / reject, and the degraded paths) | `tests/pipeline.test.ts` |
| Tier 0 hard blocks — PII patterns, bans, contributor blocks | `tests/tier0.test.ts` |
| Page-reference validation that keeps pages unenumerable | `tests/find-page-by-ref.test.ts`, `tests/ids.test.ts` |
| Moderation config merge — a partial dashboard edit must not disable moderation | `tests/moderation-config.test.ts` |
| Returning-contributor cookie signing, tampering, expiry | `tests/contributor-cookie.test.ts` |
| Freemium fences, and that none of them touch moderation | `tests/plan.test.ts` |
| Report lifecycle — steward escalation, and what may auto-close | `tests/reports.test.ts` |
| Which steward actions a memory accepts in each state | `tests/memories.test.ts` |
| Co-steward request approval state machine | `tests/steward-requests.test.ts` |
| Safety integrations failing closed in production | `tests/fail-closed.test.ts` |
| Access codes, the visitor cookie, and who the gate admits | `tests/access.test.ts` |
| Events: timezone arithmetic, past-event recession, `.ics` escaping and folding | `tests/events.test.ts` |
| Prompts, decline reasons that are never empty, approval latency | `tests/moderation-as-care.test.ts` |
| Giving: webhook authentication, donor-wall routing, the fundraising block | `tests/giving.test.ts` |

`tests/helpers/supabase-stub.ts` is a small in-memory stand-in for the
supabase-js query builder, so the pipeline tests run without Postgres. Anything
that depends on RLS actually behaving still needs a database — see the local
Supabase section above.

## Continuous integration

`.github/workflows/ci.yml` runs `npm run lint`, `npm run typecheck`, `npm test`
and `npm run build` on every push to `main` and every pull request, so the
default branch stays green. The build runs with placeholder public env vars —
since the app degrades gracefully when integrations are unconfigured, a keyless
build still type-checks every route end to end.

The lint config carries one project-specific rule: interpolating a value into a
PostgREST `or()` filter is an error. Filter strings are not parameterised, and a
URL-supplied page reference in one is what made memorial pages enumerable. Use
`eq()` lookups, or `findPageByRef()` for pages.

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

Editing one threshold is safe: the row is validated and merged over the
defaults key by key, so anything you leave out keeps its default rather than
becoming undefined. A row that fails validation is rejected wholesale with an
error in the logs and the defaults stay in force — the pipeline never runs with
a half-populated threshold set.

## Report lifecycle

A report is never allowed to disappear quietly (PRD §4.6):

1. **Memory reports go to the stewards.** The family is emailed, sees the
   reported memory in full on their dashboard, and can keep it, remove it,
   remove-and-block the contributor, or hand it to the platform admin. Removing
   a memory works whether or not it is already published.
2. **Page-level reports, and anything CSAM/illegal, go straight to the admin.**
3. **Steward non-response escalates.** A memory report untouched for
   `STEWARD_RESPONSE_DAYS` (7) moves to the admin queue on the daily cron —
   ignoring a report surfaces it rather than burying it.
4. **Auto-close needs an unanswered question.** The admin's "Ask the
   reporter…" action emails a follow-up carrying a per-report capability token
   and parks the report in `awaiting_reporter`. Only *that* state auto-closes,
   30 days later, and never for CSAM/illegal. A report nobody has asked about
   stays in the queue until a human closes it.

`src/lib/reports.ts` holds those rules as pure functions; `tests/reports.test.ts`
covers the boundaries.

## Access modes (PRD v2 §1)

A steward chooses, per page, who can read the memories:

| Mode | Who gets in | For |
|---|---|---|
| `link` *(default)* | anyone with the URL | today's behaviour, unchanged |
| `code` | anyone who enters the family's short code | a wide announcement with a soft gate |
| `approved` | people the steward admits, or pre-approved emails | contested families, public deaths, minors |

Three properties are worth knowing before changing any of it:

- **The code is a soft gate and the UI says so.** It stops strangers, scrapers
  and obituary-pirates; it does not stop somebody who was told the code.
- **Access gates reading; the pipeline gates writing.** Sharing a memory needs
  email verification and full moderation in every mode, and reporting is
  reachable from every surface including the gate.
- **The anon key is public.** Anything an anon `select` can reach is effectively
  published, which is why `access_code_hash` and `bio` are revoked from the
  grant, `donations` has no read policy at all, and gated pages serve
  contributed photos through an access-checked route rather than the public
  storage bucket. `supabase/tests/schema-assertions.sql` runs those queries as
  `anon` and fails if any of them starts returning rows.

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
  are blocked server-side (`plan_limit` errors), not just hidden in the UI —
  and open for everyone while `ALL_FEATURES_FREE=1`.

### PRD v2 Phase 1

- **A `code` page shows a stranger the announcement, the memories after code
  entry, and survives a restart but not a rotation**: the visitor cookie is
  persistent (180 days) and carries the code's rotation timestamp inside its
  signature, so rotating the code invalidates every cookie minted under the old
  one. `tests/access.test.ts`.
- **A pre-approved email is admitted straight after verification; an unknown
  one lands in the queue; declines are silent**: one emailed link both proves
  the address and opens the page once the family says yes. Declining sends
  nothing, and a declined requester keeps seeing the same neutral sentence as
  everyone else — including when they ask again.
- **No cookie-less request retrieves memory text or contributed photos from a
  gated page, including the OG image**: RLS filters `memories` and `photos` on
  the page's access mode (asserted by running the query as `anon` in
  `supabase/tests/schema-assertions.sql`), gated pages serve photos through an
  access-checked route instead of the public bucket, and the OG image route
  renders announcement fields only. One honest limit: a rendition URL somebody
  saved while a page was open keeps working after it is gated — the privacy
  settings say so rather than letting a family assume otherwise.
- **Code entry and RSVP on a 320 px phone**: single fields at `h-14`/`h-12`
  with 18–24 px type, full-width buttons above the 44 px touch target, and no
  interaction that needs two hands.
- **Every submission acknowledged, every decline explained**: the acknowledgment
  is on the form and in the receipt email; `resolveDeclineReason()` has no input
  that yields an empty reason, and the auto-rejected and reported paths carry
  their own wording.
