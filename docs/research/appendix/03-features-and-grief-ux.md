# What a Modern Memorial Platform Should Look Like: Features, Grief-Sensitive UX, and IA

Research date: 2026-08-28. Sources are cited inline; conflicting or weakly-sourced figures are flagged. Comparison-guide sources (myfarewelling, online-tribute, getmemorial) are themselves memorial vendors — feature facts were cross-checked against product sites where possible, but treat their rankings as biased.

## 1. Canonical Feature Inventory Across Real Memorial Products

### Platforms examined
Ever Loved (everloved.com), ForeverMissed, Keeper (mykeeper.com), MuchLoved (UK charity), GatheringUs, Memories.net, Legacy.com, Tribute Technology (funeral-home B2B), Turning Hearts (QR medallions), Storii (audio memoirs), Empathy (B2B2C loss support), plus 2025–26 comparison guides.

### Feature matrix — who has what

| Feature | Status | Evidence |
|---|---|---|
| Obituary/biography | **Table stakes** | Baseline on every platform; comparison guides list "photo gallery, biography/obituary, memory wall/guestbook, service details" as the expected baseline (online-tribute.com guide) |
| Photo/video gallery | **Table stakes** | Universal; Keeper offers "unlimited photos and videos" free |
| Guestbook / tribute wall / condolences | **Table stakes** | Universal; Legacy.com passed 100M guest book entries and logs ~1M entries/month (sales.legacy.com; Slate 2017) |
| Funeral event details | **Table stakes** | Universal (Ever Loved, MuchLoved funeral notices, all funeral-home platforms) |
| Virtual candles | **Table stakes on consumer platforms** | Free on ForeverMissed and MuchLoved; rooted in real cross-faith ritual (yahrzeit, votive, Buddhist rites — funeral.com). Valued when free, resented when monetized (see gimmicks) |
| RSVP + livestream | **Table stakes for the funeral window, differentiator afterward** | Ever Loved: multiple events, RSVPs, attendee messaging, livestream links — all free. NFDA 2025: >50% of member funeral homes offer livestreaming, 13.9% more plan to; 64% of consumers interested (cremation.green summarizing NFDA 2025 Consumer Awareness & Preferences Study) |
| Funeral crowdfunding / charity in-lieu-of-flowers | **Differentiator (Ever Loved's moat; MuchLoved's whole model)** | Ever Loved: zero platform fee, only Stripe 2.9%+30¢ (support.everloved.com). MuchLoved: registered UK charity (No. 1118590), 2,000+ funeral director and 15,000+ charity partnerships |
| Anniversary/birthday reminder emails | **Common, expected on paid platforms** | ForeverMissed emails on birthday + death anniversary, with per-audience controls and full disable; Keeper offers anniversary push notifications (comparison guides) |
| Life timeline | **Differentiator** | Explicitly a premium-tier differentiator in guides; absent from MuchLoved, Memories.net |
| Family-tree linking | **Differentiator (rare)** | Keeper is the main consumer platform with it |
| Audio memories | **Differentiator, growing** | Storii: automated phone calls (works on landlines), 1,000+ prompts, auto-transcription, audiobook/PDF export, $99/yr (storii.com/pricing). Turning Hearts profiles accept audio clips |
| Collaborative storytelling prompts | **Differentiator** | Keeper "collaborative life stories"; Storii's prompt bank; guides praise guided flows over blank text boxes |
| Printed keepsake books | **Differentiator with proven B2B demand** | Tribute Technology's "Tribute Book" auto-compiles the obituary page (text, photos, condolences, service info) into a hardcover (tributetech.com/tribute-book) |
| QR grave plaques | **Fast-normalizing differentiator** | Keeper sells "KeeperQR" plaques; Turning Hearts sells a $79.99 aluminum medallion + free unlimited profile, lifetime warranty, sold via Amazon, with significant TikTok/Instagram traction (turninghearts.com, Amazon listings, memorialmerits.com review) |
| AI-assisted obituary writing | **Rapidly becoming table stakes in the funeral trade** | Keeper launched an AI obituary assistant; Passare's AI tool "has written tens of thousands of obituaries"; ~60% of small US daily newspapers use AI-assisted obit tools (webpronews.com/aicommission.org — secondary sources, treat the 60% figure as indicative). Ethical debate centers on authenticity; hybrid AI-draft + human-edit is the accepted pattern |
| Multi-language | **Rare / underserved** | No major platform advertises full multi-language memorials; one comparison mentioned EN/DE/FR/ES creation on an alternative platform. Could not verify robust multi-language support anywhere — genuine gap |
| Virtual memorial events (facilitated) | **Niche premium service** | GatheringUs: professionally produced virtual services, ~$300+ (myfarewelling) — event-focused, not a page product |

