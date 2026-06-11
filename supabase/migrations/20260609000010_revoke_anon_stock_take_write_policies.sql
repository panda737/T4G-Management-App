/*
  # Revoke anon stock take write policies — superseded

  This migration file was corrupted (contained only "0") and was never applied
  to the remote database. Its intent — removing anon write access to the stock
  take tables — is fully covered by the next migration
  (20260609000011_create_can_write_stock_and_update_rls.sql), which drops the
  old write policies on stock_take_sessions and stock_take_line_items and
  recreates them scoped TO authenticated with can_write_stock().

  Kept as a no-op so the local migration history stays consistent.
*/
SELECT 1;
