/**
 * Kind declines (PRD v2 §2.3).
 *
 * Jhaver et al. (2019): unexplained removal suppresses return far more than
 * removal does. A bare rejection costs the family a contributor and costs the
 * contributor the sense that anyone read what they wrote — so a steward
 * declining a memory always sends *something*, and these are the three
 * sentences that cover almost every real case.
 *
 * A steward can always write their own instead. The one thing they cannot do is
 * decline in silence.
 */
export type DeclineTemplate = { id: string; label: string; body: string };

export const DECLINE_TEMPLATES: DeclineTemplate[] = [
  {
    id: "private",
    label: "Too private to publish",
    body:
      "Thank you for writing this — it meant a lot to read. It touches on something the family would rather keep private, so we haven't published it on the page. We're very glad to have it.",
  },
  {
    id: "not_right_place",
    label: "Better said directly to the family",
    body:
      "Thank you for this. We think it belongs with the family rather than on a public page, so we haven't published it here — but it has been read, and it was welcome.",
  },
  {
    id: "difficult",
    label: "A difficult time for the family",
    body:
      "Thank you for taking the time to write. This is a hard week and the family has decided not to publish this one. Nothing about it was wrong — please do share another memory if you'd like to.",
  },
];

/** What a memory taken down after somebody reported it tells its author. */
export const REPORTED_DECLINE_REASON =
  "Someone raised a concern about this memory and the family has taken it down. If that seems wrong to you, please write to us and a person will look at it.";

/** What a memory the automated checks stopped tells its author. */
export const AUTO_DECLINE_REASON =
  "Our automated checks flagged this one, so it wasn't published. They're deliberately cautious and they do get it wrong — if you think that's what happened here, please write to us and a person will look.";

const MAX_REASON = 1000;

/**
 * A steward's own words win; a template id falls back to its text; anything
 * else falls back to the gentlest template rather than to nothing. There is no
 * code path that produces a decline with no reason.
 */
export function resolveDeclineReason(input: {
  templateId?: string | null;
  custom?: string | null;
}): string {
  const custom = input.custom?.trim();
  if (custom) return custom.slice(0, MAX_REASON);
  const template = DECLINE_TEMPLATES.find((t) => t.id === input.templateId);
  return (template ?? DECLINE_TEMPLATES[2]).body;
}
