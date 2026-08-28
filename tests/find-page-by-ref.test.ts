import { describe, expect, it, vi } from "vitest";
import { findPageByRef } from "@/lib/pages";

/**
 * Records the filters applied to a lookup so a test can assert that a
 * URL-supplied reference only ever reaches the query as an exact-match value.
 */
function recordingClient(rows: Record<string, unknown>[]) {
  const calls: { column: string; value: unknown }[] = [];
  const orCalls: unknown[] = [];

  const builder = () => {
    let matched = [...rows];
    const b = {
      select: () => b,
      eq: (column: string, value: unknown) => {
        calls.push({ column, value });
        matched = matched.filter((r) => r[column] === value);
        return b;
      },
      or: (filter: unknown) => {
        orCalls.push(filter);
        return b;
      },
      maybeSingle: async () => ({ data: matched[0] ?? null, error: null }),
    };
    return b;
  };

  return {
    client: { from: () => builder() } as never,
    calls,
    orCalls,
  };
}

const PAGES = [
  { id: "p1", random_id: "aB3xK9mQr2Tz", slug: "mary-doe-1938-2024", name: "Mary Doe" },
  { id: "p2", random_id: "zY7wV4nJh6Rk", slug: null, name: "Alan Doe" },
];

describe("findPageByRef", () => {
  it("finds a page by its canonical random id", async () => {
    const { client } = recordingClient(PAGES);
    const page = await findPageByRef<{ id: string }>(client, "aB3xK9mQr2Tz", "id");
    expect(page?.id).toBe("p1");
  });

  it("finds a page by its custom slug", async () => {
    const { client } = recordingClient(PAGES);
    const page = await findPageByRef<{ id: string }>(client, "mary-doe-1938-2024", "id");
    expect(page?.id).toBe("p1");
  });

  it("returns null for an unknown reference", async () => {
    const { client } = recordingClient(PAGES);
    expect(await findPageByRef(client, "nosuchpageref", "id")).toBeNull();
  });

  it("checks random_id before slug, so canonical URLs cost one query", async () => {
    const { client, calls } = recordingClient(PAGES);
    await findPageByRef(client, "aB3xK9mQr2Tz", "id");
    expect(calls).toEqual([{ column: "random_id", value: "aB3xK9mQr2Tz" }]);
  });

  it("never builds an or() filter", async () => {
    const { client, orCalls } = recordingClient(PAGES);
    await findPageByRef(client, "mary-doe-1938-2024", "id");
    expect(orCalls).toEqual([]);
  });

  /**
   * The regression for the enumeration bug. `/m/zzz,name.like.A*` used to
   * produce `or=(random_id.eq.zzz,name.like.A*,slug.eq.zzz,name.like.A*)`, a
   * name-prefix search over every page the anon policy exposes. A reference
   * carrying filter syntax must now never reach the database at all.
   */
  it.each([
    "zzz,name.like.A*",
    "zzz,status.eq.soft_deleted",
    "zzz,name.like.*Smith*",
    "zzz,id.gt.0",
    "a.b",
    "a(b)",
  ])("refuses to query for the injected reference %j", async (ref) => {
    const { client, calls, orCalls } = recordingClient(PAGES);
    expect(await findPageByRef(client, ref, "id")).toBeNull();
    expect(calls).toEqual([]);
    expect(orCalls).toEqual([]);
  });

  it("does not touch the database for an invalid reference", async () => {
    const from = vi.fn();
    await findPageByRef({ from } as never, "bad,ref", "id");
    expect(from).not.toHaveBeenCalled();
  });
});
