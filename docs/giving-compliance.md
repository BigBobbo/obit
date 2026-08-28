# Giving — compliance checklist (PRD v2 §3.3)

"In lieu of flowers" is the highest-compliance-weight feature in the product,
accepted with eyes open. The code is written; **the feature does not ship until
every box below is ticked by a person**. Nothing here can be closed by a
developer alone, which is why it is a document and not a test.

Giving is off unless `GIVING_PARTNER` and the partner keys are set, so an
unfinished checklist is also an unshipped feature rather than a live risk.

## The three constraints the design rests on

| Constraint | Where it is enforced |
|---|---|
| **Named, verified 501(c)(3) charities only** — never a free-form cash ask, never a personal beneficiary | `POST /api/pages/[id]/charities` re-checks the EIN against the partner's registry; `page_charities.ein` has a format CHECK; there is no free-text destination anywhere |
| **0% platform fee** | We are not in the payment path at all. There is no fee to take and no code that could take one |
| **We never hold funds** | Donor → partner-hosted checkout → charity. `/api/page-charities/[id]/donate` is a redirect; `donations` records a *receipt*, not a balance. No payout, no ledger, no refund path — because there is nothing of anyone's to hold |

## Launch blockers

- [ ] **Partner terms cover memorial framing.** Confirm in writing that the
      partner permits in-memory designations, our display of an aggregate total,
      and a donor wall of names and messages.
- [ ] **Partner API verified against a live account.** `src/lib/giving/partner.ts`
      follows Every.org's published partner API, but the search response shape,
      the donate-link parameters and — most importantly — **how the confirmation
      webhook is authenticated** have not been exercised against a real account.
      The adapter accepts the shared token from the payload or from an
      `Authorization` header and drops anything else; if the partner does
      neither, donations will not record. That is a loud failure, not a silent
      hole, but it is still a blocker.
- [ ] **Webhook endpoint registered** with the partner, pointing at
      `POST /api/giving/webhook`, with `EVERY_ORG_WEBHOOK_TOKEN` matching.
- [ ] **ToS language reviewed.** The "Charitable donations" section of
      `/legal/terms` says we are not a fundraiser, take no portion, never hold
      funds and issue no receipts. A lawyer should read it, not just a
      developer.
- [ ] **State charitable-solicitation exposure checked.** Expected to be low
      precisely because we never touch the money and never solicit on a
      charity's behalf — but verified, not assumed. This is the item the PRD
      calls the legal review checkpoint.
- [ ] **US-only confirmed at launch.** EIN validation already limits
      destinations to US registrants; confirm the partner's checkout does not
      offer non-US charities through the same search.

## Fake-fundraiser defence

The giving block is the **only** donation surface on a memorial. Tier 0 blocks a
competing ask before it is ever stored:

| Pattern | Reason recorded |
|---|---|
| A fundraising or payment host (`gofundme.com`, `paypal.me`, `cash.app`, …) | `fundraising_link` |
| A payment handle (`$cashtag`) | `payment_handle` |
| A payment brand next to an ask ("venmo me", "donate through cash app") | `fundraising_solicitation` |

Ordinary memories that merely mention money are deliberately left alone — "she
raised thousands for the hospice" is a memory, and `tests/giving.test.ts` keeps
it one.

## What the family and the donor see

- The memorial and the announcement both show the block: charity name, "in
  memory of ___", and a donate button.
- **The total is the only amount ever displayed.** Per-donor amounts are not
  merely hidden in the UI — `donations` has no read policy at all, so the anon
  key cannot reach them.
- Donor names and messages run the existing moderation pipeline before display,
  exactly like a memory. Hiding a message never hides the money: the total
  counts every confirmed donation, because the gift happened either way.
- The block's footnote names the partner and states plainly that we take no part
  of the gift and issue no receipt.
