import { Hono, type Context } from "hono";
import type { Env } from "./env";

type AppContext = Context<{ Bindings: Env }>;
import { getEnv, cookieSecure } from "./env";
import { parseCookies, serializeCookie } from "./cookies";
import {
  cookieNames,
  signCookieValue,
  verifySignedCookie,
  type SessionPayload,
} from "./session";
import { createUser, getUserById, hasAnyRecoveryCodes, insertRecoveryCode, insertRecoveryScheme, getRecoveryScheme, getRecoveryShareHashes, getCredentialsByUserId, deleteCredentialById, deleteUserAndData } from "./db";
import { makeAuthenticationOptions, makeRegistrationOptions, verifyAndStoreRegistration, verifyAuthentication } from "./webauthn";
import { aesGcmEncryptToBase64Url, base64DecodeAny, base64urlEncode, hmacSha256, sha256Bytes, utf8 } from "./crypto";
import { consumeRecoveryCode, consumeRecoveryCodes, lookupRecoveryCode, upsertNewsletterSubscriber, upsertUserStripe } from "./db";
import { handleStripeWebhook, stripeClient } from "./stripe";
import { clientIp, rateLimit } from "./rateLimit";
import { signEntitlement } from "./entitlement";
import { shamirSplit, encodeShare, decodeShare, shamirReconstruct, type ShamirShare } from "./shamir";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
const CHALLENGE_TTL_SECONDS = 60 * 10;
const RL_WINDOW_SECONDS = 60;

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function entitlementExpiryIso(user: { plan: "free" | "paid"; paid_until_ms: number | null }): string | null {
  if (user.plan !== "paid") return null;
  if (!user.paid_until_ms) return null;
  return new Date(user.paid_until_ms).toISOString();
}

const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
  console.error("unhandled:", err instanceof Error ? err.message : err);
  if (err instanceof Error && err.message === "Bad origin") {
    return c.text("Forbidden", 403);
  }
  return c.text("Internal error", 500);
});

// CORS + basic hardening
app.use("*", async (c, next) => {
  const env = getEnv(c.env);
  const origin = c.req.header("Origin");
  if (origin && origin === env.APP_ORIGIN) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Vary", "Origin");
  }
  c.header("Cache-Control", "no-store");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Frame-Options", "DENY");
  if (c.req.method === "OPTIONS") {
    c.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type");
    return c.body(null, 204);
  }
  await next();
});

function requireSameOrigin(c: AppContext): void {
  const env = getEnv(c.env);
  const origin = c.req.header("Origin");
  if (origin && origin !== env.APP_ORIGIN) {
    throw new Error("Bad origin");
  }
}

async function getSession(c: AppContext): Promise<SessionPayload | null> {
  const env = getEnv(c.env);
  const names = cookieNames(cookieSecure(env));
  const cookies = parseCookies(c.req.header("Cookie") ?? null);
  const payload = await verifySignedCookie<SessionPayload>(
    env.SESSION_SIGNING_KEY,
    cookies[names.session],
  );
  if (!payload) return null;
  if (payload.exp < nowSeconds()) return null;
  return payload;
}

function setCookie(c: AppContext, cookie: string): void {
  c.res.headers.append("Set-Cookie", cookie);
}

async function enforceRateLimit(
  c: AppContext,
  opts: { name: string; limit: number; windowSeconds?: number },
): Promise<Response | null> {
  const ip = clientIp(c.req.raw);
  const windowSeconds = opts.windowSeconds ?? RL_WINDOW_SECONDS;
  const key = `${opts.name}:${ip}`;
  const res = await rateLimit(key, { limit: opts.limit, windowSeconds });
  if (res.ok) return null;
  c.header("Retry-After", String(res.retryAfterSeconds));
  return c.text("Too many requests", 429);
}

