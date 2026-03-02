import type { MeResponse } from "@pdf-changer/shared";
import { canUseTool, incrementToolUse, usageStatusText } from "./usageV2";

export function canUseScrubber(me: MeResponse): boolean {
  return canUseTool(me, "scrub");
}

export function incrementScrubUse(me: MeResponse): void {
  incrementToolUse(me, "scrub");
}

export function usageStatus(me: MeResponse): string {
  return usageStatusText(me, "scrub");
}
