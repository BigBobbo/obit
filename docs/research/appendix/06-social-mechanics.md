# "Facebook for the dead": which social mechanics survive contact with grief

Research date: 2026-08-28. All claims cite sources listed at the end; where verification failed this is stated.

## 1. Feature catalog: social mechanics in memorial contexts

### 1.1 Reactions — the "like" problem is real and every serious product renames the verb

- Academic evidence: Wagner (2018), *"Do not Click 'Like' When Somebody has Died"* (Social Media + Society), a systematic review of 25 studies, finds traditional mourning norms dominate online: grief is treated as a privacy matter, condolence language is conventional, and generic platform reactions (the "like") clash with those norms rather than extend them.
- What products use instead:
  - **MuchLoved** (UK charity): virtual **candles** — "Thought" and "Birthday" candles that stay alight for a day, "Lasting" candles that are permanent. Candles double as a donation vehicle (3.2% + 1.25% fees on tribute-fund donations).
  - **Legacy.com / funeral-home sites**: "light a candle," flowers, guest-book entries — skeuomorphs of funeral ritual, not social-media metaphors.
  - **CaringBridge** (the closest privacy-first analog, for illness rather than death): a heart reaction internally called the "amp" ("amplify" — waves of care emitting from a heart); ~606K reactions and ~1M comments per month platform-wide.
  - **ForeverMissed**: virtual candles plus tribute posts.
  - **Keeper (mykeeper.com)** is the outlier that copied Facebook vocabulary wholesale — "like, share, comment, connect" — evidence that at least one at-scale player believes families tolerate it, but Keeper's business is B2B (cemeteries, funeral homes, the VA), where engagement mechanics are a sales feature.
- Takeaway: the industry consensus is a **single, unambiguous warm gesture** (candle/heart/flower), not a reaction palette. Facebook itself only added "care"-type reactions after years of users complaining that "like" was the only response to death announcements.

### 1.2 Feeds and following

- Facebook memorialized profiles are de facto followed pages: Sheryl Sandberg stated **"over 30 million people view memorialized profiles every month to post stories, commemorate milestones and remember those who have passed away"** (2019). The 2019 redesign added a separate **Tributes tab** so new grief posts don't overwrite the deceased's own timeline — a design insight worth stealing: *the archive of the person* and *the feed of the mourners* are different objects and should be separated.
- CaringBridge's model: visitors **subscribe to a journal** and get email notifications per update; the most popular privacy tier is "registered users only," because it lets authors block unwanted visitors and see who has read what. Following exists, but it is subscription-to-email, not an algorithmic feed.
- ForeverMissed: stewards choose when notifications go out (new posts, anniversaries) or disable them; role-based permissions per user (who can post tributes, upload media, change settings).

### 1.3 Comments and threading

- Legacy.com is the strongest evidence base on comments at scale: it screens **every** guest-book entry before publication — 85 of 200 staff are screeners, ~12M entries/year, and **~25% of submissions are filtered** (proselytizing, inappropriate remarks, references to suicide/addiction the family wants private, and — per senior director Katie Falzone — "essentially, we're looking for mistresses, or people who had a relationship with the deceased who aren't mentioned"). Crucially for product strategy: Legacy claims moderated guest books get **~2x more entries** than unmoderated ones and 92% of families value the screening; its CEO contrasted rival Tributes.com, which pushed screening onto families/funeral homes and saw participation drop. **Moderation is an engagement feature, not a tax** — this directly validates the owner's moderation-first architecture.
- No memorial product surveyed offers deep threading; the dominant form is flat condolence entries or single-level replies. Threading invites argument; flat tribute walls invite parallel testimony.

### 1.4 Tagging

- Facebook tributes support tagging, and the legacy contact's powers explicitly include "changing tagging settings, removing tags" — i.e., Facebook shipped tagging into memorial space and then had to ship steward-side controls to contain it. No dedicated memorial product surveyed implements person-tagging inside memories.

