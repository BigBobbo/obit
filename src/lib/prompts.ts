/**
 * Guided prompts (PRD v2 §2.3).
 *
 * "I don't know what to write" is the universal reason a memory never gets
 * written. A question turns a blank box into something answerable, and the
 * answers are better: specific, particular, the kind of thing a family has
 * never heard before.
 *
 * Curated and static in v1 — no generation, no personalisation. The list
 * rotates so a page that several people visit on different days doesn't
 * collect five answers to the same question.
 */
export const MEMORY_PROMPTS: string[] = [
  "How did you meet?",
  "A moment that still makes you laugh",
  "Something they taught you",
  "A place you'll always associate with them",
  "What did they always say?",
  "The first time you met them",
  "Something they did for you that they'd have shrugged off",
  "What were they like on an ordinary Tuesday?",
  "A meal, a song, or a smell that brings them back",
  "What would you thank them for?",
];

const PROMPTS_SHOWN = 5;

/**
 * Deterministic for a given seed, so the server and the browser render the
 * same list. Callers pass something that changes daily (page id + date) —
 * enough rotation that a page doesn't collect five answers to one question,
 * without the churn of a fresh set on every reload.
 */
export function pickPrompts(seed: string, count: number = PROMPTS_SHOWN): string[] {
  const pool = [...MEMORY_PROMPTS];
  const random = seededRandom(seed);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

/** A day-stable seed: same questions all day, different ones tomorrow. */
export function promptSeed(pageId: string, now: Date = new Date()): string {
  return `${pageId}:${now.toISOString().slice(0, 10)}`;
}

function seededRandom(seed: string): () => number {
  // FNV-1a, then xorshift32. Not cryptography — just a stable shuffle.
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let state = h >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

/** What tapping a prompt puts in the box: the question, then room to answer. */
export function seedTextarea(existing: string, prompt: string): string {
  const heading = `${prompt}\n\n`;
  if (existing.trim().length === 0) return heading;
  return `${existing.replace(/\s+$/, "")}\n\n${heading}`;
}
