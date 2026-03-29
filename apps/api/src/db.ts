export type UserRow = {
  id: string;
  created_at: string;
  plan: "free" | "paid";
  paid_until_ms: number | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_updated_at: string | null;
};

export type CredentialRow = {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string | null;
  created_at: string;
  last_used_at: string | null;
};

export type RecoveryCodeRow = {
  id: string;
  user_id: string;
  code_hash: string;
  used_at: string | null;
};

export type NewsletterSubscriberRow = {
  id: string;
  created_at: string;
  email_hash: string;
  email_enc: string;
  unsubscribed_at: string | null;
};

export async function getUserById(db: D1Database, id: string): Promise<UserRow | null> {
  const row = await db
    .prepare(
      "SELECT id, created_at, plan, paid_until_ms, stripe_customer_id, stripe_subscription_id, plan_updated_at FROM users WHERE id = ?1",
    )
    .bind(id)
    .first<UserRow>();
  return row ?? null;
}

export async function createUser(db: D1Database, id: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      "INSERT INTO users (id, created_at, plan, paid_until_ms, stripe_customer_id, stripe_subscription_id) VALUES (?1, ?2, 'free', NULL, NULL, NULL)",
    )
    .bind(id, now)
    .run();
}

export async function upsertUserStripe(
  db: D1Database,
  userId: string,
  patch: {
    plan?: "free" | "paid";
    paid_until_ms?: number | null;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
  },
): Promise<void> {
  const user = await getUserById(db, userId);
  if (!user) throw new Error("User not found");
  const newPlan = patch.plan ?? user.plan;
  const planUpdatedAt =
    patch.plan && patch.plan !== user.plan
      ? new Date().toISOString()
      : user.plan_updated_at;
  await db
    .prepare(
      "UPDATE users SET plan = ?1, paid_until_ms = ?2, stripe_customer_id = ?3, stripe_subscription_id = ?4, plan_updated_at = ?5 WHERE id = ?6",
    )
    .bind(
      newPlan,
      patch.paid_until_ms ?? user.paid_until_ms,
      patch.stripe_customer_id ?? user.stripe_customer_id,
      patch.stripe_subscription_id ?? user.stripe_subscription_id,
      planUpdatedAt,
      userId,
    )
    .run();
}

export async function insertCredential(
  db: D1Database,
  row: Omit<CredentialRow, "last_used_at"> & { last_used_at?: string | null },
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO webauthn_credentials (id, user_id, credential_id, public_key, counter, transports, created_at, last_used_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
    )
    .bind(
      row.id,
      row.user_id,
      row.credential_id,
      row.public_key,
      row.counter,
      row.transports ?? null,
      row.created_at,
      row.last_used_at ?? null,
    )
    .run();
}

export async function getCredentialByCredentialId(
  db: D1Database,
  credentialId: string,
): Promise<CredentialRow | null> {
  const row = await db
    .prepare(
      "SELECT id, user_id, credential_id, public_key, counter, transports, created_at, last_used_at FROM webauthn_credentials WHERE credential_id = ?1",
    )
    .bind(credentialId)
    .first<CredentialRow>();
  return row ?? null;
}

export async function updateCredentialCounter(
  db: D1Database,
  credentialId: string,
  counter: number,
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      "UPDATE webauthn_credentials SET counter = ?1, last_used_at = ?2 WHERE credential_id = ?3",
    )
    .bind(counter, now, credentialId)
    .run();
}

export async function hasAnyRecoveryCodes(db: D1Database, userId: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT id FROM recovery_codes WHERE user_id = ?1 LIMIT 1")
    .bind(userId)
    .first<{ id: string }>();
  return !!row;
}

export async function insertRecoveryCode(
  db: D1Database,
  row: { id: string; user_id: string; code_hash: string },
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO recovery_codes (id, user_id, code_hash, used_at) VALUES (?1, ?2, ?3, NULL)",
    )
    .bind(row.id, row.user_id, row.code_hash)
    .run();
}

/**
 * Consume a recovery code (marks it as used).
 * Used by the legacy single-code endpoint AND the Shamir reconstruct endpoint.
 */
export async function consumeRecoveryCode(
  db: D1Database,
  codeHash: string,
): Promise<{ userId: string; schemeId: string | null } | null> {
  const row = await db
    .prepare(
      "SELECT id, user_id, used_at, scheme_id FROM recovery_codes WHERE code_hash = ?1",
    )
    .bind(codeHash)
    .first<RecoveryCodeRow & { scheme_id: string | null }>();
  if (!row) return null;
  if (row.used_at) return null;
  const now = new Date().toISOString();
  await db
    .prepare("UPDATE recovery_codes SET used_at = ?1 WHERE id = ?2")
    .bind(now, row.id)
    .run();
  return { userId: row.user_id, schemeId: row.scheme_id ?? null };
}

