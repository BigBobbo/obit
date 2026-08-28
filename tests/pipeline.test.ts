import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStub, type Row } from "./helpers/supabase-stub";

const stubs = vi.hoisted(() => ({ client: null as unknown, scoreText: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => stubs.client,
}));
vi.mock("@/lib/moderation/llm", () => ({ scoreText: stubs.scoreText }));
vi.mock("@/lib/email", () => ({ sendPendingNotification: vi.fn() }));

import { runModerationPipeline } from "@/lib/moderation/pipeline";
import { defaultModerationConfig, resetModerationConfigCache } from "@/lib/moderation/config";

const T = defaultModerationConfig().thresholds;

type Scores = {
  toxicity: number;
  spam: number;
  relevance: number;
  mentions_living_person_negatively: boolean;
  flags: string[];
};

const CLEAN: Scores = {
  toxicity: 0.01,
  spam: 0.01,
  relevance: 0.95,
  mentions_living_person_negatively: false,
  flags: [],
};

type Scenario = {
  body?: string;
  scores?: Scores | null;
  page?: Row;
  approvedCount?: number;
};

/**
 * Builds the world for one submission and runs the pipeline over it.
 * Defaults describe the happy path: a returning contributor, an active page in
 * auto-publish mode, and clean scores.
 */
async function route(scenario: Scenario = {}) {
  const {
    body = "She taught me how to make bread.",
    scores = CLEAN,
    page = {},
    approvedCount = 3,
  } = scenario;

  const { client, state } = createStub({
    memories: [
      {
        id: "m1",
        page_id: "p1",
        body,
        contributor_email: "friend@example.com",
        contributor_name: "Alex",
      },
    ],
    pages: [
      {
        id: "p1",
        name: "Mary Doe",
        status: "active",
        review_everything: false,
        auto_publish_optout: false,
        ...page,
      },
    ],
    contributors: [{ email: "friend@example.com", approved_count: approvedCount }],
    stewards: [],
  });

  stubs.client = client;
  stubs.scoreText.mockResolvedValue(scores);
  resetModerationConfigCache();

  const outcome = await runModerationPipeline("m1");
  const update = state.updates.find((u) => u.table === "memories");
  const routing = (update?.values.moderation_scores as { routing: { reasons: string[] } })
    ?.routing;

  return { outcome, reasons: routing?.reasons ?? [], state };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Tier 2 routing — auto-publish", () => {
  it("publishes a clean memory from a returning contributor on an auto-publish page", async () => {
    const { outcome, reasons } = await route();
    expect(outcome).toBe("approved");
    expect(reasons).toEqual([]);
  });

  it("records approved_at and bumps the contributor's counter", async () => {
    const { state } = await route();
    const update = state.updates.find((u) => u.table === "memories");
    expect(update?.values.status).toBe("approved");
    expect(update?.values.approved_at).toBeTypeOf("string");
    expect(state.rpcs).toContainEqual({
      fn: "bump_approved_count",
      args: { p_email: "friend@example.com" },
    });
  });

  it("publishes a photo-only submission without calling the scorer", async () => {
    const { outcome } = await route({ body: "   " });
    expect(outcome).toBe("approved");
    expect(stubs.scoreText).not.toHaveBeenCalled();
  });
});

describe("Tier 2 routing — auto-reject", () => {
  it("rejects at or above the toxicity reject threshold", async () => {
    const { outcome, reasons } = await route({
      scores: { ...CLEAN, toxicity: T.toxicity_reject },
    });
    expect(outcome).toBe("auto_rejected");
    expect(reasons).toContain("tier1_hard_reject");
  });

  it("rejects at or above the spam reject threshold", async () => {
    const { outcome } = await route({ scores: { ...CLEAN, spam: T.spam_reject } });
    expect(outcome).toBe("auto_rejected");
  });

  it("does not bump the approval counter on a rejection", async () => {
    const { state } = await route({ scores: { ...CLEAN, toxicity: 1 } });
    expect(state.rpcs).toEqual([]);
  });

  it("queues rather than rejects just below the reject threshold", async () => {
    const { outcome } = await route({
      scores: { ...CLEAN, toxicity: T.toxicity_reject - 0.01 },
    });
    expect(outcome).toBe("pending");
  });
});

