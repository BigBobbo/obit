import { Resend } from "resend";

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
      Memorial Pages — a quiet place to remember.
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
  const removeUrl = `${APP_URL()}/api/memories/${memoryId}/remove?token=${removalToken}`;
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
