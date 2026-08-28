/**
 * Public contact addresses. The DMCA agent address in particular has to be a
 * real, monitored mailbox for the safe-harbour process to work, so it is
 * derived from the deployment's own domain rather than hard-coded — a
 * placeholder that ships to production is worse than no address at all.
 * Override either one explicitly when the mailbox lives elsewhere.
 */
function appHost(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return "localhost";
  }
}

export function supportEmail(): string {
  return process.env.SUPPORT_EMAIL || `support@${appHost()}`;
}

export function dmcaEmail(): string {
  return process.env.DMCA_AGENT_EMAIL || `dmca@${appHost()}`;
}