app.get("/v1/me", async (c) => {
  const env = getEnv(c.env);
  const session = await getSession(c);
  if (!session) {
    return c.json({
      authenticated: false,
      plan: "guest",
      entitlementExpiresAt: null,
      entitlementToken: null,
    });
  }
  const user = await getUserById(env.DB, session.userId);
  if (!user) {
    return c.json({
      authenticated: false,
      plan: "guest",
      entitlementExpiresAt: null,
      entitlementToken: null,
    });
  }

  // Compute paid based on paid_until_ms when present.
  // If paid_until_ms is null the webhook hasn't delivered a period end yet;
  // cap the grace window to 48h from when the plan was last changed.
  const GRACE_MS = 48 * 60 * 60 * 1000;
  const planChangedAt = user.plan_updated_at ? Date.parse(user.plan_updated_at) : 0;
  const paid =
    user.plan === "paid" &&
    (user.paid_until_ms
      ? Date.now() < user.paid_until_ms
      : Date.now() < planChangedAt + GRACE_MS);
  const plan = paid ? "paid" : "free";
  if (plan !== user.plan) {
    await upsertUserStripe(env.DB, user.id, { plan, paid_until_ms: paid ? user.paid_until_ms : null });
  }

  const entitlementExpiresAt =
    plan === "paid"
      ? entitlementExpiryIso({ plan, paid_until_ms: user.paid_until_ms })
      : null;

  const tokenExp =
    plan === "paid"
      ? entitlementExpiresAt
        ? Math.floor(Date.parse(entitlementExpiresAt) / 1000)
        : nowSeconds() + Math.floor(GRACE_MS / 1000)   // 24h grace, not 30 days
      : nowSeconds() + 7 * 24 * 60 * 60;               // free: 7 days

  const entitlementToken = await signEntitlement(env, { plan, exp: tokenExp, sid: session.userId });

  return c.json({
    authenticated: true,
    plan,
    entitlementExpiresAt,
    entitlementToken,
  });
});

app.post("/v1/logout", async (c) => {
  requireSameOrigin(c);
  const env = getEnv(c.env);
  const secure = cookieSecure(env);
  const names = cookieNames(secure);
  setCookie(
    c,
    serializeCookie(names.session, "", {
      httpOnly: true,
      secure,
      sameSite: "Strict",
      path: "/",
      maxAgeSeconds: 0,
    }),
  );
  return c.json({ ok: true });
});

app.post("/v1/webauthn/register/options", async (c) => {
  requireSameOrigin(c);
  const limited = await enforceRateLimit(c, { name: "reg_options", limit: 30 });
  if (limited) return limited;
  const env = getEnv(c.env);
  const secure = cookieSecure(env);
  const names = cookieNames(secure);
  const session = await getSession(c);
  const userId = session?.userId ?? crypto.randomUUID();
  const exists = await getUserById(env.DB, userId);
  if (!exists) await createUser(env.DB, userId);

  const options = await makeRegistrationOptions(env, { id: userId });
  const cookieValue = await signCookieValue(env.SESSION_SIGNING_KEY, {
    userId,
    challenge: options.challenge,
    exp: nowSeconds() + CHALLENGE_TTL_SECONDS,
  });
  setCookie(
    c,
    serializeCookie(names.reg, cookieValue, {
      httpOnly: true,
      secure,
      sameSite: "Strict",
      path: "/",
      maxAgeSeconds: CHALLENGE_TTL_SECONDS,
    }),
  );
  return c.json(options);
});

