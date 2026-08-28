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

/**
 * Free-for-now (PRD v2 §2.4). Pricing is **deferred, not deleted**: while the
 * product is funded, everyone gets the paid limits, and the fences, the Stripe
 * routes and their tests all stay exactly where they are. Returning to pricing
 * is then a config change rather than an archaeology project.
 */
export function allFeaturesFree(): boolean {
  const flag = process.env.ALL_FEATURES_FREE;
  return flag === "1" || flag === "true";
}

/** The plan a profile is *treated* as being on, flag included. */
export function effectivePlan(plan: string | null | undefined): Plan {
  if (allFeaturesFree()) return "paid";
  return plan === "paid" ? "paid" : "free";
}

export function limitsFor(plan: string | null | undefined) {
  return PLAN_LIMITS[effectivePlan(plan)];
}
