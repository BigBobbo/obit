# PRD v2 — Announcement, access, the week-one kit, and giving

**Status:** agreed direction, ready to implement
**Basis:** [`docs/research/2026-08-product-research.md`](research/2026-08-product-research.md) plus product decisions recorded below.
**Baseline:** the shipped MVP (unlisted pages, three-tier moderation, email-verified contributors,
QR plaques, weekly digests, steward dashboard).

## 0. Decision log (2026-08-28)

| Question | Decision |
|---|---|
| Positioning | **Private memorial + optional public announcement card.** From the announcement there must be a path into the memories, gated by **steward pre-approval or an access code** |
| Pricing | **Deferred.** Operate free-for-all for now (funded); keep existing plan fences in code but open them via config |
| Sequence | **Week-one kit first, then charity fundraising** — fundraising is accepted despite its compliance weight |
| Physical line | Deferred (plaque PDFs stay as-is) |
| Pre-death capture | **Roadmap it** (Phase 4 outline in §6) |

Everything in the research's "reject" list stays rejected: no discovery/directories, no feeds, no
algorithmic resurfacing, no like-counts, no tagging, no cross-memorial graph, no open creation, no
AI simulation of the dead.

---

## 1. The new privacy model: three access modes + an announcement surface

Today the memorial URL is the secret: anyone with `/m/<random_id>` sees everything. v2 splits
"knowing the page exists" from "seeing the memories."

### 1.1 Access modes (per page, steward-chosen, changeable anytime)

| Mode | Who sees the full memorial | Intended for |
|---|---|---|
| `link` *(default, current behavior)* | Anyone with the URL | Families who share the link only in trusted circles |
| `code` | Anyone who enters the page's **access code** | Wide announcement, soft gate — code printed on the order of service, shared at the funeral, told by word of mouth |
| `approved` | Visitors the steward has approved (or pre-approved by email) | High-sensitivity pages: contested families, public deaths, minors |

Design notes:

- **The code is a soft gate and we say so.** It protects against strangers, scrapers, and
  obituary-pirates — not determined insiders. Codes are short, human, family-chosen
  (e.g. `nana-rose`), lowercased/trimmed on entry, stored hashed, and **rotatable** by the
  steward (rotation invalidates existing visitor cookies).
- **Entry UX is grandma-first**: one large input, big type, no account, no password rules.
  A correct code sets a signed per-page visitor cookie (reuse the `contributor-cookie` signing
  pattern with a distinct purpose claim; respects `CONTRIBUTOR_COOKIE_SECRET` rules — no safe
  default in production).
- **Approved mode** reuses the machinery we have: visitor enters their email → magic-style
  verification link (same flow as memory verification) → lands in the steward's queue as an
  **access request** (name, email, optional "how did you know them?") → steward approves/declines
  from the dashboard. Steward can also **pre-approve emails** (paste a list) so close family gets
  in with no wait; pre-approved emails skip the queue on verification. Declines are silent
  (requester sees "the family will review your request" and nothing further — no rejection
  notification to manage).
- **Contribution is orthogonal to access.** Whatever the mode, sharing a memory still requires
  email verification and still flows through the moderation pipeline. Access mode gates
  *reading*; the pipeline gates *writing*. Reporting stays reachable from every surface,
  including the gate.
- RLS: `memories`/`photos` public-read policies become conditional on the page's access mode;
  `code`/`approved` reads go through server routes that check the visitor cookie/approval. The
  page row's announcement fields (below) stay publicly readable.

### 1.2 The announcement surface

When a page has announcement enabled, an unauthenticated visit to `/m/<id>` renders the
**announcement view** instead of a 404-adjacent wall:

- Portrait, full name, dates. Optional short announcement text (2–3 sentences, distinct from the
  bio — this is the death notice, not the life story).
- **Service details** (§2.1) that the steward marked as announcement-visible.
- The **giving block** once Phase 2 ships (§3) — in-lieu-of-flowers belongs on the announcement.
- The gate: "Enter the access code" or "Request access", per mode. In `link` mode there is no
  gate; announcement view only appears if the steward turns it on *and* sets a code/approval mode
  — for `link` pages the URL keeps behaving as today.
- **Still `noindex`.** The card's job is shareability (WhatsApp/text/email), not search. The
  research found no evidence that search indexing matters in week one; revisit only if a real
  discovery need shows up. OG metadata continues to expose exactly what the announcement shows:
  name, dates, cover photo — never memories or contributed photos.
- **Safety details**: the venue field encourages "venue name, town" and shows the steward a hint
  that publishing a home address alongside funeral times is a known burglary vector; home
  addresses are discouraged in help text, not blocked.

### 1.3 Schema sketch