app.post("/v1/webauthn/register/verify", async (c) => {
  requireSameOrigin(c);
  const limited = await enforceRateLimit(c, { name: "reg_verify", limit: 30 });
  if (limited) return limited;
  const env = getEnv(c.env);
  const secure = cookieSecure(env);
  const names = cookieNames(secure);
  const cookies = parseCookies(c.req.header("Cookie") ?? null);
  const reg = await verifySignedCookie<{ userId: string; challenge: string; exp: number }>(env.SESSION_SIGNING_KEY, cookies[names.reg]);
  if (!reg || reg.exp < nowSeconds()) return c.text("Registration expired", 400);
  const body = await c.req.json();

  const verification = await verifyAndStoreRegistration(
    env,
    env.DB,
    reg.challenge,
    reg.userId,
    body,
  );
  if (!verification.verified) return c.text("Registration failed", 400);

  // Create session cookie
  const iat = nowSeconds();
  const sessionValue = await signCookieValue(env.SESSION_SIGNING_KEY, {
    userId: reg.userId,
    iat,
    exp: iat + SESSION_TTL_SECONDS,
  });
  setCookie(
    c,
    serializeCookie(names.session, sessionValue, {
      httpOnly: true,
      secure,
      sameSite: "Strict",
      path: "/",
      maxAgeSeconds: SESSION_TTL_SECONDS,
    }),
  );

  // Clear reg cookie
  setCookie(
    c,
    serializeCookie(names.reg, "", {
      httpOnly: true,
      secure,
      sameSite: "Strict",
      path: "/",
      maxAgeSeconds: 0,
    }),
  );

  // Recovery codes: generate once per account using Shamir SSS (3-of-10).
  let recoveryCodes: string[] | undefined;
  const already = await hasAnyRecoveryCodes(env.DB, reg.userId);
  if (!already) {
    const THRESHOLD = 3;
    const TOTAL = 10;
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const secretHash = base64urlEncode(await sha256Bytes(secret));
    const shares = shamirSplit(secret, THRESHOLD, TOTAL);
    const schemeId = crypto.randomUUID();

    await insertRecoveryScheme(env.DB, {
      id: schemeId,
      user_id: reg.userId,
      threshold: THRESHOLD,
      total_shares: TOTAL,
      secret_hash: secretHash,
      created_at: new Date().toISOString(),
    });

    recoveryCodes = [];
    for (let i = 0; i < TOTAL; i++) {
      const encoded = encodeShare(shares[i].index, shares[i].data, shares[i].schemeId);
      recoveryCodes.push(encoded);
      const codeHash = await recoveryHash(env.RECOVERY_PEPPER, encoded);
      await insertRecoveryCode(env.DB, {
        id: crypto.randomUUID(),
        user_id: reg.userId,
        code_hash: codeHash,
      });
    }
  }

  return c.json({ ok: true, recoveryCodes });
});

app.post("/v1/webauthn/login/options", async (c) => {
  requireSameOrigin(c);
  const limited = await enforceRateLimit(c, { name: "login_options", limit: 60 });
  if (limited) return limited;
  const env = getEnv(c.env);
  const secure = cookieSecure(env);
  const names = cookieNames(secure);
  const options = await makeAuthenticationOptions(env);
  const cookieValue = await signCookieValue(env.SESSION_SIGNING_KEY, {
    challenge: options.challenge,
    exp: nowSeconds() + CHALLENGE_TTL_SECONDS,
  });
  setCookie(
    c,
    serializeCookie(names.auth, cookieValue, {
      httpOnly: true,
      secure,
      sameSite: "Strict",
      path: "/",
      maxAgeSeconds: CHALLENGE_TTL_SECONDS,
    }),
  );
  return c.json(options);
});

app.post("/v1/webauthn/login/verify", async (c) => {
  requireSameOrigin(c);
  const limited = await enforceRateLimit(c, { name: "login_verify", limit: 60 });
  if (limited) return limited;
  const env = getEnv(c.env);
  const secure = cookieSecure(env);
  const names = cookieNames(secure);
  const cookies = parseCookies(c.req.header("Cookie") ?? null);
  const auth = await verifySignedCookie<{ challenge: string; exp: number }>(env.SESSION_SIGNING_KEY, cookies[names.auth]);
  if (!auth || auth.exp < nowSeconds()) return c.text("Login expired", 400);
  const body = await c.req.json();

  const verification = await verifyAuthentication(env, env.DB, auth.challenge, body);
  if (!verification.verified || !verification.userId) return c.text("Login failed", 401);

  const iat = nowSeconds();
  const sessionValue = await signCookieValue(env.SESSION_SIGNING_KEY, {
    userId: verification.userId,
    iat,
    exp: iat + SESSION_TTL_SECONDS,
  });
  setCookie(
    c,
    serializeCookie(names.session, sessionValue, {
      httpOnly: true,
      secure,
      sameSite: "Strict",
      path: "/",
      maxAgeSeconds: SESSION_TTL_SECONDS,
    }),
  );
  setCookie(
    c,
    serializeCookie(names.auth, "", {
      httpOnly: true,
      secure,
      sameSite: "Strict",
      path: "/",
      maxAgeSeconds: 0,
    }),
  );
  return c.json({ ok: true });
});