### Pricing landscape (verified where possible)
- **Ever Loved**: free forever, indefinite hosting, no donation platform fee; premium **one-time $199.99** — and notably, *password protection and contribution restrictions are paid features* (support.everloved.com). Memorial Pages gives away what Ever Loved charges $200 for.
- **ForeverMissed**: free basic; premium ~$8.99–9.95/mo, ~$75–160 lifetime — sources conflict ($74.99/yr and $154.99 lifetime per one guide; $9.95/mo and $159.95 lifetime per another; forevermissed.com/ourplans is the authority but blocks fetching). ~18-year track record; ad-free; "dated templates" is the recurring criticism.
- **Keeper**: free basic, lifetime under ~$100, funeral-home partnerships, native iOS app, mobile-first.
- **MuchLoved**: entirely free (charity). **Legacy.com**: free to visitors, monetized via ads + flowers ("cross-platform e-commerce engine"; flower revenue rivals ad revenue; 30–40M monthly uniques; ~3.5M obits/yr covering >70% of US deaths — Slate 2017, legacy.com press).
- Watch-out documented in guides: "free forever" pages that get quietly archived after a year unless upgraded (getmemorial.com blog claim).

### Gimmicks and anti-patterns (with evidence)
- **Paid symbolic gestures**: ObitTree charged **$10/month to keep a virtual candle "lit"** ($50/yr "perpetual") — called out by Slate as exploitative ("$10 is more than enough to host an entire website for a month"). Virtual candles are meaningful *as free ritual*, toxic as microtransactions.
- **Commercial clutter**: guides explicitly compare "page real estate devoted to platform branding, partner promotions, and commercial prompts" vs. tribute content; Legacy.com/Tribute Store flower-and-tree upsells on obituary pages are the canonical example (tributetech.com/tribute-store profit-shares with funeral homes). Slate: grieving users are "ripe for exploitation" — hidden fees, unwanted newsletters, data sharing.
- **AI griefbots/deadbots**: Cambridge researchers (Hollanek & Nowaczyk-Basińska, *Philosophy & Technology* 2024) call for safeguards: consent from data donors before death, opt-out protocols giving users "emotional closure," no advertising via deadbots, age restrictions (cam.ac.uk). StoryFile-style avatars generate press but sit on the wrong side of the trust line for a privacy-first product.
- **SEO-driven obituary aggregation**: Tribute Tech's Oct 2025 study says funeral homes lose up to 260 sessions per obituary to third-party aggregators — the enumerable-public-directory model is itself widely resented in the industry. Memorial Pages' unlisted/unenumerable stance is the direct opposite of this disliked pattern.

## 2. Grief-Sensitive Design: What the Research Says

### Foundational HCI work
- **Thanatosensitivity** (Massimi & Charise, CHI 2009): design that "actively integrates the facts of mortality, dying, and death" across the software lifecycle (dgp.toronto.edu PDF; semanticscholar.org).
- **Massimi & Baecker, "Dealing with Death in Design" (CHI 2011)** — read in full (primary PDF). Nine guidelines, verbatim distillation:
  1. **Grief is not a problem to be solved** — systems that try to "fix" grief are disrespectful and potentially maladaptive.
  2. **Communication is complicated** — allow the bereaved to choose silence, disconnection, isolation.
  3. **Family and friends are not as helpful as one may think** — pre-existing relationships complicate support; consider extra-familial support.
  4. **Support storytelling** — recalling memories, sense-making.
  5. **Relationships don't die** — acknowledge the loss and support the *new form* of the relationship (continuing bonds).
  6. **Make making meaningful** — creating/personalizing an artifact is itself grief work; support solo and group creation.
  7. **Allow many things over time** — heterogeneous media (photos, clothing, music, places), added slowly ("sediment"); **upkeep of the collection is a treasured activity, not a burden to automate away**.
  8. **Control mourning symbols** — the bereaved must control how visibly they mourn; systems must be easy to ignore or conceal.
  9. **Life goes on** — grieving is only one part of the user's life.
  The paper's "materiality" findings (heterogeneity / sediment / upkeep) map directly onto memorial pages: accept mixed media, expect contribution over years not weeks, and treat steward gardening of the page as a feature.
