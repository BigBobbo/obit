import { customAlphabet } from "nanoid";

// Unambiguous alphanumerics (no 0/O, 1/l/I). 12 chars ≈ 68 bits of entropy:
// non-sequential, non-guessable, enumeration-resistant (PRD §2, §6).
const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
const generate = customAlphabet(alphabet, 12);

export function generatePageId(): string {
  return generate();
}

export function generateVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
