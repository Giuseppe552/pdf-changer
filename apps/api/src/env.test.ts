import { describe, expect, it } from "vitest";
import { getEnv, cookieSecure } from "./env";
import type { Env } from "./env";

function fakeEnv(overrides: Partial<Env> = {}): Env {
  return {
    DB: {} as D1Database,
    APP_ORIGIN: "https://example.com",
    RP_ID: "example.com",
    RP_ORIGIN: "https://example.com",
    RP_NAME: "Test",
    SESSION_SIGNING_KEY: "test-key",
    RECOVERY_PEPPER: "test-pepper",
    ...overrides,
  };
}

describe("getEnv", () => {
  it("returns env when all required vars present", () => {
    const env = fakeEnv();
    const result = getEnv(env);
    expect(result.APP_ORIGIN).toBe("https://example.com");
    expect(result.RP_ID).toBe("example.com");
  });

  it("throws on missing APP_ORIGIN", () => {
    const env = fakeEnv({ APP_ORIGIN: "" });
    expect(() => getEnv(env)).toThrow("Missing env var: APP_ORIGIN");
  });

  it("throws on missing SESSION_SIGNING_KEY", () => {
    const env = fakeEnv({ SESSION_SIGNING_KEY: "" });
    expect(() => getEnv(env)).toThrow("Missing env var: SESSION_SIGNING_KEY");
  });

  it("throws on missing RECOVERY_PEPPER", () => {
    const env = fakeEnv({ RECOVERY_PEPPER: "" });
    expect(() => getEnv(env)).toThrow("Missing env var: RECOVERY_PEPPER");
  });

  it("passes through optional vars", () => {
    const env = fakeEnv({ STRIPE_SECRET_KEY: "sk_test_xxx" });
    const result = getEnv(env);
    expect(result.STRIPE_SECRET_KEY).toBe("sk_test_xxx");
  });
});

describe("cookieSecure", () => {
  it("defaults to true", () => {
    expect(cookieSecure(fakeEnv())).toBe(true);
  });

  it("returns false when explicitly disabled", () => {
    expect(cookieSecure(fakeEnv({ COOKIE_SECURE: "false" }))).toBe(false);
  });

  it("returns true for any other value", () => {
    expect(cookieSecure(fakeEnv({ COOKIE_SECURE: "true" }))).toBe(true);
    expect(cookieSecure(fakeEnv({ COOKIE_SECURE: "yes" }))).toBe(true);
  });
});
