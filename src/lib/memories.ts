/**
 * Which steward actions a memory will accept in its current state (PRD §4.5,
 * §4.6). Pure — both the moderation queue and the reports panel route through
 * it.
 *
 * The rule that matters: a memory that is already published is still
 * removable. Reports on approved memories go to the stewards first, so if
 * `approved` were a terminal state the family would have no way to act on the
 * report and the whole gray-zone model would dead-end.
 */
export type StewardMemoryAction = "approve" | "reject" | "reject_and_block";

export function stewardActionAllowed(status: string, action: StewardMemoryAction): boolean {
  if (action === "approve") return status === "pending";
  // Removal works from the queue and from the published feed.
  return status === "pending" || status === "approved";
}

/** Message shown when the memory has moved on since the page was loaded. */
export function actionConflictMessage(status: string, action: StewardMemoryAction): string {
  if (action === "approve" && status === "approved") return "This memory is already published.";
  if (status === "rejected") return "This memory has already been removed.";
  return "This memory is no longer available for that action.";
}
