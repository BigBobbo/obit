/**
 * Freemium split (PRD §8). Safety and moderation are identical on both tiers —
 * nothing in the moderation pipeline ever consults the plan.
 */
export const PLAN_LIMITS = {
  free: {
    maxPages: 1,
    maxPhotosPerPage: 50,
    customSlug: false,
    coStewards: false,
    plaquePdf: false,
    instantQueueNotifications: false,
    pagesPer30Days: 2,
  },
  paid: {
    maxPages: Infinity,
    maxPhotosPerPage: Infinity,
    customSlug: true,
    coStewards: true,
    plaquePdf: true,
    instantQueueNotifications: true,
    pagesPer30Days: 10,
  },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

export function limitsFor(plan: string) {
  return PLAN_LIMITS[(plan === "paid" ? "paid" : "free") as Plan];
}
