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

export async function consumeRecoveryCode(
  db: D1Database,
  codeHash: string,
): Promise<{ userId: string } | null> {
  const row = await db
    .prepare(
      "SELECT id, user_id, used_at FROM recovery_codes WHERE code_hash = ?1",
    )
    .bind(codeHash)
    .first<RecoveryCodeRow>();
  if (!row) return null;
  if (row.used_at) return null;
  const now = new Date().toISOString();
  await db
    .prepare("UPDATE recovery_codes SET used_at = ?1 WHERE id = ?2")
    .bind(now, row.id)
    .run();
  return { userId: row.user_id };
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