- **Continuing bonds** (Klass et al. 1996) is the dominant modern grief frame: ongoing connection with the deceased is normal, not pathological. A 2023 grounded-theory study of Facebook memorial pages ("He's Still There," PMC10647902) found the bereaved post messages *to* the deceased, revisit their content, and turn individual remembering into communal remembering; benefits were social support and felt presence; **documented harms were distress at others' posts and pain when community participation declined over time** — an argument for features that sustain long-tail engagement (anniversary prompts, story prompts) rather than launch-week spikes. Bereaved people visited online memorials **more frequently than physical cemeteries** (Marwick/PMC scoping literature).
- **Facebook Legacy Contact** (Brubaker & Callison-Burch, CHI 2016, jedbrubaker.com PDF): post-mortem stewardship designed around four duties — honor last requests, provide information surrounding the death, preserve memory, facilitate memorializing — with the legacy contact able to post a pinned message, manage profile photos, and **moderate incoming condolences**. This is the strongest academic validation of Memorial Pages' steward-moderated model: the biggest platform in the world converged on the same architecture.

### Notification etiquette: comforting vs. devastating
- **Eric Meyer's "Inadvertent Algorithmic Cruelty" (meyerweb.com, Dec 2014)**: Facebook's Year in Review auto-surfaced his dead daughter's photo in celebratory framing. His three recommendations, now canon (expanded in Meyer & Wachter-Boettcher, *Design for Real Life*): (1) **never pre-populate emotional content** before the user opts in; (2) **ask, then honor the answer** — remember a "no" and don't re-prompt; (3) design for worst-case users, not "ideal" users.
- **Facebook Memories research** (Kunkle, U. Denver capstone; Sue Ryder community threads): algorithmic memory resurfacing is a "double-edged sword" — the same reminder can comfort or retraumatize depending on time-since-loss, the specific memory, and the day. Facebook's memorialization suppresses "On This Day" for memorialized accounts. Implication: **reminders must be per-person opt-in with granular frequency control, never inferred**. ForeverMissed already ships disable-able anniversary notifications — this is the expected bar.
- **Bloom & Wild's Mother's Day opt-out (2019)** launched the "Thoughtful Marketing Movement," now 170+ businesses; it was cited in a UK Parliament bereavement debate, and Bloom & Wild found **customers who opted out of occasion emails were *more* loyal** (thedrum.com, econsultancy.com, bloomandwild.com). Counterpoint: Big Issue coverage documents bereaved people who find annual opt-out emails themselves painful ("performative empathy") — the deepest fix is preference-first design, not annual apology emails.
- Synthesis for a weekly digest product: digests *about the deceased's page* are qualitatively different from marketing (they serve continuing bonds), but the same rules apply — steward-configurable cadence, per-recipient opt-out, pre-death-anniversary quiet options, and never auto-generating "celebratory" framing around loss content.

### Onboarding someone days into a loss
- **"Grief brain" is real**: acute bereavement floods the body with cortisol, impairing hippocampal memory/attention; sleep disruption compounds it; effects are temporary but pronounced in the first weeks (psychcentral.com; ScienceDirect "Competitive neurocognitive processes following bereavement"; speakinggrief.org). This is exactly when memorial pages get created — Tribute Tech's 2025 study shows obituaries posted **within two days of death drive 30% more visits**, so the creation flow will be used by cognitively-taxed people under time pressure.
- Design consequences from practitioner case studies ("Dignity Planner" end-of-life UX case, matthewlarn.medium.com; uxdesign.cc IA-and-grief case study): **one question per screen; a guide, not a dashboard; soft progress indication with no pressure to finish; everything resumable; validating microcopy ("Take your time")**. Grief is nonlinear — users must be able to stop and come back with nothing lost.
- **Empathy** (empathy.com, B2B2C via life insurers/employers) models the adjacent job: step-by-step logistical + emotional checklists so families "aren't left endlessly searching and guessing" — its tone ("AI + human care for life's hardest moments") is practical-compassionate rather than clinical or saccharine.
- **Language details matter enormously**: 3 Sided Cube's pet-bereavement case study found "hide profile" read as "cold"; they replaced toggle mechanics with a gently-phrased single checkbox, and stress that a death must **cascade through every surface** — settings, notifications, historical records — not just the profile page (3sidedcube.com). They also segment bereaved users into long-term traumatized / temporarily traumatized / accepting, each needing different exposure to reminders (echoes Massimi guideline 8).
- An emerging academic strand formalizes this as an "ethic of care" for digital bereavement services (Design for Health, 2026, tandfonline — abstract only; full text paywalled/403).

