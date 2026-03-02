import { describe, expect, it } from "vitest";
import { parseCookies, serializeCookie } from "./cookies";

describe("parseCookies", () => {
  it("returns empty for null", () => {
    expect(parseCookies(null)).toEqual({});
  });

  it("returns empty for empty string", () => {
    expect(parseCookies("")).toEqual({});
  });

  it("parses single cookie", () => {
    expect(parseCookies("session=abc123")).toEqual({ session: "abc123" });
  });

  it("parses multiple cookies", () => {
    const result = parseCookies("a=1; b=2; c=3");
    expect(result).toEqual({ a: "1", b: "2", c: "3" });
  });

  it("handles values containing =", () => {
    const result = parseCookies("token=abc=def=ghi");
    expect(result.token).toBe("abc=def=ghi");
  });

  it("trims whitespace", () => {
    const result = parseCookies("  a = 1 ;  b = 2 ");
    expect(result.a).toBe("1");
    expect(result.b).toBe("2");
  });

  it("skips entries without =", () => {
    const result = parseCookies("good=yes; broken; also=ok");
    expect(result).toEqual({ good: "yes", also: "ok" });
  });
});

describe("serializeCookie", () => {
  it("sets name and value", () => {
    const cookie = serializeCookie("session", "abc", {});
    expect(cookie).toContain("session=abc");
  });

  it("includes HttpOnly when set", () => {
    const cookie = serializeCookie("s", "v", { httpOnly: true });
    expect(cookie).toContain("HttpOnly");
  });

  it("includes Secure when set", () => {
    const cookie = serializeCookie("s", "v", { secure: true });
    expect(cookie).toContain("Secure");
  });

  it("includes SameSite", () => {
    const cookie = serializeCookie("s", "v", { sameSite: "Strict" });
    expect(cookie).toContain("SameSite=Strict");
  });

  it("includes Max-Age", () => {
    const cookie = serializeCookie("s", "v", { maxAgeSeconds: 3600 });
    expect(cookie).toContain("Max-Age=3600");
  });

  it("floors Max-Age", () => {
    const cookie = serializeCookie("s", "v", { maxAgeSeconds: 3.7 });
    expect(cookie).toContain("Max-Age=3");
  });

  it("clamps negative Max-Age to 0", () => {
    const cookie = serializeCookie("s", "v", { maxAgeSeconds: -10 });
    expect(cookie).toContain("Max-Age=0");
  });

  it("defaults path to /", () => {
    const cookie = serializeCookie("s", "v", {});
    expect(cookie).toContain("Path=/");
  });

  it("uses custom path", () => {
    const cookie = serializeCookie("s", "v", { path: "/api" });
    expect(cookie).toContain("Path=/api");
  });

  it("combines all options", () => {
    const cookie = serializeCookie("__Host-session", "tok", {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      path: "/",
      maxAgeSeconds: 86400,
    });
    expect(cookie).toBe(
      "__Host-session=tok; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400",
    );
  });
});