```sql
alter table pages add column announcement_enabled boolean not null default false;
alter table pages add column announcement_text text;          -- short notice, moderated length cap
alter table pages add column access_mode text not null default 'link'
  check (access_mode in ('link','code','approved'));
alter table pages add column access_code_hash text;           -- null unless mode='code'
alter table pages add column access_code_rotated_at timestamptz;

create table access_requests (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  email citext not null,
  name text not null,
  relationship text,
  status text not null default 'pending' check (status in ('pending','approved','declined','preapproved')),
  verified_at timestamptz,                                    -- email verification, reused flow
  decided_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (page_id, email)
);
```

---

## 2. Phase 1 — the week-one kit

The funeral week is the only time a memorial circulates widely; the kit makes the page *useful*
that week so the family shares it instead of (or alongside) a Facebook post.

### 2.1 Service & event block

- `events` per page: type (visitation / service / burial / celebration of life / other), title,
  start time + timezone, venue name, locality, optional map link, optional livestream URL,
  optional notes ("dress colorfully"). Steward flags each event **announcement-visible** or
  memorial-only.
- **Light RSVP** (per event, steward-toggleable): "I'll be there" + name + optional party size.
  No accounts; Turnstile + rate limits like every other write; visible only to stewards as a
  count and list. No RSVP reminders, no calendar invites in v1 (an .ics download link is cheap
  and elder-friendly — include it).
- Events **recede after they pass**: the announcement leads with upcoming events; past events
  collapse into a single quiet line on the memorial ("Services were held on …"). The research is
  explicit that the page must outlive its funeral-week shape.

```sql
create table events (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  kind text not null check (kind in ('visitation','service','burial','celebration','other')),
  title text not null,
  starts_at timestamptz not null,
  tz text not null,
  venue text, locality text, map_url text, livestream_url text, notes text,
  on_announcement boolean not null default true,
  rsvp_enabled boolean not null default false,
  created_at timestamptz not null default now()
);
create table event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  party_size int not null default 1 check (party_size between 1 and 12),
  created_at timestamptz not null default now()
);
```

### 2.2 Share card

- OG image route (`/api/og/[pageId]`, Next `ImageResponse`): portrait, name, dates, and — when
  announcement-visible events exist — the next service line. Cached; regenerated on page edit.
