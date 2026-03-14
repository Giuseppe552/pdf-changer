import { bytesToHex } from "../hex";
import type { AuditEvent } from "./types";

export type AuditLogEntry = {
  sequence: number;
  event: AuditEvent;
  hmac: string;
};

export async function buildHmacChain(events: AuditEvent[]): Promise<{
  entries: AuditLogEntry[];
  keyHex: string;
}> {
  const key = await crypto.subtle.generateKey(
    { name: "HMAC", hash: "SHA-256" },
    true,
    ["sign"],
  );
  const rawKey = await crypto.subtle.exportKey("raw", key);
  const keyHex = bytesToHex(new Uint8Array(rawKey));

  let previousHmac = "0".repeat(64);
  const entries: AuditLogEntry[] = [];

  for (let i = 0; i < events.length; i++) {
    const payload = previousHmac + JSON.stringify(events[i]);
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(payload),
    );
    const hmac = bytesToHex(new Uint8Array(sig));
    entries.push({ sequence: i, event: events[i], hmac });
    previousHmac = hmac;
  }

  return { entries, keyHex };
}