### 1.5 Anniversary/birthday resurfacing — comforting *and* cruel; consent is the variable

- The cautionary tale: Facebook's automated birthday reminders and "Memories" repeatedly resurfaced dead people to their friends; after years of complaints, Facebook announced in 2019 it would use **AI to detect likely-deceased users and suppress birthday reminders and event invitations** pre-memorialization (NPR: "Facebook promises to stop asking you to wish happy birthday to your friend who died").
- The supportive evidence: continuing-bonds research (Klass et al. 1996 lineage) finds that maintaining an evolving bond with the deceased — including via posting on memorial sites — is associated with *reduced* prolonged-grief symptoms; studies of online suicide memorials ("We do it to keep him alive," *Mortality*, 2015) document bereaved people deliberately returning on anniversaries.
- Products thread the needle by making resurfacing **opt-in and human-framed**: ForeverMissed sends birthday/death-anniversary email reminders to subscribed contributors; MuchLoved sells birthday candles. The pattern that works: "the anniversary is coming — would you like to invite people to share a memory?" addressed to people who chose the relationship with the page. The pattern that fails: an algorithm inferring an occasion and pushing it to people who never opted in.

### 1.6 Invitations and virality

- The real-world viral loop of a death is **need-driven, not content-driven**: obituary sharing, funeral logistics, and fundraising. Ever Loved builds its loop on exactly this — free memorial site + funeral details + memorial fund, shared "through Facebook, email, and by posting the link on any webpage," with follower notifications. GoFundMe reports **125,000+ memorial fundraisers/year raising $330M+** (avg ≈ $2,600), most active in the first 1–2 weeks. The share burst is front-loaded into days.
- Legacy.com's scale shows the ambient demand side: **~30–40M unique visitors/month**, a top-50 US site — obituaries are a mass medium. But that traffic is search-driven and public; it is precisely what an unlisted product forgoes by design.

### 1.7 Notification cadence

- Observed spectrum: CaringBridge = per-update email to subscribers; ForeverMissed = steward-configurable alerts + anniversary emails, can be disabled; Facebook = platform-default push (the source of the birthday-reminder scandal). Nobody in the dedicated-memorial space does engagement-bait cadence ("X reacted to…"); the owner's existing weekly digest sits at the conservative, defensible end of the observed range.

## 2. The dark side

### 2.1 RIP trolling