- A **share sheet** on both surfaces: native share on mobile (Web Share API), copy-link,
  and prewritten text the sharer can edit ("We're remembering ___. Service details and a place
  to share memories: <link> — access code: ___" — the code line included only in the
  steward's own share sheet, never in the public one).
- Constraint: the OG image is fetched by every platform's scraper — it may contain only
  announcement-safe content (already our rule for OG metadata; the image route must enforce the
  same).

### 2.3 Guided prompts + moderation-as-care copy

- Share form gains 4–6 rotating prompts ("How did you meet?", "A moment that still makes you
  laugh", "Something they taught you", "A place you'll always associate with them"). Tapping a
  prompt seeds the textarea with the question as a heading. Static curated list in v1.
- House expectation line on the form ("Memories are shared with ___'s family before they
  appear") — the research (Matias 2019) shows visible norms increase participation.
- **Instant acknowledgment** after submission: "Your memory has been sent to the family." Email
  confirmation copy softened to match.
- **Kind declines**: when a steward declines, they pick from 3 gentle templates (or write their
  own); contributor receives it by email. Never a bare rejection (Jhaver 2019: unexplained
  removal suppresses return).
- **Instrument approval latency**: record `published_at`/`decided_at`; a later dashboard tile
  shows the steward their median response time. Approval latency is our conversion risk —
  measure before optimizing.

### 2.4 Free-for-now

- Add `ALL_FEATURES_FREE=1` env flag: `limitsFor()` returns the paid limits for everyone when
  set. Plan fences, Stripe routes, and tests stay intact — pricing is deferred, not deleted.

**Phase 1 acceptance criteria**

1. A `code`-mode page shows the announcement to a stranger, full memories after code entry, and
   the code survives browser restart (cookie) but not code rotation.
2. An `approved`-mode page lets a pre-approved email straight in after verification; an unknown
   email lands in the steward queue; decline is silent.
3. Scrapers (OG fetch, no cookie) can never retrieve memory text or contributed photos from any
   route on a gated page, including the OG image.
4. RSVP and code entry work without JavaScript-heavy interaction on a 320 px phone, big type.
5. Contributors receive the acknowledgment message on every submission path, and declines always
   carry a human-readable reason.

---

## 3. Phase 2 — charity giving ("in lieu of flowers")

Accepted with eyes open: this is the highest-compliance-weight feature we've chosen, and the
research is prescriptive about the constraints that keep it safe and on-brand.

### 3.1 Non-negotiables (from research)

- **Named, verified charities only.** Never free-form cash asks, never personal-beneficiary
  fundraising (that's GoFundMe's business and the scam ecosystem's favorite surface).
- **0% platform fee.** The consumer expectation is set (GoFundMe, Ever Loved); a for-profit
  percentage on funeral donations is reputationally radioactive (Legacy's Givealike scandal).
- **We never hold funds.** Donations flow donor → regulated processor → charity. This keeps us
  out of money-transmitter/charitable-solicitation territory and is the single biggest
  compliance de-risk available.

### 3.2 Design

- Steward attaches up to 3 charities to a page from a **verified 501(c)(3) directory partner**
  (candidate: Every.org's nonprofit API — full US registry coverage, hosted checkout, webhook
  confirmations, 0% platform pricing; evaluate Pledge.to as the alternate during
  implementation). US-only at launch, matching the research's market recommendation.
- The **giving block** renders on the announcement and the memorial: charity name + "in memory
  of ___" + donate button → partner-hosted checkout. Webhook records the donation (amount,
  optional donor name + short message).
- **Donor wall**: names/messages run through the existing moderation pipeline like memories
  (Tier 0 → LLM → steward routing). Amounts shown only as an aggregate ("$2,340 given in
  Maura's memory") — per-donor amounts are never displayed.
- Digest gains a giving line; steward dashboard gains a giving tab (totals, recent donors,
  export).

### 3.3 Compliance checklist (tracked as launch blockers for this phase)

- Confirm partner terms cover memorial/in-memory framing and our display of totals.
- ToS + page footer language: donations are made to the charity via the partner; we are not a
  fundraiser, receive no portion, and issue no receipts (partner does).
- Fake-fundraiser defense: the giving block is the *only* donation surface; Tier 0 already
  blocks links in memories — extend the block explicitly to payment/fundraising URLs so nobody
  can inject a competing "GoFundMe" into a tribute.
- Legal review checkpoint before launch (state charitable solicitation registration exposure —
  expected low given no-funds-touch, but verified, not assumed).

```sql
create table page_charities (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references pages(id) on delete cascade,
  ein text not null,
  name text not null,
  partner_slug text not null,          -- id in the partner's directory
  created_at timestamptz not null default now(),
  unique (page_id, ein)
);
create table donations (
  id uuid primary key default gen_random_uuid(),
  page_charity_id uuid not null references page_charities(id) on delete cascade,
  amount_cents int not null,
  currency text not null default 'usd',
  donor_name text,                     -- moderated before display
  donor_message text,                  -- moderated before display
  partner_ref text not null unique,    -- webhook idempotency
  status text not null default 'pending' check (status in ('pending','published','hidden')),
  created_at timestamptz not null default now()
);
```

---

## 4. Phase 3 — the texture layer (unchanged from research)

Sequenced after giving: candles (single warm gesture, anonymous-friendly, never paid, per page
and per memory) → visitor **subscriptions** fanning out the existing digest → **steward-initiated
anniversary invitations** to subscribers and past contributors. Specs live in the research doc
§4/§6; they'll get their own detailed PRD section when Phase 2 is underway.

---

## 5. Deferred, explicitly

- **Pricing** — free-for-now flag (§2.4); revisit with usage data. The research recommendation
  on record (one-time-first, $99–$179) stands as the default answer when we return to it.
- **Physical fulfillment** — plaque PDFs remain; no hardware.
- **Announcement indexing** — noindex everywhere until evidence demands otherwise.

## 6. Phase 4 (roadmap) — pre-death capture, working name "Life Stories"

Direction agreed; not yet specced. The shape the research supports:

- A living person (or a family member alongside them) receives a **gentle prompt cadence**
  (weekly email, phone-friendly): StoryWorth-style questions, answered in text or audio.
- Stories accumulate in a **private capture space** — same moderation-free zone as a draft, no
  visitors, exportable at any time (the permanence covenant applies pre-death too).
- On death, the family **converts** the capture space into a memorial page: stories become the
  archive's spine, the timeline pre-populated, the portrait chosen — the memorial opens *full*
  instead of empty, at the moment the family is least able to write.
- Hard lines carried over: the subject's stories are theirs (consent to convert is set by the
  subject in advance or by their chosen steward); no AI voice/persona synthesis, ever; AI may
  transcribe and suggest prompts only.
- Why it matters commercially (for when pricing returns): it acquires customers *before* the
  death, fixing the category's one-shot acquisition problem — the strongest structural finding
  in the research.

## 7. Success metrics

Utility metrics, not social metrics: announcement shares in week one (share-sheet taps),
contribution rate per page (target: memories from ≥5 distinct contributors on active pages),
steward approval latency (p50 < 24h), access-request approval latency, giving attach rate
(% of pages with a charity) — and, long-term, **pages still receiving contributions at one
year**. No DAU targets, by design.

## 8. Open questions (small, for next iteration)

1. Default mode for *new* pages once announcement ships: stay `link`, or default `code` with a
   suggested code at creation? (Lean: stay `link`; offer code mode in the creation flow as a
   one-tap option.)
2. RSVP: is name + party size enough, or do families want a message field? (Lean: no message —
   messages belong in memories.)
3. Giving partner: Every.org vs Pledge.to — decide on API/terms during Phase 2 spike.
4. Access requests: notify stewards instantly (like the existing instant queue notifications)
   or batch into the digest? (Lean: instant during the first 30 days of a page, digest after.)
