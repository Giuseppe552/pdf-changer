export type Env = {
  DB: D1Database;

  APP_ORIGIN: string;
  RP_ID: string;
  RP_ORIGIN: string;
  RP_NAME: string;

  COOKIE_SECURE?: string;

  SESSION_SIGNING_KEY: string;
  RECOVERY_PEPPER: string;

  ENTITLEMENT_PRIVATE_JWK?: string;

  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID?: string;

  // Optional: if set, enables newsletter subscription storage.
  // 32 random bytes as base64/base64url for AES-256-GCM.
  NEWSLETTER_ENC_KEY?: string;
};

export function getEnv(env: Env): Required<Pick<Env, "APP_ORIGIN" | "RP_ID" | "RP_ORIGIN" | "RP_NAME" | "SESSION_SIGNING_KEY" | "RECOVERY_PEPPER">> & Env {
  const required = [
    "APP_ORIGIN",
    "RP_ID",
    "RP_ORIGIN",
    "RP_NAME",
    "SESSION_SIGNING_KEY",
    "RECOVERY_PEPPER",
  ] as const;
  for (const key of required) {
    if (!env[key]) {
      throw new Error(`Missing env var: ${key}`);
    }
  }
  return env as Required<Pick<Env, "APP_ORIGIN" | "RP_ID" | "RP_ORIGIN" | "RP_NAME" | "SESSION_SIGNING_KEY" | "RECOVERY_PEPPER">> & Env;
}

export function cookieSecure(env: Env): boolean {
  // Default to secure cookies in production.
  if (env.COOKIE_SECURE === "false") return false;
  return true;
}
