import { describe, expect, it } from "vitest";
import { cookieNames, signCookieValue, verifySignedCookie } from "./session";

describe("cookieNames", () => {
  it("uses __Host- prefix when secure", () => {
    const names = cookieNames(true);
    expect(names.session.startsWith("__Host-")).toBe(true);
  });

  it("uses plain cookies when not secure", () => {
    const names = cookieNames(false);
    expect(names.session.startsWith("__Host-")).toBe(false);
  });
});

describe("signed cookies", () => {
  it("round-trips payload", async () => {
    const value = await signCookieValue("key", { a: 1, b: "x" });
    const out = await verifySignedCookie<{ a: number; b: string }>("key", value);
    expect(out).toEqual({ a: 1, b: "x" });
  });

  it("rejects wrong key", async () => {
    const value = await signCookieValue("key", { a: 1 });
    const out = await verifySignedCookie("wrong", value);
    expect(out).toBeNull();
  });
});