- Whitney Phillips, *"LOLing at tragedy: Facebook trolls, memorial pages and resistance to grief online"* (First Monday, 2011; expanded in *This Is Why We Can't Have Nice Things*, MIT Press 2015): ethnographic study (she embedded with trolls) of organized posting of abusive content on pages for the deceased. Key structural findings: (a) trolling concentrated on **public, joinable Facebook memorial pages**, frequently ones created by strangers after mediatized deaths; (b) many trolls claimed to target **"grief tourists"** — participants with no real-life connection to the deceased — rather than families; (c) the vulnerability was architectural: open pages, no gatekeeper.
- Press/legal cases: **Sean Duffy** (UK, 2011) jailed 18 weeks and banned from social networks for 5 years for abusive posts on tribute pages of four dead teenagers, incl. Natasha MacBryde ("Tasha the Tank Engine" YouTube video). **Alexis Pilkington** (NY, 2010): tribute page flooded with vile images days after her suicide. Australian memorial pages for murdered children **Elliott Fletcher and Trinity Bates** defaced with offensive images (2010), prompting demands Facebook pre-moderate memorial pages.
- Implication: every documented RIP-trolling vector requires **discoverability + open posting**. An unlisted page with email-verified contributors and steward approval removes both preconditions. This is the single strongest argument that the owner's current architecture is the moat, not the limitation.

### 2.2 Grief tourism

- **MyDeathSpace** (2006–) aggregated deaths of MySpace users; relatives called it a privacy breach that glorified death; its forums hosted vitriolic commentary on the dead and at least one misidentification witch-hunt (death threats to a same-named innocent woman). Phillips' work frames grief tourists — bored strangers performing mourning — as both a nuisance in themselves and the bait that attracts trolls. Grief tourism is a function of **public discovery**; unlisted pages cannot develop it.

### 2.3 Family conflict over control

- **Legacy.com's screening team** is, in effect, a family-conflict firewall: filtering mistresses, unacknowledged relationships, and details (suicide, addiction) some family members want hidden; Falzone: "families have the same issues over time." One reported case involved a transgender person's death where family and community disagreed on the deceased's gender identity. Conflict between mourners is a *recurring pattern*, not an edge case.
- **Facebook/Germany (BGH 2018)**: parents of a 15-year-old killed by a train fought a multi-year lawsuit after Facebook memorialized her account on a third party's notification and locked them out; Germany's Federal Court of Justice ruled the account contract passes to heirs. Lesson: memorialization triggered by the "wrong" person is itself a harm vector.
- **Hollie Gazzard** (UK, 2014–15): murdered by her ex-boyfriend; her memorialized Facebook profile kept displaying nine photos of her *with her killer*; Facebook initially refused removal, relenting only after her father's 11,000-signature petition. Lesson: an archive frozen at death can contain content that becomes unbearable, and someone must have the power to prune it.
- **Find a Grave** (Ancestry): chronic disputes because strangers race to create memorials for the newly dead (gamified by per-memorial points); families must beg for transfers, sometimes from unresponsive collectors holding thousands of memorials; Find a Grave repeatedly revised transfer rules (2022) under pressure. Lesson: **whoever creates the page first owns the grief space** — a product must anchor creation rights in the family or inherit this fight.
- **Jed Brubaker's** research (UC Irvine → CU Boulder), which produced Facebook's Legacy Contact (CHI 2016 paper "Legacy Contact: Designing and Implementing Post-mortem Stewardship at Facebook"), concluded inheritance-style single-owner models fit poorly with networked mourning — stewardship, not ownership, is the workable frame. The owner's steward/co-steward model matches state of the art.

### 2.4 Impersonation and scams (active, 2024–present)

- **Fake funeral livestream scams**: within hours of a death announcement, scammers clone the deceased's photos into a fake page/"tribute page," post livestream links in funeral-home comment sections, and harvest credit cards via fake "location verification" ($17/2-weeks recurring charges) (Malwarebytes, Aug 2024; Dallas Morning News, Nov 2024).
- **Obituary piracy / AI-generated fake obituaries**: documented ecosystem in which SEO spammers monitor Google Trends for "obituary/death/accident" spikes and use generative AI to publish padded fake obituaries and YouTube "obituary readings" that outrank legitimate notices, monetized by ads/donation asks/flower upsells. Cases: college student **Matthew Sachman** (d. Jan 2024) — fake obits with wrong age, hometown, cause of death; LA Times writer **Deborah Vankin** — obituary published while alive. Sophos analyzed AI-enhanced fake obituary sites; Google shipped policy changes in March 2024 targeting clickbait obituary spam and terminated YouTube channels. Wikipedia now has an "Obituary piracy" article.
- Also documented: hackers hijacking dormant accounts of the deceased (NBC10 I-Team).
- Implication: any memorial product that makes pages **publicly indexable becomes raw material for this pipeline**; unindexable pages are invisible to trend-scraping pirates. Conversely, families may need help when pirates fabricate obituaries *elsewhere* — a possible support/education feature, not a product surface.

## 3. Network effects: do memorial products have any?

- **The per-death graph is real but bursty.** Verdery et al. (PNAS 2020) estimate ~**9 close kin** bereaved per death (the "bereavement multiplier"); the wider mourning circle (friends, colleagues, congregation) reaches into the hundreds — GoFundMe memorial campaigns and funeral livestreams show hundreds of participants mobilizing within 1–2 weeks, then decaying. Facebook's 30M monthly memorial-profile viewers prove long-tail return visits exist, but they accrue to the platform where the graph *already lived*.
- **No dedicated memorial product has demonstrated cross-memorial network effects.** The graveyard:
  - **Respectance** (2007, "MySpace for dead people," $1.5M VC, founders incl. Kazaa co-founder Richard Derks): never scaled; the domain still serves a tribute site in 2026 but as a low-activity shell, not a network (no evidence of scale in 19 years; shutdown never formally announced — status "zombie," verified by direct fetch 2026-08-28).
  - **1000Memories** (Y Combinator, 2010): pivoted from memorials to photo scanning, acquired by Ancestry 2012, shut down 2013.
  - **Eterni.me** (2014 digital-immortality avatars): dead by 2018 — publicity never converted to customers.
  - **iLasting** and **imorial**: both returned HTTP 503 on direct checks 2026-08-28; last third-party mentions are 2022–23 listicles — effectively moribund (could not verify formal shutdown).
  - **Tributes.com**: cited by Legacy's CEO as the cautionary case of delegated moderation and lower engagement.
  - Consolidation instead of network growth: **Keeper acquired GatheringUs** (Dec 2022) and sells B2B to cemeteries, funeral homes, hospices, and the VA's Veterans Legacy Memorial (4.4M veteran pages) — distribution via death-care institutions, not viral loops. Keeper also sells **walk-to-grave apps and cemetery kiosks** — the closest competitor to the owner's QR-plaque wedge.
  - Where investors actually put money: **Empathy** ($162M total through its 2025 Series C) sells bereavement *logistics* (500 hours, ~$12K of admin per death) through insurers/employers — B2B2C, zero social graph.
- **Cross-memorial discovery is the fork in the road.** Find a Grave and VLM are fully public and searchable — and get the stranger-creation and correction fights above. Facebook has the graph but treats memorials as retained profiles. An unlisted product structurally cannot have discovery-driven network effects; its growth channels are (a) the per-death share burst, (b) institutional distribution (funeral homes/hospices/cemeteries — the channel every surviving player converged on), and (c) the physical QR plaque, which is a *permanent offline acquisition surface* no purely-online competitor has per-family. Oxford Internet Institute projections (1.4–4.9B dead Facebook profiles by 2100; dead may outnumber living by ~2070) guarantee the category's demand but say nothing about winner-take-all dynamics — there are none visible; the market is fragmented, low-moat on features, and consolidating via funeral-industry distribution.
- **The durable community is not per-memorial.** Long-run engagement migrates to peer grief support (bereavement communities, group programs) — a different product with different liability. Per-memorial "communities of mourners" reliably decay to a handful of stewards plus anniversary spikes; products monetize the burst (funerals, fundraising, plaques) and the archive (lifetime plans, e.g. ForeverMissed $45/yr or ~$119–160 lifetime), not ongoing sociality.

## 4. Verdict: adopt / adapt / reject

**Adopt (evidence-backed, low risk):**
1. **Single warm reaction with ritual naming** (candle or heart, not "like") on approved memories — Wagner 2018; MuchLoved/Legacy/CaringBridge convergence. Zero-text gestures also shrink the moderation surface.
2. **Follow-by-subscription = email digest membership** (already built). CaringBridge shows subscription-to-updates is the natural "follow" for private grief spaces; make "subscribe to this memorial" an explicit, steward-visible list.
3. **Separate the archive from the tribute stream** (Facebook's 2019 Tributes-tab lesson): the deceased's curated story vs. visitors' ongoing contributions as distinct surfaces.
4. **Steward-controlled pruning of the archive** — Hollie Gazzard case: stewards must be able to remove/hide any content, including previously approved items.
5. **Anniversary prompts as steward-initiated, opt-in invitations** ("Her birthday is in two weeks — invite people to share a memory?") sent only to verified past contributors/subscribers — continuing-bonds evidence supports it; Facebook's failure shows only the *unconsented, automated* version is cruel.
6. **Funeral/moment-driven share tooling** (obituary card, service details, one-tap share to email/WhatsApp) — the only virality loop that demonstrably works (Ever Loved, GoFundMe), and it operates on links, compatible with unlisted pages.

**Adapt with care:**
1. **Comments on memories**: allow flat, steward-approved replies only; no threading (Legacy's 25%-filter rate and "mistresses" finding show even condolences need gating; moderation *increases* participation ~2x).
2. **Memorial fundraising** (charity donation in lieu of flowers): large proven demand ($330M/yr on GoFundMe) and a paid-tier candidate, but money attracts the 2024-era scam ecosystem — only via a regulated processor, payouts to named charities, never free-form cash asks.
3. **Co-steward/role granularity** (viewer / contributor / approver): Brubaker's stewardship research and Find a Grave's transfer wars argue for explicit succession and dispute paths (what happens when co-stewards disagree or a steward dies — extend the existing 90-day failsafe into a named-successor chain).
4. **Anniversary candle-lighting events** (a day the page accepts candles): bounded, opt-in resurfacing; avoid any push to people who never engaged.

**Reject outright:**
1. **Public discovery, directories, search, "nearby memorials," trending** — the precondition for RIP trolling (Phillips; Duffy conviction; Pilkington/Fletcher/Bates defacements), grief tourism (MyDeathSpace), and obituary-pirate scraping (2024 AI-obit ecosystem). Unenumerability is the product's security model; do not trade it for network effects that no memorial product has ever realized.
2. **Algorithmic resurfacing / "memories of the departed" push notifications** — Facebook needed AI cleanup and a public apology cycle for exactly this.
3. **Reaction palettes and like-counts / leaderboards** — norm violation (Wagner 2018); Find a Grave's points system shows gamification actively manufactures family-vs-stranger conflict.
4. **Tagging living people in memories** — imports notification pressure and identity disputes; even Facebook's implementation required steward override tooling. At most, free-text names with no account linkage.
5. **Cross-memorial social graph ("people you may have mourned with")** — recombines the temporary mourning graph into a persistent surveillance-adjacent structure nobody asked for; every attempt at a standalone social network of the dead (Respectance, 1000Memories' original vision, Eterni.me, iLasting, imorial) stalled, pivoted, or died, while survivors (Keeper, Legacy, Empathy) won on funeral-industry distribution and services.
6. **Open "anyone can create a memorial for anyone"** — Find a Grave's core grievance and the fake-tribute-scam vector; keep creation family-anchored and verified.

Net: the evidence says the growth question and the social-features question have opposite answers. Social *texture* (candles, tributes, subscriptions, anniversaries) is worth adding and is where this product's moderation-first design is a proven engagement advantage; social *architecture* (feeds, discovery, graphs, virality mechanics) is where every predecessor either died, got trolled, or became scam feedstock. "Facebook for the dead" already exists — it is Facebook, with 30M monthly memorial visitors — and its decade of retrofits (legacy contacts, tribute tabs, AI birthday suppression, tag controls) is a catalog of what happens when general-purpose social mechanics meet grief unmodified.

## Sources
- [Facebook Newsroom: Making It Easier to Honor a Loved One on Facebook After They Pass Away (2019 — tributes tab, legacy contact powers, AI birthday suppression, 30M monthly viewers)](https://about.fb.com/news/2019/04/updates-to-memorialization/)
- [Wagner (2018), Do not Click 'Like' When Somebody has Died: The Role of Norms for Mourning Practices in Social Media — Social Media + Society](https://journals.sagepub.com/doi/10.1177/2056305117744392)
- [MuchLoved — Virtual Candle Tribute Fund (candle types, donation fees)](https://virtual-candle.muchloved.com/)
- [MuchLoved tribute site features](https://www.muchloved.com/gateway/tribute-features/)
- [Legacy.com News: A Day in the Life of an Obituary Guest Book Screener (screens every entry; 12M/yr)](https://www.legacy.com/news/culture-and-history/a-day-in-the-life-of-an-obituary-guest-book-screener/)
- [Digiday: 'We're looking for mistresses' — how obit site Legacy keeps trolls at bay (25% filtered, 85/200 staff, 2x participation, Tributes.com contrast)](https://digiday.com/media/looking-mistresses-obit-site-legacy-keeps-trolls-bay/)
- [CaringBridge — What Is CaringBridge? (subscriptions, 'amp' heart, privacy tiers, monthly reaction/comment volume)](https://api.caringbridge.org/resources/what-is-caringbridge/)
- [ForeverMissed — memorial features (candles, configurable notifications, anniversary emails, role permissions)](https://www.forevermissed.com/memorial-sites-for-loved-ones)
- [ForeverMissed — Plans and Prices](https://www.forevermissed.com/ourplans)
- [Keeper Memorials — About Us (social vocabulary, founded 2013, VA Veterans Legacy Memorial 4.4M)](https://www.mykeeper.com/about-us)
- [Keeper for Cemeteries (walk-to-grave apps, kiosks)](https://www.mykeeper.com/cemeteries)
- [Keeper Memorials acquires GatheringUs (Dec 2022 consolidation)](https://events.gatheringus.com/blogs/news/keeper-memorials-expands-virtual-memorial-services-with-acquisition-of-gatheringus)
- [Ever Loved — Create a Beautiful Online Memorial (sharing, follower notifications, memorial funds)](https://everloved.com/online-memorials/)
- [NPR: Facebook Promises To Stop Asking You To Wish Happy Birthday To Your Friend Who Died (2019)](https://www.npr.org/2019/04/09/711399357/facebook-promises-to-stop-asking-you-to-wish-happy-birthday-to-your-friend-who-d)
- [CNBC: Still getting Facebook birthday reminders for your dead relatives? (2019)](https://www.cnbc.com/2019/07/24/facebook-still-highlighting-dead-relatives-birthday-heres-solution.html)
- [Phillips (2011), LOLing at tragedy: Facebook trolls, memorial pages and resistance to grief online — First Monday](https://firstmonday.org/ojs/index.php/fm/article/view/3168)
- [Channel 4 News: Teenager memorial website bully jailed (Sean Duffy, 2011)](https://www.channel4.com/news/dead-teenagers-memorial-website-bully-jailed)
- [NBC News: Town angry over Net slurs at suicide victim (Alexis Pilkington memorial trolling, 2010)](https://www.nbcnews.com/id/wbna36058532)
- [NBC News: Facebook urged to act after memorials defaced (Elliott Fletcher, Trinity Bates, 2010)](https://www.nbcnews.com/news/amp/wbna35581947)
- [MyDeathSpace — Wikipedia (grief tourism, privacy complaints, witch-hunt incident)](https://en.wikipedia.org/wiki/MyDeathSpace)
- [Euronews: German court rules Facebook must allow parents access to dead daughter's account (BGH 2018)](https://www.euronews.com/2018/07/12/german-court-rules-facebook-must-allow-parents-access-to-dead-daughter-s-account)
- [ITV News: Hollie Gazzard's family win fight to get photos of killer removed (2015)](https://www.itv.com/news/westcountry/update/2015-11-11/hollie-gazzards-family-win-fight-to-get-photos-of-killer-removed/)
- [DNAeXplained: Find a Grave, Seriously, JUST STOP Incentivizing the Creation of Memorials of the Recently Deceased (2022)](https://dna-explained.com/2022/06/02/find-a-grave-owned-by-ancestry-seriously-just-stop-incentivizing-the-creation-of-memorials-of-the-recently-deceased/)
- [Find a Grave News: Transferring Memorials (2022 rule change)](https://news.findagrave.com/2022/01/11/transferring-memorials/)
- [Brubaker & Callison-Burch (CHI 2016): Legacy Contact — Designing and Implementing Post-mortem Stewardship at Facebook](https://www.jedbrubaker.com/wp-content/uploads/2008/05/Brubaker-Callison-Burch-Legacy-CHI2016.pdf)
- [ACM CSCW 2019: Orienting to Networked Grief — Communal Mourning on Facebook (Brubaker et al.)](https://dl.acm.org/doi/10.1145/3359129)
- [Malwarebytes: Fake funeral 'live stream' scams target grieving users on Facebook (Aug 2024)](https://www.malwarebytes.com/blog/news/2024/08/fake-funeral-live-stream-scams-target-grieving-users-on-facebook)
- [Dallas Morning News: Funeral scam running through Facebook (Nov 2024)](https://www.dallasnews.com/news/watchdog/2024/11/20/funeral-scam-running-through-facebook-how-to-avoid-it-so-your-grief-doesnt-turn-to-anger/)
- [CNN: Fake obituary scams — AI-generated death announcements (Mar 2024)](https://www.cnn.com/2024/03/19/us/fake-obituary-scams-ai-cec/index.html)
- [Wikipedia: Obituary piracy (mechanics, Deborah Vankin case, Google policy response)](https://en.wikipedia.org/wiki/Obituary_piracy)
- [Sophos: Are Scammers Using AI to Enhance Fake Obituary Sites?](https://www.sophos.com/en-us/blog/are-scammers-using-ai-to-enhance-fake-obituary-sites)
- [Techdirt: False AI Obituary Spam (Matthew Sachman case, Feb 2024)](https://www.techdirt.com/2024/02/20/false-ai-obituary-spam-the-latest-symptom-of-our-obsession-with-mindless-automated-infotainment-engagement/)
- [NBC10 I-Team: Hackers hijack Facebook accounts of deceased users](https://turnto10.com/amp/i-team/nbc10-i-team-hackers-hijack-facebook-accounts-of-deceased-users)
- [Verdery et al. (PNAS 2020): Tracking the reach of COVID-19 kin loss with a bereavement multiplier (~9 close kin per death)](https://www.pnas.org/doi/10.1073/pnas.2007476117)
- [ScienceDaily / Oxford Internet Institute (Öhman & Watson 2019): The dead may outnumber the living on Facebook within 50 years](https://www.sciencedaily.com/releases/2019/04/190427104813.htm)
- [GoFundMe: funeral & memorial fundraising (125K fundraisers, $330M/yr)](https://www.gofundme.com/c/fundraising-tips/funeral-memorial)
- [Slate: Legacy.com has cornered the market on death online (traffic, 2017)](https://slate.com/technology/2017/12/legacy-com-has-cornered-the-market-on-death-online.html)
- [TechCrunch: Respectance — Social Networking With A Deadly Twist (2007, $1.5M)](https://techcrunch.com/2007/07/03/respectance-social-networking-with-a-deadly-twist/amp/)
- [TechCrunch: Ancestry.com Acquires 1000memories (2012; standalone shut down 2013)](https://techcrunch.com/2012/10/03/ancestry-com-acquires-photo-digitization-and-sharing-service-1000memories/)
- [1000Memories — Wikipedia (YC memorial-site origin, shutdown)](https://en.wikipedia.org/wiki/1000Memories)
- [Arrowsmith Press: The Door is Open — Death in the Digital Age (Eterni.me expired by 2018)](https://www.arrowsmithpress.com/journal/grief-tech)
- [Hospice News: Bereavement Care Company Empathy Raises $72M Series C (total $162M, 2025)](https://hospicenews.com/2025/05/30/bereavement-care-company-empathy-raises-72m-in-series-c-round/)
- ['We do it to keep him alive': bereaved individuals' experiences of online suicide memorials and continuing bonds — Mortality (2015)](https://www.tandfonline.com/doi/full/10.1080/13576275.2015.1083693)
- [Living Memory Home: Understanding Continuing Bond in the Digital Age (CHI 2021; continuing-bonds therapeutic evidence)](https://dl.acm.org/doi/fullHtml/10.1145/3411764.3445336)