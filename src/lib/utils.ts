import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Pulls email addresses out of a pasted block — commas, semicolons, newlines,
 * `Name <addr>` fragments, whatever came off the family's phone. Used by the
 * pre-approval list (PRD v2 §1.1), which is a paste box on purpose: asking a
 * grieving family to add relatives one at a time is asking them not to bother.
 */
const PASTED_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PASTED_EMAILS = 200;

export function parseEmailList(raw: string): string[] {
  const seen = new Set<string>();
  for (const candidate of raw.split(/[\s,;]+/)) {
    const email = normalizeEmail(candidate.replace(/^[<"']+|[>"']+$/g, ""));
    if (email && PASTED_EMAIL_RE.test(email)) seen.add(email);
  }
  return [...seen].slice(0, MAX_PASTED_EMAILS);
}