### Accessibility for elderly users
- Obituary audiences skew old: **~60% of obituary visitors are women over 50**, mostly living within 25 miles of the funeral home (Tribute Technology obituary study, Oct 2025).
- NN/g's *UX Design for Seniors* (3rd ed., 87 guidelines from studies with 123 users 65+): larger legible type, generous tap targets, avoid or define web jargon in place, error-tolerant forms, simple navigation; "modest design changes can vastly increase the business you get from seniors" (nngroup.com). Storii's landline-phone-call design is the extreme, instructive case: the most senior-friendly contribution channel is **no app, no wifi, just a phone call** — audio contribution by phone is a plausible high-value, elder-accessible feature for any memorial product.

## 3. Information Architecture and Contribution Flows

### Canonical page anatomy (converged across platforms)
1. **Hero**: portrait, full name, dates (universal).
2. **Obituary/biography** — long-form matters: obituaries with 500+ words get **2x the visits** (Tribute Tech 2025).
3. **Tribute wall / guestbook** (chronological condolences + memories) — the live, social core.
4. **Media gallery**, ideally organized by life stage.
5. **Life timeline** of milestones (premium differentiator).
6. **Service/event block** (details, RSVP, livestream, map) — time-boxed relevance; best platforms let it recede after the funeral.
7. Optional modules: favourites (songs/places/books), family tree, fundraising/charity block, virtual candles.
(Structure per online-tribute.com guide — vendor source, but consistent with Ever Loved, Keeper, MuchLoved product pages.)

### Contribution-flow findings
- **Friction kills participation**: Online-Tribute lets visitors leave messages, photos, and RSVPs "without creating any account"; it argues ForeverMissed's register-before-condolence requirement "meaningfully reduces participation" (biased source, but directionally consistent with general conversion UX). Memorial Pages' email-verification sits between these; the design question is how lightweight verification can feel (magic link, no password, no profile setup).
- **Moderation-before-publish is a legitimate mainstream pattern**, not an oddity: Facebook Legacy Contact moderates condolences; funeral-home guestbooks are screened; Ever Loved sells contribution restrictions as premium. A steward-approval queue with fast, kind status messaging to contributors ("Your memory has been sent to Maria's family") is the grief-appropriate version.
- **Prompts beat blank boxes**: guided prompts (Storii's 1,000+ questions; Keeper's collaborative stories; AI-assisted drafting) address the universal "I don't know what to write" blocker and are how platforms convert passive visitors into contributors.
- **Design for sediment**: per Massimi, contributions arrive slowly over years; IA should honor late additions (anniversary story prompts, "add a memory" persistently prominent) rather than treating the page as finished after the funeral. The PMC Facebook study's finding that declining participation *hurts* suggests gentle re-engagement (opt-in) has genuine grief value, not just retention value.

### Mobile vs. desktop
- **Mobile dominates**: 75%+ of online obituary traffic is mobile (funeralinnovations.com; >60% of funeral-service searches are mobile per tributetech.com). QR-plaque entry is 100% mobile by definition — the graveside scan is the single most constrained context (outdoor glare, one thumb, possibly emotional): page load speed, immediate hero + one-tap "add a memory," no login wall to *read*.
- Keeper's mobile-first apps and anniversary push notifications are cited as its edge over older desktop-era platforms.
- Desktop remains relevant for the *steward's* heavier work (long obituary writing, gallery curation, book export) — a two-context IA: mobile = visiting + contributing; desktop = curating.

## 4. Actionable Principles Distilled (with source anchors)

