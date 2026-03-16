import React from "react";
import type { UsageSnapshot } from "../../../../utils/usageV2";

function meterValue(used: number, limit: number | null): number {
  if (limit == null || limit <= 0) return 0;
  return Math.max(0, Math.min(100, (used / limit) * 100));
}

export function UsageMeter({
  snapshot,
  title = "Monthly usage",
}: {
  snapshot: UsageSnapshot;
  title?: string;
}) {
  const totalPercent = meterValue(snapshot.used.total, snapshot.limits.total);
  const heavyPercent = meterValue(snapshot.used.heavy, snapshot.limits.heavy);

  return (
    <div className="ui-surface p-4">
      <div className="text-base font-semibold text-[var(--ui-text)]">{title}</div>
      <div className="mt-2 text-[15px] text-[var(--ui-text-secondary)]">{snapshot.statusText}</div>

      <div className="mt-3 space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-sm text-[var(--ui-text-secondary)]">
            <span>Total actions</span>
            <span>
              {snapshot.used.total}
              {snapshot.limits.total != null ? ` / ${snapshot.limits.total}` : ""}
            </span>
          </div>
          <div className="h-2 w-full border border-[var(--ui-border)] bg-[var(--ui-bg-raised)]">
            <div className="h-full bg-[var(--ui-accent)]" style={{ width: `${totalPercent}%` }} />
          </div>
        </div>

        {snapshot.limits.heavy != null ? (
          <div>
            <div className="mb-1 flex items-center justify-between text-sm text-[var(--ui-text-secondary)]">
              <span>Heavy actions</span>
              <span>
                {snapshot.used.heavy} / {snapshot.limits.heavy}
              </span>
            </div>
            <div className="h-2 w-full border border-[var(--ui-border)] bg-[var(--ui-bg-raised)]">
              <div className="h-full bg-amber-950/300" style={{ width: `${heavyPercent}%` }} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

