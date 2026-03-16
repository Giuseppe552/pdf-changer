import type { MeResponse } from "@pdf-changer/shared";
import { getToolDefinition, type ToolSlug } from "../content/tools/toolRegistry";

/**
 * Usage module — all tools are free, no limits.
 * These functions exist to maintain the interface that tool pages call,
 * but they never block and never track.
 */

export type UsageSnapshot = {
  month: string;
  plan: string;
  used: { total: number; core: number; heavy: number; tool: number };
  limits: { total: null; heavy: null };
  remaining: { total: null; heavy: null };
  statusText: string;
};

export function usageSnapshot(_me: MeResponse, _toolSlug: ToolSlug = "scrub"): UsageSnapshot {
  return {
    month: "",
    plan: "free",
    used: { total: 0, core: 0, heavy: 0, tool: 0 },
    limits: { total: null, heavy: null },
    remaining: { total: null, heavy: null },
    statusText: "All tools are free. No limits.",
  };
}

export function canUseTool(_me: MeResponse, toolSlug: ToolSlug): boolean {
  const tool = getToolDefinition(toolSlug);
  return !!tool && tool.enabled;
}

export function incrementToolUse(_me: MeResponse, _toolSlug: ToolSlug): void {
  // no tracking
}

export function usageStatusText(_me: MeResponse, _toolSlug: ToolSlug = "scrub"): string {
  return "All tools are free. No limits.";
}
