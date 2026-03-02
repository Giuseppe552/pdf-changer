import { base64urlDecode, base64urlEncode, hmacSha256, utf8 } from "./crypto";

export type SessionPayload = {
  userId: string;
  iat: number;
  exp: number;
};

export function cookieNames(secure: boolean): {
  session: string;
  reg: string;
  auth: string;
} {
  // `__Host-` cookies are rejected by browsers if not `Secure`.
  return secure
    ? {
        session: "__Host-session",
        reg: "__Host-webauthn_reg",
        auth: "__Host-webauthn_auth",
      }
    : {
        session: "session",
        reg: "webauthn_reg",
        auth: "webauthn_auth",
      };
}

export async function signCookieValue(
  signingKey: string,
  payloadObj: unknown,
): Promise<string> {
  const payloadJson = JSON.stringify(payloadObj);
  const payloadBytes = utf8(payloadJson);
  const sigBytes = await hmacSha256(utf8(signingKey), payloadBytes);
  return `${base64urlEncode(payloadBytes)}.${base64urlEncode(sigBytes)}`;
}

export async function verifySignedCookie<T>(
  signingKey: string,
  value: string | undefined,
): Promise<T | null> {
  if (!value) return null;
  const idx = value.lastIndexOf(".");
  if (idx === -1) return null;
  const payloadB64 = value.slice(0, idx);
  const sigB64 = value.slice(idx + 1);
  try {
    const payloadBytes = base64urlDecode(payloadB64);
    const sigBytes = base64urlDecode(sigB64);
    const expected = await hmacSha256(utf8(signingKey), payloadBytes);
    if (!timingSafeEqual(sigBytes, expected)) return null;
    const json = new TextDecoder().decode(payloadBytes);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i] ^ b[i];
  return out === 0;
}
