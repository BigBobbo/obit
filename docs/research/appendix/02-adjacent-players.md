# Adjacent & Incidental Players in Digital Memorialization — Research Findings

Scope: platforms that touch memorialization without being purpose-built private memorial products. For each: mechanics, scale, documented failures, and what it implies for a privacy-first, unlisted, steward-moderated, QR-to-grave memorial product ("Memorial Pages"). All claims verified against primary or named sources as of 2026-08-28; unverifiable items are flagged.

## 1. Facebook memorialized profiles & legacy contacts

**Mechanics today** (per Facebook's own help center, facebook.com/help/1506822589577997): anyone with "proper documents" (obituary/death certificate) can request memorialization; the profile gets "Remembering" prepended to the name. A pre-designated **legacy contact** can: pin a tribute post, update profile/cover photo, accept new friend requests, download an archive (if the deceased enabled it), and delete the account. A legacy contact **cannot**: log in, read messages, remove/edit past posts, or unfriend anyone. Critically, **memorialized accounts with no legacy contact are frozen — no changes can ever be made**. The only alternative the living user can pre-select is "Delete After Death." A **Tributes tab** (added April 2019) separates new mourning posts from the original timeline; legacy contacts can moderate tributes (remove tags, restrict who posts). The Legacy Contact feature itself came out of Jed Brubaker's academic work on "post-mortem stewardship" (CHI 2016 paper, Brubaker & Callison-Burch) — i.e., Facebook itself validated the *steward* model your product is built on.

**Scale**: Facebook said in April 2019 that **30+ million people view memorialized profiles every month** (about.fb.com newsroom). The Oxford Internet Institute projection (Öhman & Watson, *Big Data & Society* 2019): at 2018 user levels **at least 1.4 billion Facebook users will die before 2100 and the dead could outnumber the living by ~2070**; under continued-growth assumptions, up to **4.9 billion dead profiles by 2100**. Öhman's framing — who controls this heritage, and should a for-profit hold it — is the canonical citation for "the incumbent is structurally misaligned."

**Documented failures/complaints**:
- Families locked out: no login even with the password; deletion requires proof of authority; frozen accounts when no legacy contact was set (common — most people never set one).
- Painful algorithmic reminders (birthday notifications, "Memories" resurfacing the dead) — Facebook announced AI in 2019 specifically to suppress these (CBS News), an admission the core product is grief-hostile.
- **Grief scams**: fake funeral "live stream" groups harvesting credit cards, fake fundraisers, scammers replying to memorial posts within minutes using the deceased's photo (Malwarebytes, Aug 2024; Vice). **RIP trolling** of public memorial pages is documented back to Phillips' 2011 *First Monday* study.
- Users falsely marked dead and locked out of their own accounts (CBS News, 2016).

**Signal for Memorial Pages**: enormous latent demand (30M monthly mourners on FB alone) plus a validated steward concept — but Facebook's model fails on: pre-death dependence (legacy contact must be set before death), no dedicated purpose-built space (memorial = frozen social profile), open-graph exposure to trolls/scammers, and platform-owned data. A product where the memorial is created *after* death by the family, is unlisted, and is steward-moderated addresses every documented complaint. The scam literature also validates your email-verification + moderation pipeline as a real differentiator, not paranoia.

## 2. Grave-documentation communities: Find a Grave & BillionGraves

**Find a Grave** (owned by Ancestry since 2013): **265+ million memorials** created by volunteers since 1995 (findagrave.com; Wikipedia). Anyone can create a memorial for anyone dead; "photo volunteers" fulfill headstone-photo requests or systematically photograph entire cemeteries. Free; monetized as an Ancestry data asset.

**Community culture & controversies**: volunteers are motivated by genealogy service, collecting ("graving" as hobby — some log hundreds of photos/hour), and civic-memory impulses. Well-documented consent conflicts: strangers create memorials for the recently deceased — sometimes within days of death — before families even know the site exists; families describe finding a stranger-controlled page for their child or parent as "jarring" and must request transfer from an often-unresponsive creator (DNAeXplained 2022, which explicitly asked Ancestry to stop incentivizing memorials of the recently deceased; Slate, Oct 2024). Find a Grave updated transfer rules (Jan 2022) making transfer to close direct-line kin mandatory, but the creator's name stays attached and disputes persist; support forums document refusals requiring staff intervention. There is no notion of privacy: memorials are public, indexed, and searchable by design.

**BillionGraves**: GPS-tagged headstone photography via app; volunteers (heavily LDS/FamilySearch-organized, e.g. JustServe youth projects) photograph ~250 stones/hour; other volunteers transcribe. Free to browse; **BG+ subscription $9.99/mo or $59.99/yr** for advanced search/tools (support.billiongraves.com). Total record count not verified from a primary source.

**Signal**: these prove (a) graves are a natural anchor for digital content — millions of people *already* connect physical grave sites to web pages; (b) there is a large volunteer labor pool emotionally invested in cemetery data; and (c) **the single biggest recurring grievance in the entire space is strangers controlling a dead person's page without family consent**. Memorial Pages is the exact inverse (family-created, unlisted, unenumerable), which is a positioning line you can state almost verbatim: "Find a Grave is a public archive run by strangers; this is a private memorial run by your family." Risk to note: Find a Grave owns the public-genealogy use case; don't compete there. Unserved: the family that wants a QR at the grave *without* the deceased entering any public database.

## 3. Ancestry "We Remember" & MyHeritage

**We Remember (Ancestry)**: free memorial pages (no subscription/credit card), launched 2017–18; guestbook, photo/story contributions from anyone who knew the person, owner-posted memory prompts, sharing via link/email/Facebook, owner can block guests/memories, multiple privacy options; bundled as the "perpetual memorial" attached to obituaries placed through Ancestry's Memoriams/Adpay obituary network, and since 2020 supports virtual-service links (NFDA). Still listed among Ancestry's brands as of 2025; no shutdown found. It is essentially a free, thinner version of your product, distributed through funeral-home obituary flow — but with no QR/physical layer, no tiered automated moderation, no paid tier, and an owner whose business model is aggregating family data.

**MyHeritage**: no true memorial-page product; its adjacency is AI resurrection of ancestor *photos* — **Deep Nostalgia** (Feb 2021) animated uploaded photos of dead relatives via licensed D-ID tech and went massively viral, with polarized "magical vs. creepy" reception MyHeritage itself acknowledged (TechCrunch; Guardian called it "creepy"). Later extensions (DeepStory talking photos) drew the same deepfake criticism.

**Signal**: Ancestry's free-memorial giveaway shows memorial pages alone are hard to charge for when a data giant subsidizes them — your defensible paid surface is the bundle (QR plaque hardware, co-stewards, custom slug, moderation quality, privacy posture), not the page itself. Deep Nostalgia's virality shows huge appetite for emotionally vivid media of the dead, and equally strong revulsion — an argument for keeping any AI features on the *curation* side (transcription, prompts, photo restoration) rather than simulation.

## 4. Pre-death memory capture & AI griefbots

### Memory capture (healthy, growing)
- **StoryWorth**: weekly emailed question → year of answers → hardcover book. **$59/$109/$199 tiers (2026)**, extra pages $20 each, extra copies $39–$99 (help.storyworth.com). Bootstrapped, profitable, no investors; claims **35M+ stories shared, 1M+ books printed** (welcome.storyworth.com/about). The category's proof of durable willingness-to-pay.
- **Remento** (Shark Tank): voice/video prompts → AI-transcribed hardcover with QR codes linking to the original recordings. **$99/yr (or $12/mo) incl. one 200-page book credit**; +$30 to 380 pages; extra copies $69 (help.remento.co). Note the mechanic: *QR in a physical object linking to hosted media* — the same primitive as your grave plaque.

### AI legacy avatars / griefbots (boom-bust)
- **StoryFile** (video Q&A avatars; William Shatner): **Chapter 11, May 2024** ($1.5M assets vs $10.5M liabilities after raising $9.5M); emerged ~March 2025 under Key 7 Investment Company (Law360; AI Business).
- **HereAfter AI** (James Vlahos' "Dadbot" turned consumer app — recorded life-story interviews replayed conversationally): **winding down**; homepage farewell notice July 2026, site now 404s (confirmed by direct fetch), users must email support for audio export — no self-serve export, no deadline announced (afterlife.ai report, Aug 2026 — note: published by a competitor, but corroborated by the dead site).
- **Eternos** (founded 2024 by Robert LoCascio; terminally ill Michael Bommer's replica was its flagship story): raised $10.3M in Nov 2025 and **pivoted out of digital legacy entirely**, rebranding as Uare.ai, personal AI for professionals (TechCrunch, Nov 2025). Pricing reports conflict ($25 legacy accounts per BusinessWorld vs. $15,000 white-glove packages per a grief-industry blog) — treat cost structure as unverified.
- **Project December** (Jason Rohrer, GPT-3): the 2021 SF Chronicle "Jessica Simulation" story (Joshua Barbeau texting his dead fiancée) made "griefbot" a household word and triggered the OpenAI/Rohrer split over safety conditions.
- **Seance AI** (AE Studio side project, GPT-4): free short text "séances," ~$10 upsell for voice cloning, later ~$19.99/mo animated tiers (Futurism; ae.studio) — deliberately provocative branding.
- **You, Only Virtual** ("Versonas"): behind a waitlist as of mid-2026 (afterlife.ai).

**Ethics debate**: Cambridge (Hollanek & Nowaczyk-Basińska, *Philosophy & Technology*, May 2024) warns deadbots risk "digital haunting," calls for opt-outs, "digital funerals," and protection of vulnerable mourners; Nature ran a 2025 feature on the industry; the *Eternal You* (2024) documentary drove mainstream skepticism.

**Signal**: two cleanly separated markets. **Memory capture (StoryWorth model) is proven, profitable, low-tech, and beloved; AI simulation is a graveyard of pivots and bankruptcies with heavy ethical headwinds and now real abandonment risk for customers** (HereAfter users begging for their dead parent's recordings via a support email is the cautionary tale). Unserved gap Memorial Pages could own: a pre-death "capture" mode (prompted questions answered by the future subject, stored against the eventual memorial) that converts to a memorial on death — StoryWorth economics, no griefbot ethics, and it deepens your 90-day-failsafe/continuity story ("your archive doesn't die with a startup" is now a *provable* fear).

## 5. End-of-life planning platforms (Cake, Lantern, Empathy)

- **Cake** (joincake.com): content + planning tools (advance directives, funeral wishes, digital-legacy checklists), "millions of visitors"; **acquired Oct 2024 by Foundation Partners Group**, the #2 US funeral-home operator (foundationpartners.com). Signal: funeral consolidators are buying the top-of-funnel.
- **Lantern**: pre-planning + after-loss checklists; **acquired by care-coordination company Wellthy, May 2023** (CB Insights). Effectively absorbed.
- **Empathy**: the category winner — after-loss admin + grief support distributed **through employers and life insurers** (MetLife, New York Life, Aflac; 8 of top 10 US carriers; "1 in 5 US insurance claimants" covered). **$72M Series C May 2025, $162M total raised**; revenue +300% YoY; launched "Empathy Alliance" (Businesswire; Calcalist). Product includes AI obituary writing ("Finding Words"), account-closure automation, care managers, LifeVault document vault.

**Do they touch memorials?** Only glancingly: Empathy writes obituaries and Cake publishes memorial/obituary content guides, but none of the three hosts an ongoing family memorial space; their engagement window is the weeks-to-months of admin after a death, then it ends. None does anything at the grave.

**Signal**: B2B2C distribution (insurers, funeral homes) is where the money went in death-tech — Empathy monetizes the *event*, not the *remembering*. That leaves the long-tail, years-long remembrance relationship — exactly your product — unowned by the funded players, and suggests two things: (a) potential partner channel (funeral homes/insurers could hand families a Memorial Pages link the way they hand them Empathy), and (b) validation that families will engage with death-adjacent software when it's given to them at the moment of need.

## 6. QR-code grave-marker products

| Product | Hardware & price | Linked page | Notes |
|---|---|---|---|
| **Turning Hearts** (founded 2020, UT) | 2"×2" aluminum medallion, 2 per pack, **$79.99** (list $99.99), 3M adhesive, lifetime replacement warranty | Free hosted profile, no subscription; unlimited photos/video/audio/bio; invite-based contributions; public-via-scan or invite-restricted | Sells on Amazon + keychain bundles; Inside Edition coverage; reviewers flag **platform-dependency risk** ("if Turning Hearts closes, the profile disappears"), aluminum vs steel durability, adhesive on rough stone (memorialmerits.com) |
| **Living Headstone** (Quiring Monuments, Seattle — since 2011) | QR embedded in granite: **$125 w/ new monument ("lifetime subscription"), ~$156 retrofit, $65 code-only** (monuments.com dealers page) | Archive page: obituary, heritage, photos, comments | The monument-industry incumbent version; sold through stone dealers, not DTC |
| **Scan2Remember** | **$49.90** plaque | Free tier capped: 10 photos, 3 videos, virtual candle, grave GPS | Budget end; category ranges $20 vinyl → $300+ ceramic/stainless (memorymurals cost survey) |
| **RememberWell** | **Could not verify** any active company of this name; searches surface only the above competitors. Treat as defunct/misremembered. | — | — |

**Signal**: hardware-first players validate the QR-at-grave behavior (PetaPixel, Fox, Seattle Times coverage spans 2011–2023 — the concept keeps getting rediscovered), and they all monetize the *object* while giving the software away — which produces thin, feature-frozen memorial pages with no real moderation, no stewardship model, and an unpriced perpetual-hosting liability that reviewers now explicitly call out. Memorial Pages inverts this correctly (software subscription, plaque PDF as a feature), but note the consumer expectation these players set: **~$50–100 one-time, "no monthly fees," lifetime warranty**. A freemium page + paid plaque/subscription must answer the "what if you shut down / why pay monthly when Turning Hearts is one-time" objection head-on — e.g., data-export guarantees, static-archive fallback, or a one-time "forever" price tier. None of these vendors offers steward moderation, contributor verification, or unlisted-by-design privacy; that whole layer is unclaimed.

## 7. Cross-cutting read for the "Facebook for the dead" question

1. **Demand is proven at every layer**: 30M monthly memorial visitors (Facebook), 265M volunteer-built memorials (Find a Grave), 1M+ printed legacy books (StoryWorth), $162M into after-loss support (Empathy). Nobody needs convincing that people want to remember online.
2. **The social-network form factor is the documented failure mode**: public/open memorials attract trolls and scammers (First Monday; Malwarebytes), stranger-created pages cause the deepest resentment in the space (Find a Grave transfer disputes), and frozen platform-controlled profiles cause the second-deepest (Facebook lockouts). "Like Facebook, but for the dead" is precisely the model whose failure is best documented.
3. **What is genuinely unserved**: family-consented, private, moderated, grave-anchored remembrance with credible *continuity guarantees* — the intersection of Turning Hearts' physical anchor, We Remember's contribution model, Facebook's stewardship concept, and none of their governance flaws. The strongest growth adjacencies suggested by this landscape are (a) pre-death story capture (StoryWorth-style, converting to the memorial), (b) funeral-home/insurer distribution (the Empathy/Cake channel), and (c) explicit data-permanence commitments — not richer social mechanics, and not AI simulation of the dead, where the 2024–2026 record is bankruptcy (StoryFile), shutdown (HereAfter), pivot (Eternos), and academic alarm (Cambridge).

## Sources
- [Facebook Help Center — About memorialized accounts](https://www.facebook.com/help/1506822589577997)
- [Facebook Newsroom (Apr 2019) — Making It Easier to Honor a Loved One (30M monthly visitors, Tributes)](https://about.fb.com/news/2019/04/updates-to-memorialization/)
- [ScienceDaily — Oxford Internet Institute: dead may outnumber living on Facebook (Öhman & Watson 2019)](https://www.sciencedaily.com/releases/2019/04/190427104813.htm)
- [MIT Technology Review — Dead Facebook users could outnumber living within 50 years](https://www.technologyreview.com/2019/04/29/239179/dead-facebook-users-could-outnumber-living-ones-within-50-years/)
- [Brubaker & Callison-Burch — Legacy Contact: Designing and Implementing Post-mortem Stewardship at Facebook (CHI 2016)](https://www.jedbrubaker.com/wp-content/uploads/2008/05/Brubaker-Callison-Burch-Legacy-CHI2016.pdf)
- [CBS News — Facebook to use AI to prevent painful reminders about dead loved ones](https://www.cbsnews.com/sanfrancisco/news/facebook-to-use-ai-to-prevent-painful-reminders-about-dead-loved-ones)
- [Malwarebytes (Aug 2024) — Fake funeral live-stream scams target grieving users on Facebook](https://www.malwarebytes.com/blog/news/2024/08/fake-funeral-live-stream-scams-target-grieving-users-on-facebook)
- [First Monday (Phillips 2011) — LOLing at tragedy: Facebook trolls, memorial pages and resistance to grief online](https://firstmonday.org/ojs/index.php/fm/article/download/3168/3115)
- [Find a Grave — homepage (265M+ memorials)](https://www.findagrave.com/)
- [Wikipedia — Find a Grave (Ancestry acquisition 2013)](https://en.wikipedia.org/wiki/Find_a_Grave)
- [Slate (Oct 2024) — Find a Grave / Ancestry family controversy essay](https://slate.com/technology/2024/10/afind-a-grave-ancestry-family-grandfather-controversy.html)
- [DNAeXplained (2022) — Find a Grave: Stop Incentivizing Memorials of the Recently Deceased](https://dna-explained.com/2022/06/02/find-a-grave-owned-by-ancestry-seriously-just-stop-incentivizing-the-creation-of-memorials-of-the-recently-deceased/)
- [Find a Grave News (Jan 2022) — Transferring Memorials (updated family-transfer rules)](https://news.findagrave.com/2022/01/11/transferring-memorials/)
- [Find a Grave Support — Photo Volunteer Basics](https://support.findagrave.com/hc/en-us/articles/53933310096403-Photo-Volunteer-Basics)
- [LDS Church Newsroom — BillionGraves and JustServe volunteers photograph millions of gravestones](https://newsroom.churchofjesuschrist.org/article/billiongraves-and-justserve-volunteers-photograph-millions-of-gravestones)
- [BillionGraves Support — Free vs BillionGraves Plus (BG+ pricing)](https://support.billiongraves.com/support/solutions/articles/35000018223-what-s-the-difference-between-billiongraves-free-and-billiongraves-plus-)
- [NFDA — We Remember by Ancestry now supports virtual services](https://nfda.org/news/in-the-news/supplier-news/id/5195/we-remember-by-ancestry-now-supports-virtual-services)
- [We Remember — Help Center (free, sign-in, guestbook)](https://www.weremember.com/help-center/account)
- [Ancestry Corporate — Our Brands (We Remember listed)](https://www.ancestry.com/corporate/about-ancestry/our-brands)
- [TechCrunch (Feb 2021) — MyHeritage Deep Nostalgia animates old family photos using deepfakery](https://techcrunch.com/2021/02/26/myheritage-now-lets-you-animate-old-family-photos-using-deepfakery/)
- [Storyworth Help — Book pricing](https://help.storyworth.com/en_US/book-pricing)
- [Storyworth — About (35M stories, 1M+ books, bootstrapped)](https://welcome.storyworth.com/about)
- [Remento Help Center — Pricing guide](https://help.remento.co/en/articles/8365892-remento-s-pricing-guide)
- [AI Business — Startup behind AI William Shatner (StoryFile) files for bankruptcy](https://aibusiness.com/verticals/startup-behind-ai-william-shatner-files-for-bankruptcy)
- [AI Business — William Shatner-backed AI startup acquired (StoryFile emerges via Key 7)](https://aibusiness.com/nlp/william-shatner-backed-ai-startup-acquired-real-people-chatbots)
- [Afterlife AI (competitor-published, Aug 2026) — HereAfter AI Is Shutting Down](https://www.afterlife.ai/hereafter-ai-shutting-down)
- [SF Chronicle (2021) — The Jessica Simulation: AI chatbot of a dead fiancée (Project December)](https://www.sfchronicle.com/projects/2021/jessica-simulation-artificial-intelligence/)
- [University of Cambridge (May 2024) — Call for safeguards to prevent unwanted 'hauntings' by AI chatbots of dead loved ones](https://www.cam.ac.uk/research/news/call-for-safeguards-to-prevent-unwanted-hauntings-by-ai-chatbots-of-dead-loved-ones)
- [Hollanek & Nowaczyk-Basińska — Griefbots, Deadbots, Postmortem Avatars (Philosophy & Technology, 2024)](https://link.springer.com/article/10.1007/s13347-024-00744-w)
- [TechCrunch (Nov 2025) — Immortality startup Eternos nabs $10.3M, pivots to personal AI (Uare.ai)](https://techcrunch.com/2025/11/11/immortality-startup-eternos-pivots-to-a-personal-ai-that-sounds-like-you/)
- [Futurism — This AI company wants to perform a seance on your dead loved ones (Seance AI / AE Studio)](https://futurism.com/ai-seance)
- [AE Studio — Seance AI about page](https://www.ae.studio/seanceai/about)
- [Nature (2025) — Ready or not, the digital afterlife is here](https://www.nature.com/articles/d41586-025-02940-w)
- [Businesswire (May 2025) — Empathy announces $72M Series C and Empathy Alliance](https://www.businesswire.com/news/home/20250529944227/en/Empathy-Announces-$72-Million-Series-C-and-Unveils-Empathy-Alliance)
- [Foundation Partners Group (Oct 2024) — Acquires Cake end-of-life planning platform](https://foundationpartners.com/fpgnews/foundation-partners-group-acquires-cake-to-meet-growing-demand-for-end-of-life-planning-tools-and-resources/)
- [CB Insights — Lantern company profile (acquired by Wellthy, May 2023)](https://www.cbinsights.com/company/lantern-2/alternatives-competitors)
- [Turning Hearts — Medallion 2.0 product page (pricing, free profile, privacy)](https://turninghearts.com/products/turning-hearts-medallion-2-0)
- [Memorial Merits — Turning Hearts medallion review (limitations incl. platform dependency)](https://memorialmerits.com/turning-hearts-review-qr-memorial-medallion/)
- [Quiring Monuments — Living Headstones (pricing)](https://www.dealers.monuments.com/living-headstones)
- [Seattle Times — 'Living headstones' use technology to honor the dead](https://www.seattletimes.com/seattle-news/living-headstones-use-technology-to-honor-the-dead/)
- [Scan2Remember — QR memorial plaque ($49.90, free tier limits)](https://scan2remember.com/products/qr-memorial-plaque)
- [PetaPixel (Nov 2023) — QR codes on headstones that link to photos of the dead](https://petapixel.com/2023/11/21/you-can-put-qr-codes-on-headstones-that-link-to-photos-of-the-dead/)