describe("Tier 2 routing — steward queue", () => {
  it("queues a first-time contributor even with clean scores", async () => {
    const { outcome, reasons } = await route({ approvedCount: 0 });
    expect(outcome).toBe("pending");
    expect(reasons).toContain("first_time_contributor");
  });

  it("queues a contributor with no record at all", async () => {
    const { client, state } = createStub({
      memories: [
        {
          id: "m1",
          page_id: "p1",
          body: "A kind note.",
          contributor_email: "stranger@example.com",
          contributor_name: "Sam",
        },
      ],
      pages: [
        {
          id: "p1",
          name: "Mary Doe",
          status: "active",
          review_everything: false,
          auto_publish_optout: false,
        },
      ],
      contributors: [],
      stewards: [],
    });
    stubs.client = client;
    stubs.scoreText.mockResolvedValue(CLEAN);
    resetModerationConfigCache();

    expect(await runModerationPipeline("m1")).toBe("pending");
    expect(state.rpcs).toEqual([]);
  });

  it("queues on borderline toxicity", async () => {
    const { outcome, reasons } = await route({
      scores: { ...CLEAN, toxicity: T.toxicity_review },
    });
    expect(outcome).toBe("pending");
    expect(reasons).toContain("borderline_scores");
  });

  it("queues on borderline spam", async () => {
    const { outcome } = await route({ scores: { ...CLEAN, spam: T.spam_review } });
    expect(outcome).toBe("pending");
  });

  it("queues when relevance falls below the floor", async () => {
    const { outcome } = await route({
      scores: { ...CLEAN, relevance: T.relevance_review_below - 0.01 },
    });
    expect(outcome).toBe("pending");
  });

  it("queues when a living person is named negatively", async () => {
    const { outcome } = await route({
      scores: { ...CLEAN, mentions_living_person_negatively: true },
    });
    expect(outcome).toBe("pending");
  });

  it("queues when the model raised any flag", async () => {
    const { outcome } = await route({ scores: { ...CLEAN, flags: ["possible_dispute"] } });
    expect(outcome).toBe("pending");
  });

  it("queues everything on a review-everything page", async () => {
    const { outcome, reasons } = await route({ page: { review_everything: true } });
    expect(outcome).toBe("pending");
    expect(reasons).toContain("page_mode_review_everything");
  });

  it("queues everything on a page under an inactivity hold", async () => {
    const { outcome, reasons } = await route({ page: { status: "inactivity_hold" } });
    expect(outcome).toBe("pending");
    expect(reasons).toContain("page_mode_inactivity_hold");
  });

  it("queues everything on a frozen page", async () => {
    const { outcome, reasons } = await route({ page: { status: "frozen" } });
    expect(outcome).toBe("pending");
    expect(reasons).toContain("page_mode_frozen");
  });
});

describe("Tier 2 routing — degraded scoring fails toward review", () => {
  /**
   * The property the whole unattended design rests on: when the scorer is
   * unavailable, a submission must land in front of a human rather than on the
   * page. Never let this one flip to "approved".
   */
  it("queues when scoring returns null", async () => {
    const { outcome, reasons } = await route({ scores: null });
    expect(outcome).toBe("pending");
    expect(reasons).toContain("scoring_unavailable");
  });

  it("queues on unavailable scoring even for a trusted returning contributor", async () => {
    const { outcome } = await route({ scores: null, approvedCount: 99 });
    expect(outcome).toBe("pending");
  });
});

describe("Tier 2 routing — reasons are recorded for every decision", () => {
  it("stores the tier 1 scores and the routing decision on the memory", async () => {
    const { state } = await route({ approvedCount: 0 });
    const update = state.updates.find((u) => u.table === "memories");
    const saved = update?.values.moderation_scores as {
      tier1: unknown;
      routing: { outcome: string; reasons: string[]; decided_at: string };
    };
    expect(saved.tier1).toEqual(CLEAN);
    expect(saved.routing.outcome).toBe("pending");
    expect(saved.routing.decided_at).toBeTypeOf("string");
  });
});