app.post("/v1/recovery/consume", async (c) => {
  requireSameOrigin(c);
  const limited = await enforceRateLimit(c, { name: "recovery_consume", limit: 5 });
  if (limited) return limited;
  const env = getEnv(c.env);
  const secure = cookieSecure(env);
  const names = cookieNames(secure);
  const body = await c.req.json().catch(() => null);
  const code = (body?.code as string | undefined)?.trim();
  if (!code || code.length < 10) return c.text("Bad code", 400);

  // SECURITY: Reject Shamir shares — they MUST go through /v1/recovery/reconstruct.
  // A single share must NOT grant access (that would bypass the threshold).
  if (code.startsWith("PDC-")) return c.text("Use the share recovery flow for Shamir shares", 400);

  const codeHash = await recoveryHash(env.RECOVERY_PEPPER, code);
  const consumed = await consumeRecoveryCode(env.DB, codeHash);
  if (!consumed) return c.text("Invalid code", 401);

  // Double-check: if this code belongs to a Shamir scheme, reject it
  if (consumed.schemeId) return c.text("Use the share recovery flow for Shamir shares", 400);

  const iat = nowSeconds();
  const sessionValue = await signCookieValue(env.SESSION_SIGNING_KEY, {
    userId: consumed.userId,
    iat,
    exp: iat + SESSION_TTL_SECONDS,
  });
  setCookie(
    c,
    serializeCookie(names.session, sessionValue, {
      httpOnly: true,
      secure,
      sameSite: "Strict",
      path: "/",
      maxAgeSeconds: SESSION_TTL_SECONDS,
    }),
  );
  return c.json({ ok: true });
});

app.post("/v1/recovery/reconstruct", async (c) => {
  requireSameOrigin(c);
  const limited = await enforceRateLimit(c, { name: "recovery_reconstruct", limit: 5 });
  if (limited) return limited;
  const env = getEnv(c.env);
  const secure = cookieSecure(env);
  const names = cookieNames(secure);
  const body = await c.req.json().catch(() => null);
  const codes = body?.codes;
  if (!Array.isArray(codes) || codes.length < 2) return c.text("Need at least 2 shares", 400);

  // Decode all shares
  const decoded: ShamirShare[] = [];
  for (const code of codes) {
    if (typeof code !== "string") return c.text("Invalid share format", 400);
    const share = decodeShare(code.trim(), 4);
    if (!share) return c.text("Invalid or corrupted share", 400);
    decoded.push({ index: share.index, data: share.data, schemeId: share.schemeId });
  }

  // All shares must have the same schemeId
  const schemeIdHex = Array.from(decoded[0].schemeId).map((b) => b.toString(16).padStart(2, "0")).join("");
  for (let i = 1; i < decoded.length; i++) {
    const hex = Array.from(decoded[i].schemeId).map((b) => b.toString(16).padStart(2, "0")).join("");
    if (hex !== schemeIdHex) return c.text("Shares from different schemes", 400);
  }

  // STEP 1: Look up each share WITHOUT consuming — validate all are real and unused
  const codeHashes: string[] = [];
  let foundUserId: string | null = null;
  let validShareCount = 0;

  for (const code of codes) {
    const codeHash = await recoveryHash(env.RECOVERY_PEPPER, (code as string).trim());
    codeHashes.push(codeHash);
    const lookup = await lookupRecoveryCode(env.DB, codeHash);
    if (!lookup) return c.text("Invalid share", 401);
    if (lookup.used) return c.text("Share already used", 401);
    if (foundUserId && foundUserId !== lookup.userId) {
      return c.text("Shares from different users", 400);
    }
    foundUserId = lookup.userId;
    validShareCount++;
  }

  if (!foundUserId) return c.text("Invalid shares", 401);

  // All submitted shares must be valid DB entries
  if (validShareCount !== codes.length) return c.text("Invalid shares", 401);

  // STEP 2: Find the scheme and check threshold
  const scheme = await getRecoveryScheme(env.DB, foundUserId);
  if (!scheme) return c.text("No recovery scheme found", 400);
  if (decoded.length < scheme.threshold) {
    return c.text(`Need at least ${scheme.threshold} shares`, 400);
  }

  // STEP 3: Reconstruct the secret and verify BEFORE consuming any shares
  try {
    const reconstructed = shamirReconstruct(decoded, scheme.threshold);
    const reconstructedHash = base64urlEncode(await sha256Bytes(reconstructed));
    if (reconstructedHash !== scheme.secret_hash) {
      return c.text("Reconstruction failed — shares may be corrupted", 401);
    }
  } catch {
    return c.text("Reconstruction failed", 401);
  }

  // STEP 4: Only NOW consume the shares (reconstruction succeeded)
  await consumeRecoveryCodes(env.DB, codeHashes);

  // Success: create session
  const iat = nowSeconds();
  const sessionValue = await signCookieValue(env.SESSION_SIGNING_KEY, {
    userId: foundUserId,
    iat,
    exp: iat + SESSION_TTL_SECONDS,
  });
  setCookie(
    c,
    serializeCookie(names.session, sessionValue, {
      httpOnly: true,
      secure,
      sameSite: "Strict",
      path: "/",
      maxAgeSeconds: SESSION_TTL_SECONDS,
    }),
  );
  return c.json({ ok: true });
});

