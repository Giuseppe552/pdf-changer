import type { MeResponse } from "@pdf-changer/shared";
import { isNoTraceMode } from "./noTrace";

const KEY = "pdfchanger.entitlement.v1";

export function setCachedEntitlement(me: MeResponse): void {
  if (isNoTraceMode()) return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(me));
  } catch {
    // ignore
  }
}

export function getCachedEntitlement(): MeResponse | null {
  if (isNoTraceMode()) return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MeResponse;
  } catch {
    return null;
  }
}

