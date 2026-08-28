#!/usr/bin/env bash
# Applies every migration to a throwaway Postgres, in order, and fails on the
# first error.
#
# This catches what a syntax check cannot: ordering mistakes. A `language sql`
# function body is parsed and validated at CREATE time, so referencing a table
# that the file creates further down fails at apply time and nowhere else.
# That is exactly how is_steward() shipped broken.
#
# Usage:  PGURL=postgres://... supabase/tests/apply-migrations.sh
set -euo pipefail

PGURL="${PGURL:?set PGURL to a throwaway Postgres connection string}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

run() {
  echo "  -> $(basename "$1")"
  # ON_ERROR_STOP makes psql exit non-zero on the first failing statement;
  # -1 wraps the file in a transaction so a failure leaves nothing behind.
  psql "$PGURL" -v ON_ERROR_STOP=1 -q -1 -f "$1"
}

echo "Stubbing the Supabase-provided schemas..."
run "$ROOT/supabase/tests/supabase-stubs.sql"

echo "Applying migrations..."
for f in "$ROOT"/supabase/migrations/*.sql; do
  run "$f"
done

echo "Applying seed..."
run "$ROOT/supabase/seed.sql"

echo "Checking the schema came out whole..."
psql "$PGURL" -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/tests/schema-assertions.sql"

# The reset script has to survive a real Supabase, where storage tables are
# guarded against direct DELETE and CREATE POLICY is not idempotent. Applying
# reset and then the migrations again exercises both.
echo "Checking reset + re-apply..."
run "$ROOT/supabase/reset.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  run "$f"
done
psql "$PGURL" -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/tests/schema-assertions.sql"

echo "OK — migrations apply cleanly, and reset + re-apply works."
