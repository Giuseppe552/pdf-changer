import React from "react";
import type { UsageSnapshot } from "../../../../utils/usageV2";

// all tools are free — show a simple status line instead of a meter
export function UsageMeter({
  snapshot: _snapshot,
  title: _title,
}: {
  snapshot: UsageSnapshot;
  title?: string;
}) {
  return null;
}
