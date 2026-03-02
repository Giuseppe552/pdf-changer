import type { AccountPlan, MeResponse } from "@pdf-changer/shared";
import { getToolDefinition, type ToolBucket, type ToolSlug } from "../content/tools/toolRegistry";
import { isNoTraceMode } from "./noTrace";

const PREFIX = "pdfchanger.usage.v2.";
const MIGRATED_KEY = `${PREFIX}migrated.legacyScrub.v1`;

const LEGACY_GUEST_KEY = "pdfchanger.usage.guestScrubsUsed.v1";
const LEGACY_FREE_PREFIX = "pdfchanger.usage.freeScrubsUsed.v1.";

const QUOTAS = {
  guest: { total: 40 as number | null, heavy: null as number | null },
  free: { total: 600 as number | null, heavy: 150 as number | null },
  paid: { total: null as number | null, heavy: null as number | null },
} as const;

type PlanQuota = { total: number | null; heavy: number | null };

const TIER_RANK: Record<AccountPlan, number> = {
  guest: 0,
  free: 1,
  paid: 2,
};

function monthKey(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function keyTotal(month: string): string {
  return `${PREFIX}${month}.total`;
}

function keyBucket(month: string, bucket: ToolBucket): string {
  return `${PREFIX}${month}.bucket.${bucket}`;
}

function keyTool(month: string, toolSlug: ToolSlug): string {
  return `${PREFIX}${month}.tool.${toolSlug}`;
}

function getInt(key: string): number {
  if (isNoTraceMode()) return 0;
  try {
    const raw = localStorage.getItem(key);
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

function setInt(key: string, value: number): void {
  if (isNoTraceMode()) return;
  try {
    localStorage.setItem(key, String(Math.max(0, Math.floor(value))));
  } catch {
    // ignore local storage errors
  }
}

function hasMigratedLegacy(): boolean {
  try {
    return localStorage.getItem(MIGRATED_KEY) === "1";
  } catch {
    return true;
  }
}

function markMigratedLegacy(): void {
  try {
    localStorage.setItem(MIGRATED_KEY, "1");
  } catch {
    // ignore local storage errors
  }
}

function migrateLegacyScrubIfNeeded(): void {
  if (hasMigratedLegacy()) return;

  const month = monthKey();
  const legacyGuestUsed = getInt(LEGACY_GUEST_KEY);
  const legacyFreeUsed = getInt(`${LEGACY_FREE_PREFIX}${month}`);
  const legacyUsed = Math.max(legacyGuestUsed, legacyFreeUsed);

  if (legacyUsed > 0) {
    const total = getInt(keyTotal(month));
    const core = getInt(keyBucket(month, "core"));
    const scrub = getInt(keyTool(month, "scrub"));

    if (total === 0) setInt(keyTotal(month), legacyUsed);
    if (core === 0) setInt(keyBucket(month, "core"), legacyUsed);
    if (scrub === 0) setInt(keyTool(month, "scrub"), legacyUsed);
  }

  markMigratedLegacy();
}

function planQuota(plan: AccountPlan): PlanQuota {
  return QUOTAS[plan];
}

function canUseTier(plan: AccountPlan, minTier: AccountPlan): boolean {
  return TIER_RANK[plan] >= TIER_RANK[minTier];
}

export type UsageSnapshot = {
  month: string;
  plan: AccountPlan;
  used: {
    total: number;
    core: number;
    heavy: number;
    tool: number;
  };
  limits: {
    total: number | null;
    heavy: number | null;
  };
  remaining: {
    total: number | null;
    heavy: number | null;
  };
  statusText: string;
};

export function usageSnapshot(me: MeResponse, toolSlug: ToolSlug = "scrub"): UsageSnapshot {
  migrateLegacyScrubIfNeeded();
  const month = monthKey();
  const quota = planQuota(me.plan);
  const total = getInt(keyTotal(month));
  const core = getInt(keyBucket(month, "core"));
  const heavy = getInt(keyBucket(month, "heavy"));
  const tool = getInt(keyTool(month, toolSlug));
  const remainingTotal =
    quota.total == null ? null : Math.max(0, quota.total - total);
  const remainingHeavy =
    quota.heavy == null ? null : Math.max(0, quota.heavy - heavy);

  const statusText =
    me.plan === "paid"
      ? "Unlimited actions on paid tier."
      : quota.heavy == null
        ? `${remainingTotal ?? 0} actions left this month (device-local).`
        : `${remainingTotal ?? 0} actions left this month, ${remainingHeavy ?? 0} heavy actions left.`;

  return {
    month,
    plan: me.plan,
    used: { total, core, heavy, tool },
    limits: { total: quota.total, heavy: quota.heavy },
    remaining: { total: remainingTotal, heavy: remainingHeavy },
    statusText,
  };
}

export function canUseTool(me: MeResponse, toolSlug: ToolSlug): boolean {
  const tool = getToolDefinition(toolSlug);
  if (!tool || !tool.enabled) return false;
  if (!canUseTier(me.plan, tool.minTier)) return false;
  if (me.plan === "paid") return true;
  if (isNoTraceMode()) return true;

  const snapshot = usageSnapshot(me, toolSlug);
  if (snapshot.remaining.total != null && snapshot.remaining.total <= 0) return false;
  if (
    tool.bucket === "heavy" &&
    snapshot.remaining.heavy != null &&
    snapshot.remaining.heavy <= 0
  ) {
    return false;
  }
  return true;
}

export function incrementToolUse(me: MeResponse, toolSlug: ToolSlug): void {
  const tool = getToolDefinition(toolSlug);
  if (!tool || !tool.enabled) return;
  if (me.plan === "paid") return;

  migrateLegacyScrubIfNeeded();
  const month = monthKey();

  const nextTotal = getInt(keyTotal(month)) + 1;
  setInt(keyTotal(month), nextTotal);

  const bucketKey = keyBucket(month, tool.bucket);
  setInt(bucketKey, getInt(bucketKey) + 1);

  const toolKey = keyTool(month, toolSlug);
  setInt(toolKey, getInt(toolKey) + 1);
}

export function usageStatusText(me: MeResponse, toolSlug: ToolSlug = "scrub"): string {
  return usageSnapshot(me, toolSlug).statusText;
}