/**
 * Look up a recovery code WITHOUT consuming it. Used by Shamir reconstruct
 * to validate shares before committing to consumption.
 */
export async function lookupRecoveryCode(
  db: D1Database,
  codeHash: string,
): Promise<{ userId: string; schemeId: string | null; used: boolean } | null> {
  const row = await db
    .prepare(
      "SELECT user_id, used_at, scheme_id FROM recovery_codes WHERE code_hash = ?1",
    )
    .bind(codeHash)
    .first<{ user_id: string; used_at: string | null; scheme_id: string | null }>();
  if (!row) return null;
  return { userId: row.user_id, schemeId: row.scheme_id ?? null, used: !!row.used_at };
}

/**
 * Consume multiple recovery codes atomically (batch).
 * Only call AFTER successful Shamir reconstruction.
 */
export async function consumeRecoveryCodes(
  db: D1Database,
  codeHashes: string[],
): Promise<void> {
  const now = new Date().toISOString();
  for (const hash of codeHashes) {
    await db
      .prepare("UPDATE recovery_codes SET used_at = ?1 WHERE code_hash = ?2 AND used_at IS NULL")
      .bind(now, hash)
      .run();
  }
}

export type RecoverySchemeRow = {
  id: string;
  user_id: string;
  threshold: number;
  total_shares: number;
  secret_hash: string;
  created_at: string;
};

export async function insertRecoveryScheme(
  db: D1Database,
  row: RecoverySchemeRow,
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO recovery_schemes (id, user_id, threshold, total_shares, secret_hash, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    )
    .bind(row.id, row.user_id, row.threshold, row.total_shares, row.secret_hash, row.created_at)
    .run();
}

export async function getRecoveryScheme(
  db: D1Database,
  userId: string,
): Promise<RecoverySchemeRow | null> {
  const row = await db
    .prepare("SELECT id, user_id, threshold, total_shares, secret_hash, created_at FROM recovery_schemes WHERE user_id = ?1")
    .bind(userId)
    .first<RecoverySchemeRow>();
  return row ?? null;
}

export async function getRecoveryShareHashes(
  db: D1Database,
  schemeId: string,
): Promise<Array<{ code_hash: string; share_index: number; used_at: string | null }>> {
  const result = await db
    .prepare("SELECT code_hash, share_index, used_at FROM recovery_codes WHERE scheme_id = ?1 ORDER BY share_index")
    .bind(schemeId)
    .all<{ code_hash: string; share_index: number; used_at: string | null }>();
  return result.results;
}

export async function getCredentialsByUserId(
  db: D1Database,
  userId: string,
): Promise<Array<Pick<CredentialRow, "id" | "credential_id" | "transports" | "created_at" | "last_used_at">>> {
  const result = await db
    .prepare(
      "SELECT id, credential_id, transports, created_at, last_used_at FROM webauthn_credentials WHERE user_id = ?1 ORDER BY created_at",
    )
    .bind(userId)
    .all<Pick<CredentialRow, "id" | "credential_id" | "transports" | "created_at" | "last_used_at">>();
  return result.results;
}

export async function deleteCredentialById(
  db: D1Database,
  id: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM webauthn_credentials WHERE id = ?1 AND user_id = ?2")
    .bind(id, userId)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

export async function deleteUserAndData(db: D1Database, userId: string): Promise<void> {
  await db.prepare("DELETE FROM recovery_codes WHERE user_id = ?1").bind(userId).run();
  await db.prepare("DELETE FROM recovery_schemes WHERE user_id = ?1").bind(userId).run();
  await db.prepare("DELETE FROM webauthn_credentials WHERE user_id = ?1").bind(userId).run();
  await db.prepare("DELETE FROM users WHERE id = ?1").bind(userId).run();
}

export async function upsertNewsletterSubscriber(
  db: D1Database,
  row: { id: string; created_at: string; email_hash: string; email_enc: string },
): Promise<void> {
  await db
    .prepare(
      `
      INSERT INTO newsletter_subscribers (id, created_at, email_hash, email_enc, unsubscribed_at)
      VALUES (?1, ?2, ?3, ?4, NULL)
      ON CONFLICT(email_hash) DO UPDATE SET
        email_enc = excluded.email_enc,
        unsubscribed_at = NULL
    `,
    )
    .bind(row.id, row.created_at, row.email_hash, row.email_enc)
    .run();
}