1. **Ship the ritual layer free** (candles, tributes); never microtransact grief gestures (Slate on ObitTree).
2. **Your privacy stance is a marketable premium feature elsewhere** — Ever Loved charges $199.99 for password protection and contribution controls; lead marketing with it.
3. **Table stakes to reach parity**: long-form obituary, gallery, tribute wall, service details w/ RSVP + livestream link, opt-in anniversary emails. **Highest-leverage differentiators for this product**: guided story prompts, audio memories (phone-call capture for elders), timeline, printed keepsake book compiled from the page (proven willingness-to-pay via Tribute Book), and the already-built QR plaque line (validated by Turning Hearts' traction).
4. **Do not build**: public directory/search (the industry's most-resented pattern), engagement-bait algorithmic resurfacing, deadbot avatars (Cambridge safeguards make the reputational risk explicit).
5. **Notifications**: opt-in, granular, remembered "no"s, steward-controlled cadence, quiet-period options around anniversaries; digests framed as care, never celebration (Meyer; Facebook Memories research; Bloom & Wild).
6. **Creation flow for day-3 grief**: one question at a time, resumable, minimal required fields, AI-draft assist with human voice, "take your time" microcopy (grief-brain research; Dignity Planner case).
7. **Design for decades, not the funeral week**: support slow sediment of contributions, treat steward upkeep as meaningful ritual (Massimi guidelines 6–7), and sustain communal participation over time (PMC continuing-bonds study).
8. **Audience is old and mobile**: 60% women 50+, 75% mobile — big type, big targets, jargon-free, no-app contribution paths (NN/g; Tribute Tech).
9. **The steward model is the academically-endorsed architecture** (Brubaker's Legacy Contact) — a "Facebook for the dead" that is *unlisted, moderated, and steward-run* is not a lesser version of social; it is the version the research says bereaved people actually need (choice, control of mourning symbols, protection from unwanted exposure).

## Sources
- [Myfarewelling — 10 Best Online Memorial Websites Compared (2026)](https://www.myfarewelling.com/article/best-online-memorial-websites)
- [Ever Loved Help Center — How much does an Ever Loved memorial site cost?](https://support.everloved.com/article/277-how-much-does-an-ever-loved-memorial-site-cost)
- [Ever Loved — Create a Beautiful Online Memorial](https://everloved.com/online-memorials/)
- [Online-Tribute — Memorial Website Guide 2026 (vendor comparison; bias noted)](https://www.online-tribute.com/memorial-website-guide)
- [GetMemorial blog — Best Online Memorial Websites (vendor comparison; bias noted)](https://www.getmemorial.com/blog/best-online-memorial-websites)
- [ForeverMissed — Plans and Prices](https://www.forevermissed.com/ourplans)
- [Keeper (mykeeper.com) — product homepage](https://www.mykeeper.com/)
- [MuchLoved — UK charity tribute platform](https://www.muchloved.com/)
- [Turning Hearts — QR grave medallion product page](https://turninghearts.com/products/turning-hearts-medallion-aluminum)
- [Memorial Merits — Turning Hearts medallion review](https://memorialmerits.com/turning-hearts-review-qr-memorial-medallion/)
- [Storii — Pricing (phone-call audio life stories)](https://www.storii.com/pricing)
- [Tribute Technology — Tribute Book (auto-compiled keepsake book)](https://www.tributetech.com/tribute-book)
- [Tribute Technology — Tribute Store (flowers/tree upsell, profit share)](https://www.tributetech.com/tribute-store)
- [Tribute Technology — Landmark Obituary Study (Oct 2025)](https://www.tributetech.com/tribute-technology-releases-landmark-obituary-study-traffic-engagement-and-industry-threats)
- [Slate (2017) — Legacy.com has cornered the market on death online](https://slate.com/technology/2017/12/legacy-com-has-cornered-the-market-on-death-online.html)
- [Legacy.com — 100 Million Guest Book Entries press release](https://sales.legacy.com/about/press-releases/legacy-com-reaches-milestone-of-100-million-guest-book-entries/)
- [Cremation.green — Takeaways from NFDA 2025 Consumer Awareness & Preferences Study (livestreaming stats)](https://www.cremation.green/biggest-takeaways-from-the-nfda-study/)
- [WebProNews / AI Commission — AI Takes Over Obituary Writing in Funeral Homes (Passare, adoption figures)](https://aicommission.org/2025/08/ai-takes-over-obituary-writing-in-funeral-homes-amid-shortages/)
- [Massimi & Charise (CHI 2009) — Dying, Death, and Mortality: Towards Thanatosensitivity in HCI](https://www.semanticscholar.org/paper/Dying,-death,-and-mortality:-towards-in-HCI-Massimi-Charise/d6cf9dc820e101521c8915ac2fb6ae661778177b)
- [Massimi & Baecker (CHI 2011) — Dealing with Death in Design: Developing Systems for the Bereaved (full PDF read)](https://www.dgp.toronto.edu/~mikem/pubs/MassimiBaecker-CHI2011.pdf)
- [Brubaker & Callison-Burch (CHI 2016) — Legacy Contact: Designing and Implementing Post-mortem Stewardship at Facebook](https://www.jedbrubaker.com/wp-content/uploads/2008/05/Brubaker-Callison-Burch-Legacy-CHI2016.pdf)
- ['He's Still There': How Facebook Facilitates Continuing Bonds With the Deceased (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10647902/)
- [Eric Meyer — Inadvertent Algorithmic Cruelty (2014)](https://meyerweb.com/eric/thoughts/2014/12/24/inadvertent-algorithmic-cruelty/)
- [Kunkle (U. Denver capstone) — Influence of Facebook Memories on the Grief Experience](https://digitalcommons.du.edu/capstone_masters/375/)
- [The Drum — Bloom & Wild leads 'thoughtfulness' opt-out movement](https://www.thedrum.com/news/2020/03/02/bloom-and-wild-leads-thoughtfulness-opt-out-movement)
- [Bloom & Wild — Thoughtful Marketing Movement](https://www.bloomandwild.com/thoughtful-marketing)
- [Big Issue — 'Performative empathy': why opt-out emails can make grief worse](https://www.bigissue.com/life/fathers-day-grief-opt-out-emails-parenting/)
- [University of Cambridge — Call for safeguards to prevent unwanted 'hauntings' by AI chatbots of dead loved ones (2024)](https://www.cam.ac.uk/research/news/call-for-safeguards-to-prevent-unwanted-hauntings-by-ai-chatbots-of-dead-loved-ones)
- [3 Sided Cube — Death in Design: Dealing with Sensitive Topics (pet bereavement case study)](https://3sidedcube.com/blog/death-in-design-dealing-with-sensitive-topics)
- [Matthew Stephens (Medium) — Designing for Death: A UX Guide for End-of-Life Products (Dignity Planner case; via search excerpts, page blocked fetch)](https://matthewlarn.medium.com/designing-for-death-a-ux-guide-for-end-of-life-products-98983f885014)
- [UX Collective — Information architecture and grief: a UX case study (page blocked fetch; via search excerpts)](https://uxdesign.cc/information-architecture-and-grief-a-ux-case-study-914fe8380d32)
- [Design for Health (2026) — Integrating an ethic of care into the design of digital bereavement services (abstract only)](https://www.tandfonline.com/doi/full/10.1080/24735132.2026.2684830)
- [Nielsen Norman Group — UX Design for Seniors (3rd ed. report)](https://www.nngroup.com/reports/senior-citizens-on-the-web/)
- [Nielsen Norman Group — Usability for Older Adults: Challenges and Changes](https://www.nngroup.com/articles/usability-for-senior-citizens/)
- [Funeral Innovations — mobile traffic to obituaries (75%+ mobile)](https://funeralinnovations.com/home/drive-more-mobile-traffic-to-your-website-wit/)
- [Empathy — B2B2C loss-support platform](https://www.empathy.com/)
- [Funeral.com — Virtual Candles and Online Memorials (ritual context; vendor blog, survey claim weakly sourced)](https://funeral.com/blogs/the-journal/virtual-candles-and-online-memorials-what-they-are-how-they-help-and-where-to-create-one)
- [ScienceDirect — Competitive neurocognitive processes following bereavement (grief-brain evidence)](https://www.sciencedirect.com/science/article/pii/S0361923023000862)
- [PMC — How social media data are being used to research the experience of mourning: scoping review](https://pmc.ncbi.nlm.nih.gov/articles/PMC9307163/)