app.post("/v1/billing/checkout", async (c) => {
  requireSameOrigin(c);
  const limited = await enforceRateLimit(c, { name: "billing_checkout", limit: 20 });
  if (limited) return limited;
  const env = getEnv(c.env);
  const session = await getSession(c);
  if (!session) return c.text("Unauthorized", 401);
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) return c.text("Stripe not configured", 400);
  const stripe = stripeClient(env);
  if (!stripe) return c.text("Stripe not configured", 400);

  const user = await getUserById(env.DB, session.userId);
  if (!user) return c.text("Unauthorized", 401);

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    client_reference_id: user.id,
    metadata: { user_id: user.id },
    line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${env.APP_ORIGIN}/account?checkout=success`,
    cancel_url: `${env.APP_ORIGIN}/pricing?checkout=cancel`,
    allow_promotion_codes: false,
  });

  // Best-effort: store customer id early when present
  if (checkout.customer) {
    const customerId = typeof checkout.customer === "string" ? checkout.customer : checkout.customer.id;
    await upsertUserStripe(env.DB, user.id, { stripe_customer_id: customerId });
  }

  if (!checkout.url) return c.text("Checkout unavailable", 500);
  return c.json({ url: checkout.url });
});

app.post("/v1/billing/portal", async (c) => {
  requireSameOrigin(c);
  const limited = await enforceRateLimit(c, { name: "billing_portal", limit: 20 });
  if (limited) return limited;
  const env = getEnv(c.env);
  const session = await getSession(c);
  if (!session) return c.text("Unauthorized", 401);
  if (!env.STRIPE_SECRET_KEY) return c.text("Stripe not configured", 400);
  const stripe = stripeClient(env);
  if (!stripe) return c.text("Stripe not configured", 400);

  const user = await getUserById(env.DB, session.userId);
  if (!user || !user.stripe_customer_id) return c.text("No customer", 400);
  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${env.APP_ORIGIN}/account`,
  });
  return c.json({ url: portal.url });
});

app.post("/v1/billing/webhook", async (c) => {
  // Do not origin-check: Stripe is external.
  const env = getEnv(c.env);
  const stripe = stripeClient(env);
  if (!stripe) return c.text("Stripe not configured", 400);
  return handleStripeWebhook(env, env.DB, stripe, c.req.raw);
});

