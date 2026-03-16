-- D1 migration: Shamir Secret Sharing recovery scheme
-- Adds scheme tracking and share metadata for threshold recovery.
-- Backwards-compatible: old independent recovery codes continue working
-- via existing code_hash lookup path.

CREATE TABLE IF NOT EXISTS recovery_schemes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  total_shares INTEGER NOT NULL,
  secret_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE recovery_codes ADD COLUMN share_index INTEGER;
ALTER TABLE recovery_codes ADD COLUMN scheme_id TEXT REFERENCES recovery_schemes(id);
