import { describe, it, expect } from "vitest";
import {
  initialReportRouting,
  isStewardEscalationDue,
  isAutoCloseDue,
  daysAgo,
  STEWARD_RESPONSE_DAYS,
  REPORT_AUTOCLOSE_DAYS,
} from "@/lib/reports";

const NOW = new Date("2026-06-01T12:00:00Z");

describe("initialReportRouting", () => {
  it("sends memory reports to the stewards first", () => {
    expect(initialReportRouting("harassment", true)).toEqual({
      status: "steward",
      neverAutoclose: false,
    });
  });

  it("sends page-level reports straight to the admin", () => {
    expect(initialReportRouting("fake_memorial", false)).toEqual({
      status: "escalated",
      neverAutoclose: false,
    });
  });

  it("escalates CSAM immediately and exempts it from auto-close, even on a memory", () => {
    expect(initialReportRouting("csam_or_illegal", true)).toEqual({
      status: "escalated",
      neverAutoclose: true,
    });
  });
});

describe("isStewardEscalationDue — steward non-response (PRD §4.6)", () => {
  it("escalates a memory report the stewards left past the deadline", () => {
    expect(
      isStewardEscalationDue(
        { status: "steward", created_at: daysAgo(STEWARD_RESPONSE_DAYS + 1, NOW) },
        NOW,
      ),
    ).toBe(true);
  });

  it("leaves a fresh report with the stewards", () => {
    expect(
      isStewardEscalationDue({ status: "steward", created_at: daysAgo(1, NOW) }, NOW),
    ).toBe(false);
  });

  it("escalates exactly on the boundary", () => {
    expect(
      isStewardEscalationDue(
        { status: "steward", created_at: daysAgo(STEWARD_RESPONSE_DAYS, NOW) },
        NOW,
      ),
    ).toBe(true);
  });

  it("never re-escalates something already escalated or resolved", () => {
    for (const status of ["escalated", "resolved", "auto_closed", "awaiting_reporter"]) {
      expect(isStewardEscalationDue({ status, created_at: daysAgo(90, NOW) }, NOW)).toBe(false);
    }
  });
});

describe("isAutoCloseDue — only an unanswered follow-up closes a report", () => {
  it("closes a report the reporter never answered", () => {
    expect(
      isAutoCloseDue(
        {
          status: "awaiting_reporter",
          follow_up_sent_at: daysAgo(REPORT_AUTOCLOSE_DAYS + 1, NOW),
          never_autoclose: false,
        },
        NOW,
      ),
    ).toBe(true);
  });

  it("keeps an old report nobody has asked about — age alone is not a reason", () => {
    expect(
      isAutoCloseDue(
        { status: "escalated", follow_up_sent_at: null, never_autoclose: false },
        NOW,
      ),
    ).toBe(false);
    expect(
      isAutoCloseDue({ status: "steward", follow_up_sent_at: null, never_autoclose: false }, NOW),
    ).toBe(false);
  });

  it("keeps a report whose follow-up is still within the window", () => {
    expect(
      isAutoCloseDue(
        { status: "awaiting_reporter", follow_up_sent_at: daysAgo(29, NOW), never_autoclose: false },
        NOW,
      ),
    ).toBe(false);
  });

  it("never closes CSAM/illegal, however long it waits", () => {
    expect(
      isAutoCloseDue(
        {
          status: "awaiting_reporter",
          follow_up_sent_at: daysAgo(400, NOW),
          never_autoclose: true,
        },
        NOW,
      ),
    ).toBe(false);
  });
});