app.post("/v1/newsletter/subscribe", async (c) => {
  requireSameOrigin(c);
  const limited = await enforceRateLimit(c, { name: "newsletter_subscribe", limit: 20 });
  if (limited) return limited;
  const env = getEnv(c.env);
  if (!env.NEWSLETTER_ENC_KEY) return c.text("Newsletter not configured", 400);

  const body = await c.req.json().catch(() => null);
  const email = (body?.email as string | undefined)?.trim();
  if (!email) return c.text("Bad email", 400);
  if (email.length > 320) return c.text("Bad email", 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.text("Bad email", 400);

  const normalized = email.toLowerCase();

  const keyBytes = base64DecodeAny(env.NEWSLETTER_ENC_KEY);
  if (keyBytes.length !== 32) return c.text("Newsletter not configured", 400);

  const emailHash = base64urlEncode(await hmacSha256(utf8(env.RECOVERY_PEPPER), utf8(normalized)));
  const emailEnc = await aesGcmEncryptToBase64Url(keyBytes, utf8(normalized));

  await upsertNewsletterSubscriber(env.DB, {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    email_hash: emailHash,
    email_enc: emailEnc,
  });

  return c.json({ ok: true });
});

// List passkeys for the authenticated user
app.get("/v1/credentials", async (c) => {
  requireSameOrigin(c);
  const env = getEnv(c.env);
  const session = await getSession(c);
  if (!session) return c.text("Unauthorized", 401);
  const rows = await getCredentialsByUserId(env.DB, session.userId);
  return c.json({
    credentials: rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      lastUsedAt: r.last_used_at,
      transports: r.transports ? r.transports.split(",") : [],
    })),
  });
});

// Remove a passkey (must keep at least one)
app.delete("/v1/credentials/:id", async (c) => {
  requireSameOrigin(c);
  const env = getEnv(c.env);
  const session = await getSession(c);
  if (!session) return c.text("Unauthorized", 401);
  const all = await getCredentialsByUserId(env.DB, session.userId);
  if (all.length <= 1) return c.text("Cannot remove your only passkey", 400);
  const deleted = await deleteCredentialById(env.DB, c.req.param("id"), session.userId);
  if (!deleted) return c.text("Not found", 404);
  return c.json({ ok: true });
});

// Delete account and all associated data
app.post("/v1/account/delete", async (c) => {
  requireSameOrigin(c);
  const env = getEnv(c.env);
  const rl = await enforceRateLimit(c, { name: "account-delete", limit: 3 });
  if (rl) return rl;
  const session = await getSession(c);
  if (!session) return c.text("Unauthorized", 401);

  // Cancel Stripe subscription if active
  const user = await getUserById(env.DB, session.userId);
  if (user?.stripe_subscription_id) {
    try {
      const stripe = stripeClient(env);
      if (stripe) await stripe.subscriptions.cancel(user.stripe_subscription_id);
    } catch {
      // Subscription may already be cancelled — continue with deletion
    }
  }

  await deleteUserAndData(env.DB, session.userId);

  // Clear session cookie
  const secure = cookieSecure(env);
  const names = cookieNames(secure);
  setCookie(
    c,
    serializeCookie(names.session, "", {
      httpOnly: true,
      secure,
      sameSite: "Strict",
      path: "/",
      maxAgeSeconds: 0,
    }),
  );

  return c.json({ ok: true });
});

app.get("/v1/health", (c) => c.json({ ok: true }));

// Basic 404
app.all("*", (c) => c.text("Not found", 404));

export default app;

async function recoveryHash(pepper: string, code: string): Promise<string> {
  const bytes = utf8(`${pepper}:${code}`);
  const hash = await sha256Bytes(bytes);
  return base64urlEncode(hash);
}

function generateRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const raw = base64urlEncode(bytes);
  // Add separators for readability.
  return `${raw.slice(0, 6)}-${raw.slice(6, 12)}-${raw.slice(12, 18)}-${raw.slice(18, 24)}`;
}
