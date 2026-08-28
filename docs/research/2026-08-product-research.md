# Memorial Pages — market & product research

**Question:** should Memorial Pages grow into "something like Facebook, but for the dead" — and
more broadly: what should this product look like, why should it exist, who are the competitors,
and how does it make money?

**Method:** 13 parallel research agents ran ~550 web fetches and searches on 2026‑08‑28 across six
dimensions (direct competitors, adjacent players, features & grief UX, market need & startup
failures, revenue models, social mechanics), followed by a critic pass and six targeted
verification/gap sweeps. The full raw reports with all source links are in
[`appendix/`](appendix/). Every load-bearing claim below is sourced in those appendices;
claims that could **not** be verified are called out in §10.

---

## 1. Executive summary

**The research verdict on "Facebook for the dead": adopt Facebook's *texture*, reject its
*architecture* — and the current MVP is already on the right side of that line.**

- **Social texture** — candles/hearts on memories, subscribing to a page, anniversary
  invitations, a tribute stream, share tooling — is evidence-backed, grief-appropriate, and
  where this product should grow. It deepens the moat the MVP already has (moderation +
  privacy).
- **Social architecture** — public profiles, discovery/search, algorithmic feeds, reaction
  palettes, follower graphs, cross-memorial networks — is the single best-documented failure
  mode in this category. Every attempt died or pivoted: Respectance (2007, zombie),
  1000Memories (YC/Greylock; pivoted off memorials within a year, shut down 2013),
  Memories.net (raised **A$31M** for a "wholesome social network", retreated to funeral tools
  and $12/yr hosting fees), Chptr (pivoted from consumer social app to B2B broadcast), Eterni.me
  (never launched). Meanwhile "Facebook for the dead" already exists — it's Facebook, with 30M+
  monthly memorial-profile visitors — and its decade of retrofits (legacy contacts, Tributes
  tab, AI suppression of birthday reminders for the dead, tag-control tooling) is a catalog of
  what happens when unmodified social mechanics meet grief.
- **The psychology literature points the same way.** Documented harms of online mourning attach
  almost entirely to *public, algorithmic, feed-based* memorialization: RIP trolling (Phillips,
  First Monday 2011; the Sean Duffy conviction), grief tourism (MyDeathSpace), obituary-scam
  pipelines (the 2024+ AI fake-obituary ecosystem), and cruel algorithmic resurfacing (Eric
  Meyer's "inadvertent algorithmic cruelty"). The benefits (continuing bonds, communal
  storytelling) attach to moderated, consent-based spaces. Facebook's own Legacy Contact was
  built from academic work (Brubaker, CHI 2016) that concluded **stewardship, not ownership or
  open access, is the right model** — i.e., the world's largest social network converged on the
  architecture this MVP already ships.
- **Economically, this is a real but small-business category.** The one audited player
  (MuchLoved, UK charity) took ~15 years to pass £1M income and now runs ~27 staff at ~£200k/yr
  profit on funeral-director distribution. The 17-year family-direct incumbent (ForeverMissed)
  claims 310k families and looks founder-scale. No family-direct memorial company shows a
  verified venture-scale outcome; the national-monopoly outcome (RIP.ie, 60M page views/month)
  sold for ~€5M. Deathtech VC money went to B2B2C logistics (Empathy, $162M raised — paid by
  insurers, not mourners). **Plan for a profitable, near-zero-ops small business, not
  blitzscale — which is exactly what the MVP's architecture was built for.**

**Top strategic moves the evidence supports** (detail in §6–§8):

1. Add the **social texture layer**: candles (one warm gesture, not a reaction palette),
   subscribe-to-digest as the "follow", steward-initiated opt-in anniversary invitations, and
   moment-driven share tooling. No feeds, no discovery, no tagging, no like-counts.
2. Lead pricing with a **one-time "monument" fee** (market-validated band $99–$199) instead of
   subscription-first; keep the subscription as an optional multi-page family plan. Never gate
   safety or dignity behind the paywall (the MVP already gets this right).
