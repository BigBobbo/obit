import { formatGivingTotal } from "@/lib/giving/format";
import type { GivingBlock as GivingBlockData } from "@/lib/giving/queries";

/**
 * "In lieu of flowers" (PRD v2 §3.2).
 *
 * Three things this block is careful about, and each of them is a decision
 * rather than a style:
 *
 *   - the destination is a *named, verified* charity, never a cash ask;
 *   - the only amount shown is the total, because a donor wall that ranks
 *     people by what they could afford is a cruelty at a funeral;
 *   - the footnote says plainly where the money goes and that none of it comes
 *     to us, because that is both true and the thing people are right to ask.
 */
export function GivingBlock({
  giving,
  personName,
  partnerName,
}: {
  giving: GivingBlockData;
  personName: string;
  partnerName: string;
}) {
  return (
    <section className="mt-12 rounded-lg border border-border bg-card p-6">
      <h2 className="font-serif text-2xl">In lieu of flowers</h2>
      <p className="mt-2 text-base text-muted-foreground">
        {giving.charities.length === 1
          ? `${personName}'s family has asked that gifts go to:`
          : `${personName}'s family has asked that gifts go to one of these:`}
      </p>

      <ul className="mt-4 space-y-3">
        {giving.charities.map((charity) => (
          <li
            key={charity.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-4"
          >
            <div>
              <p className="font-medium">{charity.name}</p>
              <p className="text-sm text-muted-foreground">
                In memory of {personName} · EIN {charity.ein}
              </p>
            </div>
            <a
              href={`/api/page-charities/${charity.id}/donate`}
              rel="nofollow"
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-base font-medium text-primary-foreground hover:bg-primary/90"
            >
              Donate
            </a>
          </li>
        ))}
      </ul>

      {giving.totalCents > 0 && (
        <p className="mt-4 font-serif text-lg">
          {formatGivingTotal(giving.totalCents)} given in {personName}&apos;s memory.
        </p>
      )}

      {giving.donors.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="font-serif text-lg">With thanks to</h3>
          {giving.donors.map((donor) => (
            <div key={donor.id} className="border-l-2 border-border pl-3">
              {donor.name && <p className="text-sm font-medium">{donor.name}</p>}
              {donor.message && (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{donor.message}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
        Donations are made to the charity through {partnerName}, which handles the
        payment and sends your receipt. Memorial Pages is not a fundraiser, never
        holds your money and takes no part of it.
      </p>
    </section>
  );
}
