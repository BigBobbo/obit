# PRD v2 — implementation notes

What was built against [`PRD-v2.md`](PRD-v2.md), the decisions taken along the
way, and what deliberately was not built.

## Scope

**Built:** §1 (the access model and the announcement surface) and §2 (the
week-one kit) in full, plus §3 (charity giving) behind a partner configuration
and a compliance checklist.

**Not built, by the PRD's own instruction:** §4 (Phase 3 — candles,
subscriptions, anniversary invitations) says its specs "live in the research doc
§4/§6; they'll get their own detailed PRD section when Phase 2 is underway", and
§6 (Phase 4 — Life Stories) says "direction agreed; not yet specced". Building
either from the research alone would be inventing a spec, so the sequencing
stands and nothing was started.

## Where each piece lives

| PRD v2 | What it is | Where |
|---|---|---|
| §1.1 | Access modes, code hashing, visitor cookie, the pure access decision | `src/lib/access.ts`, `src/lib/access-server.ts` |
| §1.1 | Code entry, access requests, pre-approval, silent declines | `src/app/api/pages/[id]/access/*`, `src/app/m/[slug]/access/verify/`, `src/app/api/access-requests/[id]/` |
| §1.2 | Announcement view, the gate, `noindex` metadata | `src/app/m/[slug]/page.tsx`, `src/components/access-gate.tsx` |
| §1.3 | Schema | `supabase/migrations/0005_access_and_week_one.sql` |
| §2.1 | Services, RSVP, `.ics`, past-event recession | `src/lib/events.ts`, `src/components/event-block.tsx`, `src/app/api/events/*` |
| §2.2 | Share card (OG image) and share sheet | `src/app/api/og/[pageId]/route.tsx`, `src/components/share-sheet.tsx` |
| §2.3 | Guided prompts, the norms line, kind declines, latency | `src/lib/prompts.ts`, `src/lib/decline-templates.ts`, `src/lib/latency.ts` |
| §2.4 | Free-for-now | `src/lib/plan.ts` (`ALL_FEATURES_FREE`) |
| §3 | Giving: partner adapter, donor-wall moderation, giving block | `src/lib/giving/*`, `src/components/giving-block.tsx`, `docs/giving-compliance.md` |

## Decisions on the open questions (§8)

1. **Default mode for new pages** — stays `link`. Following the PRD's lean. The
   creation flow is unchanged; a family chooses a gate in Privacy settings when
   they have a reason to, which is the moment they can actually judge it.
2. **RSVP fields** — name and party size only, following the lean. There is no
   message field, and the schema has no column for one: a message on an RSVP is
   a memory in the wrong place, and it would give the family a second queue to
   read in the week they have least time.
3. **Giving partner** — **Every.org**, the PRD's own candidate: full US
   registry, hosted checkout, webhook confirmations, 0%. Pledge.to remains the
   documented alternate, and everything goes through the `GivingPartner`
   interface so swapping it is one file. The live API shapes and the partner
   terms are *not* verified here and are tracked as launch blockers in
   `docs/giving-compliance.md`.
4. **Access-request notifications** — instant, always, rather than instant for
   30 days and digest afterwards. Deliberately simpler than the lean: a family
   who chose an approval gate is exactly the family for whom a slow queue does
   the damage, and a page that is still receiving access requests at day 31 is
   not a quiet page. Revisit with data rather than pre-building the switch.

## Deviations from the PRD's schema sketch

- `announcement_text` is `not null default ''` rather than nullable, matching
  the existing `bio` column's convention. The API treats empty as absent.
- `access_requests.name` allows the empty string, because a steward's
  pre-approval creates the row before anyone has told us their name.
- Emails are `text` with a `lower()` CHECK rather than `citext`, matching every
  other email column in the schema; `normalizeEmail()` handles it in app code.
- `access_requests` gains `verify_token` and `decided_at`, which the sketch
  omitted but the flow needs.
- `donations` has **no** RLS read policy, where the sketch implied a public
  donor wall. Per-donor amounts must never be displayed, and a column the anon
  key can read is displayed whether or not the UI renders it. The wall and the
  total are assembled server-side instead.
- Two columns on `pages` — `access_code_hash` and `bio` — are revoked from the
  anon and authenticated grants. The anon key ships in every browser bundle, so
  anything readable there is readable by the exact population a gate exists to
  keep out. A schema assertion fails if a later migration adds a column and
  forgets to grant it, so the narrowing stays loud.

## Success metrics (§7) — how each is measured

Utility metrics, not social metrics. Nothing here needs a new analytics vendor;
all of it is a query against data the product already keeps.

| Metric | Where it comes from |
|---|---|
| Announcement shares in week one | `audit_log` rows with `action = 'share_sheet_used'`, whose `meta` carries the surface and which button. No visitor identifier is recorded |
| Contributions from ≥5 distinct people | `count(distinct contributor_email)` over `memories` where `status = 'approved'`, grouped by page |
| Steward approval latency (p50 < 24h) | `memories.decided_at` minus the queue-entry time in `moderation_scores.routing.decided_at`. Only memories routed to `pending` count — see `src/lib/latency.ts` — and the steward's own median is shown on their dashboard |
| Access-request approval latency | `access_requests.decided_at` minus `verified_at` |
| Giving attach rate | pages with at least one `page_charities` row, over active pages |
| Pages still receiving memories at one year | `memories.created_at` more than 365 days after `pages.created_at` |

Explicitly absent: DAU, session counts, retention curves. A memorial that
nobody opens this month is not failing.

## What was verified, and what was not

Verified here:

- Migrations apply to a real Postgres, in order, and survive reset + re-apply.
- The RLS assertions run the actual gated query as `anon`, in each access mode.
- 187 unit tests, `tsc --noEmit`, `eslint`, and a production `next build`.

**Not** verified here, because the environment has no Supabase, no Docker and no
partner credentials:

- End-to-end browser flows (code entry, the approval email round trip, RSVP).
- Storage, Auth and PostgREST behaviour against a live Supabase project.
- The Every.org API and webhook against a live account — see
  `docs/giving-compliance.md`, where it is a launch blocker rather than an
  assumption.
