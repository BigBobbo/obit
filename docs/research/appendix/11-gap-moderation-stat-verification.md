# GAP: Unverified keystone stat: 'moderated guest books get ~2x more entries; 92% of families value screening'

# Verification: Legacy.com "2x entries / 92% of families" moderation figures

## Verdict: the two figures could NOT be sourced — treat as unverified and drop them

Targeted hunting found **no primary or secondary source** for either "moderated guest books get ~2x more entries" or "92% of families value the screening."

**What the verifiable record actually contains:**

- **Digiday 2017** (re-fetched and re-checked): Legacy filters **25% of ~1M monthly guestbook comments**; **85 of 200 staff** do screening; **30,000 rules** flag religious spam; screeners get 30 hours of training; Katie Falzone ran screening for 14 years; and the qualitative Tributes.com contrast — "Tributes, a rival site that Legacy bought last year, left screening to the families and funeral homes, and engagement suffered." The article **explicitly contains neither the 2x figure nor the 92% figure** (confirmed by direct fetch): https://digiday.com/media/looking-mistresses-obit-site-legacy-keeps-trolls-bay/
- **Wikipedia's Legacy.com article** (citing a 2008 Reuters/PR item): Legacy "reviews more than 1,000,000 guestbook entries each month"; ~75% of Guest Books receive entries; ~100M cumulative entries by 2016. No 2x, no 92%: https://en.wikipedia.org/wiki/Legacy.com
- **Everywhere else searched: nothing.** PR Newswire's archive search for "Legacy.com guest book" returns zero releases (https://www.prnewswire.com/search/news/?keyword=Legacy.com+guest+book). blog.legacy.com now returns HTTP 503 (apparently defunct); legacy.com's FAQ and /sales pages are bot-blocked (403), so the 2010 "Guest Book screening: a job for humans, not bots" post could not be retrieved. Site searches of The Hustle and Street Fight found no Legacy.com coverage; Marginalia, Bing, and DuckDuckGo queries for the exact figures/phrases surfaced nothing.
- **Tooling caveat:** web.archive.org, archive.ph, and mementoweb were all unreachable from this environment, and general search engines were partially degraded, so absence here is not absolute proof of absence — but nothing in the accessible record (including the two articles the claim was attributed to) supports the numbers. **The safest read: the figures were confabulated in an earlier synthesis pass by quantifying Digiday's qualitative claim.** The synthesis should downgrade to: *Legacy.com invested heavily in human pre-publication screening (85/200 staff, 25% of ~1M monthly entries filtered) and attributed acquired rival Tributes.com's weaker engagement to pushing screening onto families and funeral homes — the company's own uncontrolled, self-serving attribution.*

## Independent quantitative evidence on moderation vs. participation

No condolence/tribute-platform study quantifying pre-moderation's effect on contribution volume was found (CaringBridge and Facebook-memorial literature covers grief practice and stewardship design, not moderation→volume). Adjacent peer-reviewed evidence, all verified against the papers themselves:

| Study | Finding | Direction |
|---|---|---|
| Wise, Hamman & Thorson 2006, JCMC (10.1111/j.1083-6101.2006.00313.x) | Experiment, N=62: viewing a **moderated** community produced significantly higher intent to participate than unmoderated (M 35.43 vs 28.57; F(1,55)=4.47, p<.04) | Moderation helps |
| Matias 2019, PNAS (10.1073/pnas.1813486116) | Field experiment, 2,190 r/science threads: displaying community rules raised newcomer rule compliance >8 pp and **increased newcomer participation ~70%** | Visible norms help |
| Jhaver, Bruckman & Gilbert 2019, CSCW (10.1145/3359252) | 32M Reddit posts: removal **explanations** reduce odds of future removals; bot explanations work as well as human ones | Transparent moderation helps |
| Jhaver et al. 2019, CSCW (10.1145/3359294) | Survey of 907 removed-post authors (~20% of Reddit posts are removed): 37% didn't understand the removal, 29% frustrated; guidelines/explanations → higher perceived fairness and **propensity to post again** | Unexplained rejection hurts |
| Halfaker, Kittur & Riedl 2011, WikiSym (10.1145/2038558.2038585) | 400K revisions: reverts are "powerfully demotivating," worst for newcomers rejected by experienced members | Rejection suppresses newcomers |

Caveats: Wise et al. is a small student-sample study measuring *intent*, not behavior; Matias tests norm visibility, not approval queues; the Reddit/Wikipedia studies measure post-hoc removal, not pre-publication delay. None directly tests an approval-gated condolence wall.

## Implication for Memorial Pages

The thesis "moderation is an engagement feature, not a tax" survives only in a weaker form: visible, well-explained moderation plausibly *encourages* participation (Wise; Matias), and Legacy's behavior is revealed-preference evidence that a market leader thought screening drove engagement — but the flagship 2x/92% numbers must not be cited. The counter-evidence (rejection and opaque queues demotivate — Halfaker; Jhaver) means approval latency is a live conversion risk that should be **measured in-product**: instrument time-to-approval vs. contributor return rate, always send contributors an immediate "awaiting the family's approval" acknowledgment plus an explanation on any decline (both mechanisms the Jhaver papers show matter), surface house rules on the contribution form (Matias), and consider testing auto-publish-after-automated-screening with steward retract vs. strict pre-approval.

## Sources
- [Digiday (2017): 'We're looking for mistresses': How obit site Legacy keeps trolls at bay](https://digiday.com/media/looking-mistresses-obit-site-legacy-keeps-trolls-bay/)
- [Wikipedia: Legacy.com (guest book review volume, 75% of guest books receive entries)](https://en.wikipedia.org/wiki/Legacy.com)
- [PR Newswire search: 'Legacy.com guest book' — zero results](https://www.prnewswire.com/search/news/?keyword=Legacy.com+guest+book)
- [Wise, Hamman & Thorson (2006), Moderation, Response Rate, and Message Interactivity, JCMC 12(1)](https://academic.oup.com/jcmc/article/12/1/24/4582970)
- [Matias (2019), Preventing harassment and increasing group participation through social norms, PNAS](https://doi.org/10.1073/pnas.1813486116)
- [Jhaver, Bruckman & Gilbert (2019), Does Transparency in Moderation Really Matter?, CSCW](https://doi.org/10.1145/3359252)
- [Jhaver et al. (2019), 'Did You Suspect the Post Would be Removed?', CSCW](https://doi.org/10.1145/3359294)
- [Halfaker, Kittur & Riedl (2011), Don't Bite the Newbies, WikiSym](https://doi.org/10.1145/2038558.2038585)