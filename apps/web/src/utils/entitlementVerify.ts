import { toArrayBuffer } from "./toArrayBuffer";

type EntitlementPayload = { plan: "free" | "paid"; exp: number; sid?: string };

function base64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function getPublicJwk(): JsonWebKey | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vite import.meta.env
  const raw = (import.meta as any).env?.VITE_ENTITLEMENT_PUBLIC_JWK as
    | string
    | undefined;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as JsonWebKey;
  } catch {
    return null;
  }
}

export function entitlementVerificationConfigured(): boolean {
  return !!getPublicJwk();
}

export async function verifyEntitlementToken(
  token: string,
): Promise<EntitlementPayload | null> {
  const jwk = getPublicJwk();
  if (!jwk) return null;
  const idx = token.lastIndexOf(".");
  if (idx === -1) return null;
  const payloadB64 = token.slice(0, idx);
  const sigB64 = token.slice(idx + 1);
  let payloadBytes: Uint8Array;
  let sigBytes: Uint8Array;
  try {
    payloadBytes = base64urlToBytes(payloadB64);
    sigBytes = base64urlToBytes(sigB64);
  } catch {
    return null;
  }

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    toArrayBuffer(sigBytes),
    toArrayBuffer(payloadBytes),
  );
  if (!ok) return null;

  try {
    const payload = JSON.parse(bytesToString(payloadBytes)) as EntitlementPayload;
    if (!payload || (payload.plan !== "free" && payload.plan !== "paid")) return null;
    if (!Number.isFinite(payload.exp)) return null;
    if (payload.exp < Date.now() / 1000) return null;
    // sid validation is handled by the caller if needed (backwards compatible)
    return payload;
  } catch {
    return null;
  }
}
