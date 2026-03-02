import { describe, expect, it } from "vitest";
import { parseEntitlementToken } from "./entitlement";
import { base64urlEncode, utf8 } from "./crypto";

describe("parseEntitlementToken", () => {
  it("parses valid token", () => {
    const payload = JSON.stringify({ plan: "paid", exp: 9999999999 });
    const payloadB64 = base64urlEncode(utf8(payload));
    const fakeSig = base64urlEncode(new Uint8Array(64));
    const token = `${payloadB64}.${fakeSig}`;

    const result = parseEntitlementToken(token);
    expect(result).not.toBeNull();
    const decoded = JSON.parse(new TextDecoder().decode(result!.payloadBytes));
    expect(decoded.plan).toBe("paid");
    expect(result!.signatureBytes.length).toBe(64);
  });

  it("returns null for missing dot", () => {
    expect(parseEntitlementToken("nodothere")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseEntitlementToken("")).toBeNull();
  });

  it("splits on last dot", () => {
    const payload = JSON.stringify({ a: 1 });
    const payloadB64 = base64urlEncode(utf8(payload));
    const sig = base64urlEncode(new Uint8Array(32));
    // token with dots in payload area
    const token = `${payloadB64}.${sig}`;
    const result = parseEntitlementToken(token);
    expect(result).not.toBeNull();
  });
});
