import { randomInt } from "node:crypto";
import { customAlphabet } from "nanoid";

// Unambiguous alphanumerics (no 0/O, 1/l/I). 12 chars ≈ 68 bits of entropy:
// non-sequential, non-guessable, enumeration-resistant (PRD §2, §6).
const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
const generate = customAlphabet(alphabet, 12);

export function generatePageId(): string {
  return generate();
}

// randomInt, not Math.random: V8's PRNG state is recoverable from a handful of
// outputs, which would let a contributor predict codes issued to other people.
export function generateVerificationCode(): string {
  return String(randomInt(100000, 1000000));
}

/**
 * Page references appear in URLs and end up in database filters. PostgREST
 * filter strings are not parameterised, so anything outside this shape is
 * rejected before it reaches a query. Both the generated random_id alphabet
 * above and the slug CHECK constraint in 0001_init.sql fit inside it, and it
 * excludes every PostgREST filter metacharacter (comma, dot, parens, star).
 */
const PAGE_REF_RE = /^[A-Za-z0-9][A-Za-z0-9-]{2,80}$/;

export function isValidPageRef(ref: string): boolean {
  return PAGE_REF_RE.test(ref);
}
