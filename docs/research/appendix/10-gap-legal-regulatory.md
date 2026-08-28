# GAP: Platform-regulation and post-mortem data law exposure (UK Online Safety Act, EU DSA, RUFADAA) — untouched by all six reports

# Legal/Regulatory Exposure: What "Going More Social" Actually Triggers

**Bottom line:** UK OSA and EU DSA duties already apply to this product today, size notwithstanding — but at the current gated scale they are paperwork-proportionate. Going "more social" (open contribution, discovery, feeds, recommender features) increases risk-assessment complexity, likely children's-safety exposure, and DSA classification risk. This is a genuine independent argument for staying small, gated, and moderated — or geo-limiting.

## 1. UK Online Safety Act 2023 — applies now, regardless of size or location

- **Scope:** Any user-to-user service with "links with the UK" is in scope wherever it is based: a significant number of UK users, UK as a target market, OR UK-accessible with material risk of significant harm (s.4(5)-(6), [legislation.gov.uk](https://www.legislation.gov.uk/ukpga/2023/50/section/4)). No numerical user threshold exists; the gov.uk explainer confirms duties apply "across the board" with proportionality by size/risk ([gov.uk explainer](https://www.gov.uk/government/publications/online-safety-act-explainer/online-safety-act-explainer)).
- **Unlisted/link-only doesn't help:** Schedule 1 exemptions cover only email/SMS/one-to-one aural/internal-business/"limited functionality" (comments on *provider* content). A site where users post photos and written memories visible to others fits no exemption ([Schedule 1](https://www.legislation.gov.uk/ukpga/2023/50/schedule/1)). Unlisted access is relevant only insofar as few UK users could mean the "significant number" limb isn't met — an untested, qualitative judgment.
- **Duties in force:** illegal-content risk assessment (enforced from 17 March 2025), children's access assessment, and (if children likely to access) children's risk assessment by 24 July 2025 (gov.uk, above). Minimal compliance for a small low-risk service = written illegal-content risk assessment, children's access assessment, specific ToS, a complaints/reporting route, takedown capability, a named accountable person — community templates exist ([onlinesafetyact.co.uk](https://onlinesafetyact.co.uk/), non-official). Note: Ofcom's own guidance pages returned 403 to this crawl; dates/duties verified via gov.uk and legislation.gov.uk.
- **Stakes and precedent of burden:** fines up to £18m or 10% of global turnover and service-blocking powers; small community forums (e.g., LFGSS) shut down citing compliance cost ([Wikipedia: OSA 2023](https://en.wikipedia.org/wiki/Online_Safety_Act_2023)). The product's existing three-tier moderation + steward approval maps well onto the required "measures," so incremental burden today is mostly documentation — but every new social feature reopens the risk assessments.

## 2. EU Digital Services Act — hosting duties have NO small-enterprise exemption

- Art. 19 exempts micro/small enterprises only from **Section 3 online-platform obligations** (internal complaints, trusted flaggers, transparency reports, etc.), not from **Section 2 hosting duties** ([Art. 19 text](https://www.eu-digital-services-act.com/Digital_Services_Act_Article_19.html)). So notice-and-action (electronic notice mechanism, confirmation, reasoned decision — [Art. 16](https://www.eu-digital-services-act.com/Digital_Services_Act_Article_16.html)) and statements of reasons apply regardless of size; the Commission confirms "lighter requirements" for small firms but not exemption ([EC DSA page](https://digital-strategy.ec.europa.eu/en/policies/digital-services-act)).
- **Real burden for a non-EU solo operator:** Art. 13 requires a designated **EU legal representative** (jointly liable) with no size carve-out ([Art. 13 text](https://www.eu-digital-services-act.com/Digital_Services_Act_Article_13.html)) — paid representative services typically cost real money annually. Caveat: DSA scope requires "offering services to the Union" (targeting), not mere accessibility — deliberately not marketing to the EU (or geo-limiting) is the practical lever.

## 3. United States — favorable

- **Section 230** squarely protects this model: the platform is not the publisher of contributor content (47 U.S.C. §230(c)(1)) and steward/automated moderation is protected under (c)(2); exceptions are federal criminal law, IP, and FOSTA ([Cornell LII](https://www.law.cornell.edu/uscode/text/47/230); [EFF](https://www.eff.org/issues/cda230) — explicitly covers small sites moderating "as they see fit").
- **RUFADAA** (47 states as of 2021) governs fiduciary access to a **decedent's own accounts** held by custodians, via online-tool > will > ToS priority ([Wikipedia: digital inheritance](https://en.wikipedia.org/wiki/Digital_inheritance)). A memorial page is the *steward's* (living person's) account containing third-party content *about* the deceased — RUFADAA creates no claim for relatives against the site over such content. It would matter only if a steward dies and their executor demands account access; a ToS clause + succession feature (co-stewards already exist) handles this. **Photo ownership:** copyright sits with the photographer (contributor), inheritable to their estate — the site needs only a license grant in its ToS.

## 4. GDPR — the dead are out, the living are in, member states vary

- Recital 27: GDPR "does not apply to the personal data of deceased persons," but Member States may legislate ([gdpr-info.eu](https://gdpr-info.eu/recitals/no-27/)). Contributors' and stewards' data (emails, IPs, uploads identifying living people in photos) remains fully GDPR-regulated if EU users are served.
- **France:** Loi Informatique et Libertés Arts. 48/85 — post-mortem directives; absent directives, heirs can demand account closure, cessation of processing, and updates ([DLA Piper France](https://www.dlapiperdataprotection.com/index.html?t=law&c=FR)). A French heir could therefore lawfully demand takedown of a deceased person's memorial data — a direct collision with a non-family steward model. **Denmark** (GDPR applied ~10 years post-mortem) and **Hungary** (relatives may enforce rights ~5 years) are widely reported but were **not verifiable via primary sources this session** (Datatilsynet PDF unreachable); treat as probable.

## 5. Precedent

- **BGH, 12 July 2018, III ZR 183/17:** Facebook account contract passed to a dead 15-year-old's parents by universal succession (§1922 BGB); memorialization terms held invalid; heirs got full access ([BGH press release](https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2018/2018115.html)). Lesson: heirs' claims can override platform memorial policies — design ToS and steward-succession explicitly.
- **No enforcement/litigation specifically against memorial/tribute sites was found** (searches curtailed by session limits — treat as absence of evidence, not proof). Residual risks: defamation of living people in tributes (platform shielded in US via §230; in UK/EU shielded only while operating notice-and-takedown), and post-mortem right of publicity (US state laws target *commercial* use — low risk for family-created memorials).

## Decision relevance

| Option | Legal load |
|---|---|
| Stay gated/unlisted/steward-moderated | OSA/DSA duties exist but are documentation-scale; current moderation stack largely satisfies substantive measures |
| Go "more social" (open posting, discovery, feeds) | Heavier OSA risk profile + likely children's-risk duties; recommender features add DSA Art. 27+ exposure if platform-classified; more UGC volume = more notice-handling |
| Geo-limit (block/not target UK and/or EU) | Removes OSA "links" and DSA "offering to Union" hooks — the cheapest full mitigation, at the cost of those markets |

The compliance gradient is real and points the same way as the product's existing design: small, gated, moderated.

## Sources
- [Online Safety Act 2023, s.4 (links with the UK test) — legislation.gov.uk](https://www.legislation.gov.uk/ukpga/2023/50/section/4)
- [Online Safety Act 2023, Schedule 1 (exempt services) — legislation.gov.uk](https://www.legislation.gov.uk/ukpga/2023/50/schedule/1)
- [Online Safety Act explainer — GOV.UK (DSIT)](https://www.gov.uk/government/publications/online-safety-act-explainer/online-safety-act-explainer)
- [Online Safety Act 2023 — Wikipedia (enforcement, LFGSS closure, penalties)](https://en.wikipedia.org/wiki/Online_Safety_Act_2023)
- [onlinesafetyact.co.uk — OSA compliance templates for small services (Neil Brown, unofficial)](https://onlinesafetyact.co.uk/)
- [DSA Article 19 — exclusion for micro and small enterprises](https://www.eu-digital-services-act.com/Digital_Services_Act_Article_19.html)
- [DSA Article 16 — notice and action mechanisms](https://www.eu-digital-services-act.com/Digital_Services_Act_Article_16.html)
- [DSA Article 13 — legal representatives for non-EU providers](https://www.eu-digital-services-act.com/Digital_Services_Act_Article_13.html)
- [The Digital Services Act — European Commission](https://digital-strategy.ec.europa.eu/en/policies/digital-services-act)
- [47 U.S. Code § 230 — Cornell Legal Information Institute](https://www.law.cornell.edu/uscode/text/47/230)
- [Section 230 — Electronic Frontier Foundation](https://www.eff.org/issues/cda230)
- [Digital inheritance (RUFADAA, Stored Communications Act) — Wikipedia](https://en.wikipedia.org/wiki/Digital_inheritance)
- [GDPR Recital 27 — Not applicable to data of deceased persons](https://gdpr-info.eu/recitals/no-27/)
- [Data Protection Laws of the World: France (post-mortem directives, heirs' rights) — DLA Piper](https://www.dlapiperdataprotection.com/index.html?t=law&c=FR)
- [BGH press release, 12 July 2018, III ZR 183/17 (Facebook account inheritance)](https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2018/2018115.html)
- [RUFADAA committee page — Uniform Law Commission](https://www.uniformlaws.org/committees/community-home?CommunityKey=f7237fc4-74c2-4728-81c6-b39a91ecdf22)