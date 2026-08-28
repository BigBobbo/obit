/**
 * Outcome of a steward acting on a request to join a page as co-steward
 * (PRD §4.2 dedupe path, §6 ownership disputes). Pure, so the state machine is
 * testable without a database.
 */
export type ApprovalOutcome = "plan_limit" | "awaiting_signup" | "approved";

/**
 * Co-stewards are a paid feature of the page owner's plan, so that check comes
 * first. An approved requester without an account is not a failure: the
 * request parks in `awaiting_signup` and the steward can finish it once they
 * have signed up, rather than the approval being lost.
 */
export function approvalOutcome(opts: {
  ownerAllowsCoStewards: boolean;
  requesterHasAccount: boolean;
}): ApprovalOutcome {
  if (!opts.ownerAllowsCoStewards) return "plan_limit";
  if (!opts.requesterHasAccount) return "awaiting_signup";
  return "approved";
}

export function isOpenRequest(status: string): boolean {
  return status === "pending" || status === "awaiting_signup";
}
