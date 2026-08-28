/**
 * Approval latency (PRD v2 §2.3, §7).
 *
 * This is the product's conversion risk: a contributor who writes something and
 * watches nothing happen does not come back, and neither do the people they
 * would have told. The PRD's target is a median under 24 hours — so it gets
 * measured from day one and shown to the steward, rather than optimised from a
 * hunch later.
 *
 * Only memories that actually waited for a human count. An auto-published
 * memory is decided in milliseconds; averaging those in would show every
 * steward a reassuring number that means nothing.
 */

export type DecisionRow = {
  created_at: string;
  decided_at: string | null;
  moderation_scores: unknown;
};

export type LatencySample = { queuedAt: number; decidedAt: number };

/**
 * The clock starts when the memory entered the queue, not when it was
 * submitted: the minutes a contributor spends finding the verification email
 * are not the family's response time.
 */
export function toLatencySamples(rows: DecisionRow[]): LatencySample[] {
  const samples: LatencySample[] = [];
  for (const row of rows) {
    const routing = (row.moderation_scores as { routing?: { outcome?: string; decided_at?: string } } | null)
      ?.routing;
    if (routing?.outcome !== "pending") continue;
    if (!row.decided_at) continue;

    const queuedAt = Date.parse(routing.decided_at ?? row.created_at);
    const decidedAt = Date.parse(row.decided_at);
    if (Number.isNaN(queuedAt) || Number.isNaN(decidedAt) || decidedAt < queuedAt) continue;
    samples.push({ queuedAt, decidedAt });
  }
  return samples;
}

export function medianHours(samples: LatencySample[]): number | null {
  if (samples.length === 0) return null;
  const hours = samples.map((s) => (s.decidedAt - s.queuedAt) / 3_600_000).sort((a, b) => a - b);
  const mid = Math.floor(hours.length / 2);
  return hours.length % 2 === 1 ? hours[mid] : (hours[mid - 1] + hours[mid]) / 2;
}

/** The PRD's target: p50 under a day. */
export const LATENCY_TARGET_HOURS = 24;

export function formatLatency(hours: number): string {
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60));
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  }
  if (hours < 48) {
    const rounded = Math.round(hours);
    return `${rounded} ${rounded === 1 ? "hour" : "hours"}`;
  }
  const days = Math.round(hours / 24);
  return `${days} days`;
}
