import { Resend } from "resend";
import { supportEmail } from "@/lib/contact";

function client() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = () => process.env.EMAIL_FROM || "Memorial Pages <no-reply@example.com>";
const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function send(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY not set; email to ${to} suppressed: ${subject}`);
    return;
  }
  const { error } = await client().emails.send({ from: FROM(), to, subject, html });
  if (error) console.error("resend error", error);
}

const wrap = (body: string) => `
  <div style="font-family: Georgia, serif; max-width: 540px; margin: 0 auto; color: #333;">
    ${body}
    <p style="color:#999;font-size:12px;margin-top:32px;border-top:1px solid #eee;padding-top:12px;">
      Memorial Pages — a quiet place to remember. Questions: ${supportEmail()}
    </p>
  </div>`;

export async function sendVerificationCode(to: string, code: string, pageName: string) {
  await send(
    to,
    `${code} is your verification code`,
    wrap(`
      <p>Thank you for sharing a memory on the page for <strong>${escapeHtml(pageName)}</strong>.</p>
      <p>Your verification code is:</p>
      <p style="font-size:28px;letter-spacing:6px;font-weight:bold;">${code}</p>
      <p>The code expires in 30 minutes. If you didn't request this, you can ignore this email.</p>
    `),
  );
}

export async function sendMemoryReceipt(
  to: string,
  pageName: string,
  memoryId: string,
  removalToken: string,
  autoPublished: boolean,
) {
  // Points at the confirmation page, not the API route: the removal itself is
  // a POST so that a mail scanner following this link cannot delete a memory.
  const removeUrl = `${APP_URL()}/memories/${memoryId}/remove?token=${removalToken}`;
  await send(
    to,
    `Your memory for ${pageName}`,
    wrap(`
      <p>Your memory for <strong>${escapeHtml(pageName)}</strong> has been received.</p>
      <p>${
        autoPublished
          ? "It is now visible on the page."
          : "The family reviews contributions before they appear — it will be published once approved."
      }</p>
      <p style="font-size:13px;color:#777;">If you ever want this memory removed,
      <a href="${removeUrl}">click here to request removal</a>.</p>
    `),
  );
}

export async function sendWeeklyDigest(
  to: string,
  pageName: string,
  pageId: string,
  newApproved: number,
  pendingCount: number,
  digestToken: string,
  openReports = 0,
) {
  // The dashboard link carries a token; opening it counts as steward activity
  // for the 90-day clock (PRD §4.5).
  const url = `${APP_URL()}/dashboard/pages/${pageId}?digest=${digestToken}`;
  await send(
    to,
    `This week on ${pageName}`,
    wrap(`
      <p><strong>${escapeHtml(pageName)}</strong> — your weekly summary:</p>
      <ul>
        <li>${newApproved} new ${newApproved === 1 ? "memory" : "memories"} published this week</li>
        <li>${pendingCount} ${pendingCount === 1 ? "memory" : "memories"} waiting for your review</li>
        ${
          openReports > 0
            ? `<li><strong>${openReports} ${openReports === 1 ? "report" : "reports"} waiting for your decision</strong></li>`
            : ""
        }
      </ul>
      <p><a href="${url}">Open your steward dashboard</a></p>
    `),
  );
}

export async function sendPendingNotification(to: string, pageName: string, pageId: string) {
  const url = `${APP_URL()}/dashboard/pages/${pageId}`;
  await send(
    to,
    `A memory is waiting for review on ${pageName}`,
    wrap(`
      <p>A new memory was submitted to <strong>${escapeHtml(pageName)}</strong> and is waiting for your review.</p>
      <p><a href="${url}">Review it now</a></p>
    `),
  );
}

export async function sendStewardChangeNotification(
  to: string,
  pageName: string,
  changeDescription: string,
) {
  await send(
    to,
    `Steward change on ${pageName}`,
    wrap(`
      <p>A steward change occurred on <strong>${escapeHtml(pageName)}</strong>:</p>
      <p>${escapeHtml(changeDescription)}</p>
      <p style="font-size:13px;color:#777;">If you did not expect this, reply to this email immediately.</p>
    `),
  );
}

export async function sendInactivityHoldNotice(to: string, pageName: string, pageId: string) {
  const url = `${APP_URL()}/dashboard/pages/${pageId}`;
  await send(
    to,
    `New memories on ${pageName} are being held for review`,
    wrap(`
      <p>No steward has been active on <strong>${escapeHtml(pageName)}</strong> for 90 days,
      so new contributions are now held for review instead of publishing automatically.
      The page itself remains fully visible.</p>
      <p>Signing in — or opening this link — resumes normal publishing:
      <a href="${url}">open your dashboard</a>.</p>
    `),
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Follow-up question to a reporter (PRD §4.6). The reply link carries the
 * report's capability token; answering returns the report to the admin queue
 * and stops the 30-day auto-close clock.
 */
export async function sendReportFollowUp(
  to: string,
  opts: {
    reportId: string;
    responseToken: string;
    pageName: string;
    question: string;
    neverAutoclose: boolean;
  },
) {
  const url = `${APP_URL()}/reports/${opts.reportId}/respond?token=${opts.responseToken}`;
  await send(
    to,
    `About your report on ${opts.pageName}`,
    wrap(`
      <p>Thank you for your report about <strong>${escapeHtml(opts.pageName)}</strong>.
      We need a little more information before we can act on it.</p>
      ${opts.question ? `<p style="border-left:3px solid #ddd;padding-left:12px;">${escapeHtml(opts.question)}</p>` : ""}
      <p><a href="${url}">Reply to this question</a></p>
      ${
        opts.neverAutoclose
          ? "<p style=\"font-size:13px;color:#777;\">This report stays open until we have resolved it.</p>"
          : `<p style="font-size:13px;color:#777;">If we don't hear back within 30 days we'll close the report. You can always file a new one.</p>`
      }
    `),
  );
}

/** A visitor asking the family to be added as a co-steward (PRD §4.2, §6). */
export async function sendStewardRequestNotification(
  to: string,
  opts: { pageName: string; pageId: string; requesterName: string; relationship: string },
) {
  const url = `${APP_URL()}/dashboard/pages/${opts.pageId}`;
  await send(
    to,
    `${opts.requesterName} would like to help look after ${opts.pageName}`,
    wrap(`
      <p><strong>${escapeHtml(opts.requesterName)}</strong> (${escapeHtml(opts.relationship)})
      has asked to be added as a co-steward of the page for
      <strong>${escapeHtml(opts.pageName)}</strong>.</p>
      <p>You decide — nobody is added unless you approve it.</p>
      <p><a href="${url}">Review the request</a></p>
    `),
  );
}

/** The outcome of that request, back to the person who asked. */
export async function sendStewardRequestOutcome(
  to: string,
  opts: { pageName: string; outcome: "approved" | "awaiting_signup" | "declined" },
) {
  const bodies = {
    approved: `<p>You can now help look after the page for <strong>${escapeHtml(opts.pageName)}</strong>.
      <a href="${APP_URL()}/dashboard">Open your dashboard</a>.</p>`,
    awaiting_signup: `<p>The family approved your request to help with the page for
      <strong>${escapeHtml(opts.pageName)}</strong>. Create your account with this email address
      at <a href="${APP_URL()}/login">${APP_URL()}/login</a> and they can finish adding you.</p>`,
    declined: `<p>The family has decided not to add more stewards to the page for
      <strong>${escapeHtml(opts.pageName)}</strong> at this time. If you believe the page is in the
      wrong hands, you can raise an ownership dispute from the page's "Report this page" link.</p>`,
  };
  const subjects = {
    approved: `You're now a co-steward of ${opts.pageName}`,
    awaiting_signup: `One more step to help with ${opts.pageName}`,
    declined: `About your request to help with ${opts.pageName}`,
  };
  await send(to, subjects[opts.outcome], wrap(bodies[opts.outcome]));
}

/**
 * A report on a memory, to the family who moderate that page (PRD §4.6).
 *
 * Sent on every tier: instant *queue* notifications are a paid feature, but a
 * report is a safety matter and safety is never paywalled (PRD §8). It is also
 * what makes the seven-day escalation fair — nobody is escalated for ignoring
 * something they were never told about.
 */
export async function sendMemoryReportNotice(
  to: string,
  opts: { pageName: string; pageId: string; category: string },
) {
  const url = `${APP_URL()}/dashboard/pages/${opts.pageId}`;
  await send(
    to,
    `Someone reported a memory on ${opts.pageName}`,
    wrap(`
      <p>A visitor reported a memory on <strong>${escapeHtml(opts.pageName)}</strong>
      as <strong>${escapeHtml(opts.category.replace(/_/g, " "))}</strong>.</p>
      <p>You can read it and decide what to do — keep it, remove it, or pass it to us.</p>
      <p><a href="${url}">Review the report</a></p>
      <p style="font-size:13px;color:#777;">If nobody acts within a week, we'll take a look ourselves.</p>
    `),
  );
}
