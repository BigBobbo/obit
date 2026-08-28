import { describe, it, expect } from "vitest";
import { approvalOutcome, isOpenRequest } from "@/lib/steward-requests";

describe("approvalOutcome", () => {
  it("adds the co-steward when the plan allows it and they have an account", () => {
    expect(
      approvalOutcome({ ownerAllowsCoStewards: true, requesterHasAccount: true }),
    ).toBe("approved");
  });

  it("parks the approval when the requester has no account yet", () => {
    // The approval must survive: losing it would make the family approve twice.
    expect(
      approvalOutcome({ ownerAllowsCoStewards: true, requesterHasAccount: false }),
    ).toBe("awaiting_signup");
  });

  it("checks the plan before anything else", () => {
    expect(
      approvalOutcome({ ownerAllowsCoStewards: false, requesterHasAccount: true }),
    ).toBe("plan_limit");
    expect(
      approvalOutcome({ ownerAllowsCoStewards: false, requesterHasAccount: false }),
    ).toBe("plan_limit");
  });
});

describe("isOpenRequest", () => {
  it("treats pending and awaiting_signup as still actionable", () => {
    expect(isOpenRequest("pending")).toBe(true);
    expect(isOpenRequest("awaiting_signup")).toBe(true);
  });

  it("treats decided requests as closed", () => {
    expect(isOpenRequest("approved")).toBe(false);
    expect(isOpenRequest("declined")).toBe(false);
  });
});
