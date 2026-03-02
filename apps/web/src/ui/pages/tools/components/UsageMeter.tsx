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
      <div className="text-base font-semibold text-neutral-900">{title}</div>
      <div className="mt-2 text-[15px] text-neutral-700">{snapshot.statusText}</div>

      <div className="mt-3 space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-sm text-neutral-700">
            <span>Total actions</span>
            <span>
              {snapshot.used.total}
              {snapshot.limits.total != null ? ` / ${snapshot.limits.total}` : ""}
            </span>
          </div>
          <div className="h-2 w-full border border-neutral-300 bg-white">
            <div className="h-full bg-blue-700" style={{ width: `${totalPercent}%` }} />
          </div>
        </div>

        {snapshot.limits.heavy != null ? (
          <div>
            <div className="mb-1 flex items-center justify-between text-sm text-neutral-700">
              <span>Heavy actions</span>
              <span>
                {snapshot.used.heavy} / {snapshot.limits.heavy}
              </span>
            </div>
            <div className="h-2 w-full border border-neutral-300 bg-white">
              <div className="h-full bg-amber-500" style={{ width: `${heavyPercent}%` }} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

