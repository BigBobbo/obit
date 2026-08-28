import { describe, it, expect } from "vitest";
import { stewardActionAllowed, actionConflictMessage } from "@/lib/memories";

describe("stewardActionAllowed", () => {
  it("lets a steward remove a memory that is already published", () => {
    // The whole point: a report about a published memory has to be actionable.
    expect(stewardActionAllowed("approved", "reject")).toBe(true);
    expect(stewardActionAllowed("approved", "reject_and_block")).toBe(true);
  });

  it("lets a steward act on the review queue", () => {
    expect(stewardActionAllowed("pending", "approve")).toBe(true);
    expect(stewardActionAllowed("pending", "reject")).toBe(true);
    expect(stewardActionAllowed("pending", "reject_and_block")).toBe(true);
  });

  it("refuses to approve something that is not awaiting review", () => {
    expect(stewardActionAllowed("approved", "approve")).toBe(false);
    expect(stewardActionAllowed("rejected", "approve")).toBe(false);
    expect(stewardActionAllowed("auto_rejected", "approve")).toBe(false);
  });

  it("refuses every action on unverified, rejected and auto-rejected memories", () => {
    for (const status of ["pending_verification", "rejected", "auto_rejected"]) {
      for (const action of ["approve", "reject", "reject_and_block"] as const) {
        expect(stewardActionAllowed(status, action)).toBe(false);
      }
    }
  });

  it("explains the conflict in terms the steward can act on", () => {
    expect(actionConflictMessage("approved", "approve")).toMatch(/already published/i);
    expect(actionConflictMessage("rejected", "reject")).toMatch(/already been removed/i);
  });
});
