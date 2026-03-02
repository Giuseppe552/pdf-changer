CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  email_hash TEXT NOT NULL UNIQUE,
  email_enc TEXT NOT NULL,
  unsubscribed_at TEXT
);
