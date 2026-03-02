import type { Env } from "./env";
import { base64urlEncode, base64urlDecode, toArrayBuffer, utf8 } from "./crypto";

export type EntitlementPayload = {
  plan: "free" | "paid";
  exp: number; // epoch seconds
  sid?: string;
};

export async function signEntitlement(
  env: Env,
  payload: EntitlementPayload,
): Promise<string | null> {
  if (!env.ENTITLEMENT_PRIVATE_JWK) return null;
  const jwk = JSON.parse(env.ENTITLEMENT_PRIVATE_JWK) as JsonWebKey;
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const payloadBytes = utf8(JSON.stringify(payload));
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      toArrayBuffer(payloadBytes),
    ),
  );
  return `${base64urlEncode(payloadBytes)}.${base64urlEncode(sig)}`;
}

export function parseEntitlementToken(
  token: string,
): { payloadBytes: Uint8Array; signatureBytes: Uint8Array } | null {
  const idx = token.lastIndexOf(".");
  if (idx === -1) return null;
  const payloadB64 = token.slice(0, idx);
  const sigB64 = token.slice(idx + 1);
  try {
    return {
      payloadBytes: base64urlDecode(payloadB64),
      signatureBytes: base64urlDecode(sigB64),
    };
  } catch {
    return null;
  }
}