3. Make **permanence the brand**: published data-export covenant, static-archive fallback,
   funded-hosting story. The category's most broken promise (1000Memories, Cake deleting user
   data, HereAfter shutting down with no self-serve export) is this product's cheapest, most
   credible differentiator.
4. Solve **distribution** deliberately — it is the hard problem for a noindex product. The three
   channels with evidence behind them: physical QR artifact retailed by monument dealers /
   funeral homes (Turning Hearts' exact model, ~50% wholesale margins), a chore-removal wedge
   for funeral directors (MuchLoved's donation logistics), and the per-death share burst
   (obituary card + service details + one-tap share in week one).
5. Treat the **QR plaque as a differentiator and paid feature, not the growth engine** — there
   is zero public evidence of grave-QR scan volume anywhere in the industry, cremation is
   heading to 82% by 2045, and the biggest QR-medallion vendor is a 4-person ~$400k/yr business.
   Extend the physical anchor to urns, benches, and framed keepsakes; instrument scan counts on
   our own plaques (we'd have data nobody else publishes).

---

## 2. Why this product should exist (and the honest case against)

### The need is real

- **The channel where death announcements lived for 150 years is collapsing.** ~3,500 US
  newspapers gone in two decades; 136 local outlets closed in the last year alone; 213
  full news-desert counties (Medill 2025). A newspaper obituary still costs **$200–$500
  typically, $800–$1,500+ in major metros**, plus photo fees. Death announcements migrated to
  funeral-home websites (bundled, generic, commerce-laden) and Legacy.com (public, SEO-driven,
  scam-prone).
- **Demand for online remembrance is proven at every layer**: 30M+ people visit memorialized
  Facebook profiles monthly; Find a Grave volunteers have built 265M+ memorials; GoFundMe hosts
  125k memorial fundraisers/yr ($330M/yr); StoryWorth has printed 1M+ legacy books. Bereaved
  people visit online memorials more often than physical graves (PMC scoping review).
- **The psychology supports it**: continuing-bonds theory (Klass et al. 1996) — the dominant
  modern grief frame — holds that an evolving connection with the deceased is healthy; studies
  of online memorials document real benefit (social support, communal remembering, "we do it to
  keep him alive"), **when the space is moderated and consent-based**.
- **RIP.ie proves a death-notice utility can win an entire country** when newspapers are slow
  and expensive — ~250k visits/day, used by Ireland's CSO for COVID excess-mortality stats. It
  also proves the ceiling: even a national monopoly was valued at ~€5M.

### The honest case against (steelman)

1. **One-time use, negative-emotion acquisition.** The customer arrives once, in crisis, via no
   plannable channel. CAC is structurally high; LTV structurally low.
2. **The free default already exists.** Legacy.com covers ~70% of US deaths; Tribute
   Technology (9,000+ funeral homes) and Tukios (10,000+) bundle a free public tribute wall
   into nearly every funeral; Facebook memorializes for free with the social graph pre-loaded.
3. **Engagement decays on a known curve.** Comments on memorial profiles decline steadily after
   death with spikes only at anniversaries/birthdays (Brubaker & Hayes, CSCW 2011, n=205k
   comments); 57% of bereaved say support tapered within 3 months. A DAU-driven product cannot
   survive this curve.
4. **"Forever" is an unfunded liability** the industry keeps defaulting on — which has taught
   consumers to distrust the promise.
5. **No venture-scale outcome exists** in family-direct memorials, anywhere, ever.

### The synthesis

The category punishes growth-product thinking and rewards **utility thinking**: near-zero
marginal ops (already true of this MVP), pulse-based engagement design (anniversaries and
digests, not feeds), monetization via one-time payments and physical artifacts, and
distribution through the death-care trade rather than consumer marketing. The conditions under
which this product works are unusually well matched to how it is already built.

---

## 3. Competitive landscape

### Direct competitors (full profiles: [appendix/01](appendix/01-direct-competitors.md))

| Platform | Channel | Privacy default | Pricing | Status / lesson |
|---|---|---|---|---|
| **Legacy.com** | Newspapers + funeral homes | Public, indexed | Family pays paper ($99–$1,930); flowers/ads | Dominant, drifting B2B. Its public model breeds the scam/troll problems we're built against |
| **Ever Loved** | Family-direct | Public; **privacy is the $199.99 upsell** | Free + one-time $199.99; 0%-fee fundraising | Proves families pay ~$200 *for privacy*; weak identity checks caused a false-obituary incident |
| **Forever Missed** | Family-direct | Configurable; contributor login required | $9.95/mo; $79.95/yr; **$159.95 lifetime** | Closest model analog; 17 years, ~310k families, founder-scale. Weaknesses: contributor registration friction, pay-or-lose anxiety |
| **Keeper (mykeeper)** | Family + funeral homes/cemeteries/hospices | Public↔private spectrum | Free / **$99 one-time** / $350 concierge + QR plaques | **Most direct competitor.** 13 yrs, 30+ staff, B2B-led. Not unlisted-by-design |
| **MuchLoved** (UK) | Funeral directors + charities | Configurable | Free; 3.2% donation fee | The charity model: £270M+ raised in-memory; ~70% of volume via funeral-director-created pages. **Distribution lesson: the wedge was donation logistics, not memorial pages** |
| **Memories.net** (AU) | Family + funeral homes | Private/password | $99 one-time + **$12/yr hosting fee** | Raised A$31M for a memory social network; retreated to funeral tools. The cautionary tale for the social thesis |
| **Kudoboard** | Family/colleague | Link-based | **$99 one-time memorial board** | Frictionless no-login contribution; the $99 memorial price point is now an industry standard (5–10× its birthday boards — grief pricing power) |
| **Tribute Archive** | Funeral homes (PE-owned Tribute Tech) | Public, indexed | Free to family; flower commissions | The default page most US families actually get — generic, commerce-laden. Our real incumbent |
| **Chptr** | Was consumer social → now funeral homes + TV | Public | $99–$2,500 packages | Pivoted from "YouTube for memorialization" to B2B broadcast infra. More evidence against consumer social |

**What nobody does well** (the opening): genuinely unlisted-by-default memorials; low-friction
contribution *with* real safety (others pick one); credible permanence guarantees; QR-to-grave
pointing at a *private* moderated page; family-direct economics without on-page necro-commerce;
in-memory charity fundraising outside the UK.

### Adjacent players (full profiles: [appendix/02](appendix/02-adjacent-players.md))

- **Facebook memorialization**: 30M monthly visitors; frozen accounts when no legacy contact was
  pre-set; lockout lawsuits (German BGH 2018); scam ecosystem. Validates demand and the steward
  model; demonstrates every failure of retrofitting social onto grief.
- **Find a Grave / BillionGraves**: 265M+ volunteer-built public memorials. The single loudest
  grievance in the whole space: **strangers controlling a dead person's page without family
  consent** (stranger-created pages within days of death; families begging for transfers).
  Positioning line, almost verbatim: *"Find a Grave is a public archive run by strangers; this
  is a private memorial run by your family."*
- **Pre-death memory capture** (StoryWorth $59–$199, bootstrapped, profitable, 1M+ books;
  Remento $99/yr): the proven, beloved side of "capture a life". A natural future adjacency:
  prompted life-story capture that converts to a memorial.
- **AI griefbots** (StoryFile Chapter 11; HereAfter AI shut down, users begging for their dead
  parent's recordings via a support email; Eternos pivoted out; Cambridge ethics warnings about
  "digital haunting"): stay out. Keep AI on the *curation* side — drafting help, transcription,
  photo restoration — never simulation of the dead.
- **End-of-life planning / after-loss logistics** (Empathy $162M raised via insurers; Cake and
  Lantern absorbed): the funded players monetize the *event* through B2B2C and leave the
  years-long *remembering* unowned — that's our ground, and possibly our partner channel.
- **QR grave-marker vendors** (Turning Hearts $79.99 2-pack, lifetime hosting promise, ~4
  employees, ~$400k/yr est.; Living Headstone since 2011; Scan2Remember $49.90): validate the
  concept, set the "$50–100 one-time, no monthly fees" consumer expectation, and all give away
  thin unmoderated software to sell hardware. The moderation/stewardship/privacy layer on top of
  a QR anchor is unclaimed.

---

## 4. "Facebook for the dead": adopt / adapt / reject

Grounded in the social-mechanics evidence ([appendix/06](appendix/06-social-mechanics.md)); the
strongest single finding is that **every documented RIP-trolling and scam vector requires
discoverability + open posting** — the two things this product already removed. The moat is the
architecture; social features get added *inside* it.

### Adopt (evidence-backed, low risk)

1. **One warm gesture, ritually named — "light a candle"** on a page and on individual
   memories. Not "like" (Wagner 2018: generic reactions violate mourning norms; every serious
   product renames the verb — MuchLoved candles, CaringBridge "amp" hearts, Legacy candles).
   Zero-text gestures also shrink the moderation surface. Never monetize the gesture (ObitTree's
   $10/mo candle is the canonical anti-pattern).
2. **Follow = subscribe to the digest.** CaringBridge shows subscription-to-email-updates is the
   natural "follow" for private grief spaces. Make "get updates about this memorial" an explicit
   opt-in on the page, steward-visible, per-recipient controllable. The weekly digest cron
   already exists — this turns it from steward-only into the page's social spine.
3. **Separate the archive from the tribute stream** (Facebook's 2019 Tributes-tab lesson): the
   person's curated story (bio, timeline, gallery) vs. the ongoing stream of visitor memories
   are different objects. Our page already leans this way; formalize it as two surfaces.
4. **Steward-initiated, opt-in anniversary invitations.** "Her birthday is in two weeks — would
   you like to invite people to share a memory?" sent only to verified past contributors and
   subscribers. Continuing-bonds research supports resurfacing; Facebook proved only the
   *unconsented, automated* version is cruel. Never algorithmically infer occasions or push to
   people who never opted in.
5. **Steward pruning power over everything, forever** — including previously approved content
   (the Hollie Gazzard case: an archive frozen at death can contain content that becomes
   unbearable). Largely built (remove-memory flow); keep it absolute.
6. **Moment-driven share tooling**: a shareable obituary/announcement card (image + link),
   service details, one-tap share to WhatsApp/email/Facebook. The only virality loop that
   demonstrably works in this category is need-driven week-one sharing (Ever Loved, GoFundMe) —
   and it runs on links, fully compatible with unlisted pages.

### Adapt with care

1. **Replies on memories**: flat, steward-approved, no threading (threading invites argument;
   flat walls invite parallel testimony). Runs through the existing moderation pipeline.
2. **Memorial fundraising / in-lieu-of-flowers**: huge proven demand and the strongest
   engagement driver on tribute pages (MuchLoved), but consumer expectation is **0% platform
   fee** and money attracts the 2024-era scam ecosystem. If built: named charities via a
   regulated processor (e.g. Stripe Connect to vetted charities), never free-form cash asks; a
   for-profit % fee on funeral donations is reputationally radioactive (Legacy's Givealike
   scandal).
3. **Steward succession**: extend the 90-day inactivity failsafe into a named-successor chain
   (what happens when the steward dies is both a real failure mode and a differentiating trust
   feature; Brubaker's stewardship research and Find a Grave's transfer wars both argue for
   explicit succession and dispute paths).
4. **Anniversary candle days**: a bounded window when the page invites candles — opt-in
   resurfacing with a start and an end, not an always-on feed.

### Reject outright

1. **Public discovery, directories, search, "nearby memorials", trending** — the precondition
   for RIP trolling, grief tourism, and obituary-pirate scraping. Unenumerability is the
   security model; no memorial product has ever realized network effects worth trading it for.
2. **Algorithmic resurfacing** ("memories of the departed" pushes) — Facebook needed an AI
   cleanup and public apology cycle for exactly this.
3. **Reaction palettes, like-counts, leaderboards, gamification** — norm violation; Find a
   Grave's points system manufactures family-vs-stranger conflict.
4. **Tagging living people** — imports notification pressure and identity disputes; even
   Facebook had to ship steward override tooling. Free-text names only.
5. **Cross-memorial social graphs** ("people you may have mourned with") — a persistent
   surveillance-adjacent structure nobody asked for.
6. **Open creation** ("anyone can memorialize anyone") — Find a Grave's core grievance and the
   fake-tribute scam vector. Creation stays family-anchored; consider a light "relationship to
   the deceased" attestation at page creation (Ever Loved's false-obituary incident shows the
   cost of skipping it).
7. **AI simulation of the dead** — bankruptcy, shutdowns, and ethics literature all point one
   way. AI stays assistive (obituary drafting, transcription), never generative of the person.

---

## 5. Grief-sensitive UX principles

Distilled from the HCI/bereavement literature and practitioner case studies
([appendix/03](appendix/03-features-and-grief-ux.md)):

1. **Grief is not a problem to solve** (Massimi & Baecker, CHI 2011). The product supports
   remembering; it never "fixes" grieving, measures progress, or gamifies anything.
2. **Design for the day-3 creator.** Acute grief measurably impairs memory and attention
   ("grief brain"), and obituaries are typically created within two days of death. Creation
   flow: one question per screen, everything resumable, minimal required fields, "take your
   time" microcopy, AI-draft assist with the family's voice.
3. **Design for decades, not the funeral week.** Contributions arrive as slow sediment over
   years; steward upkeep of the page is itself treasured grief work, not a burden to automate
   away. Keep "share a memory" permanently prominent; honor late additions.
4. **Notifications: ask, then honor the answer** (Eric Meyer). All reminders opt-in, granular,
   remembered "no"s, steward-controlled cadence, quiet options around anniversaries; loss
   content never framed celebratorily. Bloom & Wild's opt-out movement found customers who
   opted out became *more* loyal.
5. **The audience is old and mobile.** ~60% of obituary visitors are women 50+; 75%+ of obituary
   traffic is mobile; the QR graveside scan is 100% mobile, outdoors, one-handed, possibly in
   tears. Big type, big targets, no jargon, no app, no login wall to read, fast loads.
6. **Moderation must feel like care, not a queue.** The academic record (Wise 2006; Matias
   2019, PNAS; Jhaver 2019, CSCW) says visible, well-explained moderation *encourages*
   participation, while opaque rejection demotivates. Concretely: instant "your memory has been
   sent to [name]'s family" acknowledgment, house expectations shown on the form, kind
   explanations on declines, and **instrument time-to-approval vs. contributor return rate** —
   approval latency is our live conversion risk.
7. **Contribution friction is the participation killer.** ForeverMissed's register-to-condole
   requirement is its most-cited flaw; Kudoboard's no-login boards show the demand for
   frictionless contribution. Our email-verify + signed returning-contributor cookie is a good
   middle; keep it feeling like a magic link, never an account.
8. **Prompts beat blank boxes.** "I don't know what to write" is the universal blocker. Offer
   3–5 gentle prompts on the share form ("How did you meet?", "A moment you still laugh
   about…"). This is also where AI assistance is legitimate.

---

## 6. Feature roadmap vs. the current MVP

Gap analysis against the code as of this research (`src/app/m/[slug]/page.tsx` renders hero,
bio, flat memory feed, share + report; schema: pages, stewards, contributors, memories, photos,
reports, bans).

### Table stakes we already have
Unlisted pages, steward moderation queue, email-verified contributors, photo memories, QR
codes/plaque PDFs, weekly digests, reporting/escalation, freemium fences that never touch
safety.

### Table stakes we're missing (parity items)
| Feature | Notes | Existing hooks |
|---|---|---|
| **Service/event block** | Details, map link, RSVP count, livestream URL; designed to recede after the funeral. Table stakes on every competitor; the funeral week is when the page circulates | New `events` table; render on `m/[slug]` |
| **Obituary/announcement share card** | OG-image card (name, dates, portrait, service info) + one-tap share | OG plumbing exists in `generateMetadata` |
| **Guided prompts on the share form** | 3–5 rotating prompts | `share-form.tsx` |
| **Contributor acknowledgment + kind declines** | "Sent to the family" instantly; explanation on decline | moderation pipeline + email lib |
| **Anniversary/birthday reminder emails (opt-in)** | Expected on every paid platform; steward-configurable | digest cron + `date_of_birth/death` already stored |

### Differentiators to build next (the "social texture" layer)
| Feature | Why | Sizing |
|---|---|---|
| **Candles** (page + per-memory, anonymous-friendly, never paid) | The industry-consensus warm gesture; engagement with zero moderation surface | Small: `candles` table, rate-limited |
| **Subscribe to updates** (visitor-facing digest membership) | The privacy-correct "follow"; turns the digest cron into the social spine | Medium: `subscribers` table + digest fan-out + unsubscribe |
| **Timeline / life chapters** | Premium differentiator across guides; structures the archive surface | Medium |
| **Steward-initiated anniversary invitations** | The evidence-backed resurfacing pattern | Small once subscribers exist |
| **Audio memories** | Grief UX literature's favorite elder-accessible channel (Storii's phone-call capture); voice is the most emotionally dense medium | Medium; storage + moderation extension needed |
| **Keepsake book export** (print-ready PDF of approved memories) | Proven willingness-to-pay (Tribute Book; photo-book margins 50–70%); pairs with plaque PDFs in the paid tier | Medium: extends `pdf.ts` |
| **Data export + permanence covenant** | The category's biggest broken promise turned into our differentiator; also the answer to "what if you shut down?" | Small: ZIP export + a published policy page |
| **Steward succession** | Named successor + extended failsafe | Small–medium |

### Explicitly deprioritized
Family-tree linking (Keeper has it; low evidence of demand), multi-language (real gap but big
lift; revisit if a non-EN market becomes a channel), fundraising (see §4 adapt-with-care —
only with named charities), livestream hosting (link out instead; GatheringUs shows production
is an ops business), AI griefbots (never).

---

## 7. Revenue strategy

Full pricing tables and model analysis: [appendix/05](appendix/05-revenue-models.md);
verified unit economics: [appendix/12](appendix/12-gap-unit-economics.md).

**The market has converged on one-time "monument pricing"**: Keeper $99, Kudoboard memorial $99,
ForeverMissed $159.95 lifetime, Ever Loved $199.99 — it matches the buyer's mental model (a
memorial is a monument, purchased once, invisible next to a $7,000–$10,000 funeral) and avoids
the documented "rent on grief" backlash (Legacy's guest-book renewal emails are the canonical
scandal; ForeverMissed's angriest reviews are auto-renewal and pay-or-lose complaints).

**Recommended mix, in priority order:**

1. **One-time lifetime tier per memorial, $99–$179** (A/B within the validated band), unlocking
   custom slug, co-stewards, plaque PDF, keepsake book credit, media headroom. Safety and
   dignity stay free forever — our current plan split already honors this; the change is
   *one-time-first* rather than subscription-first. Keep the Stripe subscription as an optional
   multi-page "family plan" where recurring billing reads as an account fee, not rent on a
   grave. (Stripe products/webhooks already built; this is a pricing reshuffle, not a rebuild.)
2. **Physical artifact attach**: engraved QR medallion fulfillment ($59–$99, ~50% margins at
   Turning Hearts' own wholesale economics; extend anchors to urn/bench/frame given cremation
   trends) and the **printed keepsake book** ($49–$99). Physical goods are one-time, guilt-free
   (gifts *to* the deceased), buyable by extended family, and reinforce rather than fight the
   unlisted design.
3. **Fund the "forever" claim credibly**: publish what backs lifetime hosting (the Permanent
   Legacy Foundation's endowment model is the precedent — a $99 fee over-covers the NPV of
   hosting compressed media many times over), plus a static-archive/data-export covenant if the
   company ever winds down. This converts the sector's worst failure mode into the trust reason
   to choose us.
4. **Later, trade channel**: white-label memorial + plaque bundles wholesale to monument
   dealers/cemeteries at per-case pricing (Keeper's B2B playbook; Turning Hearts' reseller
   network) — *not* funeral-home flower-commission rev-share, which is the incumbent model and
   incompatible with a commerce-clean page.

**Never:** advertising (user revulsion per Legacy's own CMO; brand-safety tech demonetizes death
content anyway — 77% of The Economist's obituaries flagged "unsafe"; and a noindex product has
no inventory); percentage fees on donations; paid candles or any microtransacted grief gesture;
unfunded "forever" language.

**Expectations to hold:** freemium free→paid benchmarks are 2–5%; conversion concentrates at
moments of active intent (plaque/book purchase). Model the business on contribution-margin per
memorial and pages preserved over years — not DAU, not MRR growth curves.

---

## 8. Distribution — the actual hard problem

An unlisted, noindex product forgoes the channel (SEO) that built Legacy.com. The gap-fill
research ([appendix/07](appendix/07-gap-distribution-channels.md)) found **no documented case of
a standalone memorial-page startup succeeding via funeral homes referring a bare link** — homes
are locked into Tribute/Tukios bundles and are being actively coached that obituary traffic is
their revenue to defend. What works:

1. **The per-death share burst** (built into the product): announcement card + service details +
   fundraising-adjacent utility in week one, spreading by link through the family's existing
   channels (WhatsApp/text/email/Facebook). This is the only consumer loop with evidence.
2. **Physical product retail**: the plaque/medallion as the monument dealer's or funeral home's
   *margin item* (Turning Hearts ships resellers a counter display and 50 brochures with the
   first six-pack — the physical object sells the software). Monument dealers have no
   conflicting software incumbent.
3. **Chore-removal B2B**: MuchLoved won 2,500 funeral-director branches not with memorial pages
   but by removing the in-memory-donation admin chore (and charges directors from £40/month for
   it). A US analog worth exploring once the consumer product is proven.
4. **Organic story-telling social** (Turning Hearts' TikTok "scan moment" videos) — the one
   marketing motion that fits the product's emotional register; grief-targeted paid ads are
   policy-restricted and evidence-free.

**Watch-out from the demand-side gap check** ([appendix/08](appendix/08-gap-privacy-demand.md)):
there is **no quantitative evidence that families prefer unlisted memorials** — the validated
demand is *steward control and moderation*; the modal revealed preference on platforms offering
tiers is "shareable by link, gated contribution", which is what we are. But obituaries also have
an *announcement* job. Implication: keep unlisted as the default and identity, but consider an
optional public **announcement card** (name, dates, service info only — no memories, no photos
beyond the portrait, noindex still an option) so the page can do the week-one announcement job
without exposing the memorial itself. Instrument beta users' visibility choices; we'd be
generating the demand data the industry doesn't have.

---

## 9. Legal & regulatory ([appendix/10](appendix/10-gap-legal-regulatory.md))

- **UK Online Safety Act and EU DSA apply now** (user-to-user content, no small-service
  exemption from core duties). At current gated scale the burden is documentation-shaped
  (written risk assessments, complaints route, named accountable person) and our moderation
  stack already satisfies the substantive measures. **Every step toward open posting, discovery,
  or recommender features increases the compliance surface** — an independent argument for the
  gated design. Geo-limiting is the cheap full mitigation if UK/EU exposure ever bites; DSA
  requires a paid EU legal representative for non-EU providers that target the EU, so don't
  target the EU until it's worth it.
- **US is favorable**: Section 230 squarely protects the model, including steward and automated
  moderation.
- **France** allows heirs to demand cessation of processing of a deceased person's data — a real
  (if unlikely) collision with a non-family steward; handle via ToS + a documented
  family-dispute process.
- **BGH 2018** (Facebook inheritance case): heirs' claims can override platform memorial policy.
  Design steward succession and ToS with inheritance explicitly in mind (§6).
- **Photo copyright** sits with contributors and is inheritable — the ToS license grant matters;
  ours should cover post-mortem continuation.

---

## 10. Research hygiene: corrections and unverified claims

The critic pass caught one significant confabulation and several soft spots — kept here so we
don't build on them:

- **Dropped:** "moderated guest books get ~2x more entries; 92% of families value screening."
  Could not be sourced anywhere; likely a quantification of Digiday's *qualitative* claim. Use
  the verified weaker form: Legacy dedicates 85 of 200 staff to screening, filters ~25% of ~1M
  monthly entries, and attributes its acquired rival's weaker engagement to delegating
  screening — plus the independent academic evidence that visible, explained moderation helps
  participation ([appendix/11](appendix/11-gap-moderation-stat-verification.md)).
- **Unverified:** grave-QR scan rates (no vendor or cemetery publishes any); Keeper's claimed VA
  Veterans Legacy Memorial relationship; Memories' Afterlife.com acquisition figures; all
  company user counts (Keeper "5M pages", Memories "9M users") are marketing claims; Ever
  Loved's post-2020 trajectory (six years of press silence); ForeverMissed pricing was
  triangulated (their pricing page blocks bots — later verified first-party at $9.95/$79.95/
  $159.95); Denmark/Hungary post-mortem data rules (probable, not primary-sourced).
- **Bias notes:** several comparison guides used are themselves memorial vendors; company scale
  claims are self-reported throughout.

---

## 11. Open design questions (for iteration)

1. **Positioning: "private memorial" vs. "memorial with an announcement layer."** Pure-unlisted
   is the safest and most differentiated identity, but the demand evidence says the announcement
   job matters. Ship the optional public announcement card, or stay 100% unlisted?
2. **Pricing pivot: one-time-first.** Move to lifetime-per-memorial as the lead SKU (keeping the
   subscription as the multi-page family plan)? At what price — $99 (market floor, Keeper/
   Kudoboard) or $149–$179 (privacy premium, still under Ever Loved)?
3. **Which texture features first?** Recommended order: candles + subscribe/digest + service
   block + share card (the week-one kit), then anniversary invitations, then keepsake book +
   audio memories. Agree, or is fundraising (in-lieu-of-flowers, named charities, 0% fee) worth
   pulling forward as the week-one hook despite its scam/compliance weight?
4. **Physical line: how far?** Plaque PDF only (status quo) → fulfilled engraved medallions →
   urn/bench/frame anchors. Fulfillment adds ops; the research says physical is the profit
   engine and the only offline acquisition surface.
5. **Pre-death capture** (StoryWorth-style prompted life stories that convert to a memorial on
   death): the strongest long-term adjacency in the research — proven economics, no griefbot
   ethics, and it fixes the one-time-use problem by acquiring customers *before* the death. But
   it's nearly a second product. Roadmap it, or stay post-death only?
6. **Market focus:** US-only at launch (Section 230, no DSA rep, biggest spend)? The research
   flags Ireland/UK as culturally primed (RIP.ie habit, MuchLoved's model) but heavier on
   compliance.

---

*Raw research with full source lists: [`appendix/`](appendix/). Researched 2026‑08‑28.*
