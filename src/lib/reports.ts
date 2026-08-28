/**
 * Report lifecycle rules (PRD §4.6). Pure functions — the cron job and the
 * report API both route by these, and the tests exercise them directly.
 *
 * The lifecycle:
 *   memory report      → steward            (the family moderates its own page)
 *   page report / CSAM → escalated          (straight to the platform admin)
 *   steward silent 7d  → escalated          (non-response is an escalation)
 *   admin asks a question → awaiting_reporter
 *   no answer for 30d  → auto_closed        (never for CSAM/illegal)
 */
export type ReportStatus =
  | "open"
  | "steward"
  | "escalated"
  | "awaiting_reporter"
  | "resolved"
  | "auto_closed";

export type ReportCategory =
  | "fake_memorial"
  | "impersonation_or_ownership"
  | "harassment"
  | "inappropriate"
  | "spam"
  | "copyright"
  | "csam_or_illegal";

/** How long the stewards get before a memory report escalates to the admin. */
export const STEWARD_RESPONSE_DAYS = 7;

/** How long a reporter has to answer a follow-up before the report closes. */
export const REPORT_AUTOCLOSE_DAYS = 30;

const DAY_MS = 86_400_000;

export function daysAgo(days: number, now: Date = new Date()): string {
  return new Date(now.getTime() - days * DAY_MS).toISOString();
}

/**
 * Where a new report lands, and whether it is exempt from auto-closing.
 * CSAM/illegal never auto-closes and never waits on a steward.
 */
export function initialReportRouting(
  category: ReportCategory,
  isMemoryReport: boolean,
): { status: ReportStatus; neverAutoclose: boolean } {
  if (category === "csam_or_illegal") {
    return { status: "escalated", neverAutoclose: true };
  }
  return { status: isMemoryReport ? "steward" : "escalated", neverAutoclose: false };
}

/**
 * A memory report the stewards have left untouched past the deadline.
 * This is the "steward non-response" escalation the PRD requires — without it
 * an ignored report just ages out and the admin never learns of it.
 */
export function isStewardEscalationDue(
  report: { status: string; created_at: string },
  now: Date = new Date(),
): boolean {
  if (report.status !== "steward") return false;
  const age = now.getTime() - new Date(report.created_at).getTime();
  return age >= STEWARD_RESPONSE_DAYS * DAY_MS;
}

/**
 * Auto-close is conditional on an unanswered follow-up, not on age alone: a
 * report nobody has asked about yet must stay in the queue, not disappear.
 */
export function isAutoCloseDue(
  report: { status: string; follow_up_sent_at: string | null; never_autoclose: boolean },
  now: Date = new Date(),
): boolean {
  if (report.never_autoclose) return false;
  if (report.status !== "awaiting_reporter") return false;
  if (!report.follow_up_sent_at) return false;
  const waited = now.getTime() - new Date(report.follow_up_sent_at).getTime();
  return waited >= REPORT_AUTOCLOSE_DAYS * DAY_MS;
}
