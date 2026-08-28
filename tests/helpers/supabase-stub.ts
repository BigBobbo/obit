/**
 * A minimal in-memory stand-in for the supabase-js query builder.
 *
 * Enough of the surface to exercise the moderation pipeline and Tier 0 without
 * a database: chained select/eq/in filters, single/maybeSingle, and awaiting a
 * builder directly for list reads. Writes and RPC calls are recorded so tests
 * can assert on what the code decided to do.
 */
export type Row = Record<string, unknown>;

export type StubState = {
  tables: Record<string, Row[]>;
  updates: { table: string; values: Row }[];
  inserts: { table: string; values: Row }[];
  deletes: { table: string }[];
  rpcs: { fn: string; args: Row }[];
};

type Builder = {
  select: (...args: unknown[]) => Builder;
  eq: (column: string, value: unknown) => Builder;
  in: (column: string, values: unknown[]) => Builder;
  gt: (column: string, value: unknown) => Builder;
  lt: (column: string, value: unknown) => Builder;
  gte: (column: string, value: unknown) => Builder;
  neq: (column: string, value: unknown) => Builder;
  ilike: (column: string, value: unknown) => Builder;
  order: (...args: unknown[]) => Builder;
  limit: (n: number) => Builder;
  update: (values: Row) => Builder;
  insert: (values: Row) => Builder;
  upsert: (values: Row, options?: unknown) => Builder;
  delete: () => Builder;
  single: () => Promise<{ data: Row | null; error: { message: string } | null }>;
  maybeSingle: () => Promise<{ data: Row | null; error: null }>;
  then: (
    resolve: (value: { data: Row[]; error: null; count: number }) => unknown,
  ) => unknown;
};

export function createStub(tables: Record<string, Row[]> = {}) {
  const state: StubState = {
    tables: structuredClone(tables),
    updates: [],
    inserts: [],
    deletes: [],
    rpcs: [],
  };

  function builder(table: string): Builder {
    let rows = [...(state.tables[table] ?? [])];

    const b: Builder = {
      select: () => b,
      eq: (column, value) => {
        rows = rows.filter((r) => r[column] === value);
        return b;
      },
      in: (column, values) => {
        rows = rows.filter((r) => values.includes(r[column]));
        return b;
      },
      gt: (column, value) => {
        rows = rows.filter((r) => (r[column] as never) > (value as never));
        return b;
      },
      lt: (column, value) => {
        rows = rows.filter((r) => (r[column] as never) < (value as never));
        return b;
      },
      gte: (column, value) => {
        rows = rows.filter((r) => (r[column] as never) >= (value as never));
        return b;
      },
      neq: (column, value) => {
        rows = rows.filter((r) => r[column] !== value);
        return b;
      },
      ilike: (column, value) => {
        rows = rows.filter(
          (r) => String(r[column]).toLowerCase() === String(value).toLowerCase(),
        );
        return b;
      },
      order: () => b,
      limit: (n) => {
        rows = rows.slice(0, n);
        return b;
      },
      update: (values) => {
        state.updates.push({ table, values });
        return b;
      },
      insert: (values) => {
        state.inserts.push({ table, values });
        return b;
      },
      upsert: (values) => {
        state.inserts.push({ table, values });
        return b;
      },
      delete: () => {
        state.deletes.push({ table });
        return b;
      },
      single: async () => ({
        data: rows[0] ?? null,
        error: rows[0] ? null : { message: "no rows" },
      }),
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      then: (resolve) => resolve({ data: rows, error: null, count: rows.length }),
    };

    return b;
  }

  const client = {
    from: (table: string) => builder(table),
    rpc: async (fn: string, args: Row) => {
      state.rpcs.push({ fn, args });
      return { data: 1, error: null };
    },
    storage: {
      from: () => ({ remove: async () => ({ data: null, error: null }) }),
    },
  };

  return { client, state };
}
