import React, { useState } from "react";
import { Surface } from "../Surface";
import { AuditReportPanel } from "./AuditReportPanel";
import type { AuditReport } from "../../../utils/vpe/types";

const ShieldIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="inline-block shrink-0"
    aria-hidden="true"
  >
    <path
      d="M8 1L2 3.5V7.5C2 11.09 4.56 14.41 8 15.25C11.44 14.41 14 11.09 14 7.5V3.5L8 1Z"
      fill="currentColor"
      fillOpacity="0.15"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="M5.5 8L7 9.5L10.5 6"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function AuditBadge({ report }: { report: AuditReport }) {
  const [expanded, setExpanded] = useState(false);

  const verdictText =
    report.verdict === "clean"
      ? "Verified clean"
      : report.verdict === "suspicious"
        ? "Suspicious activity detected"
        : "Audit failed";

  const verdictColor =
    report.verdict === "clean"
      ? "text-green-800 border-green-300"
      : report.verdict === "suspicious"
        ? "text-amber-800 border-amber-300"
        : "text-red-800 border-red-300";

  return (
    <div className="space-y-2">
      <Surface compact>
        <div className={`flex items-start justify-between gap-3 ${verdictColor}`}>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-[15px] font-semibold">
              <ShieldIcon />
              <span>{verdictText}</span>
              <span className="font-normal text-neutral-600">
                · {report.events.length} network request{report.events.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="text-xs text-neutral-500">
              {report.monitors.length} monitors active · {report.durationMs}ms
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 text-xs font-semibold text-neutral-600 hover:text-neutral-900"
          >
            {expanded ? "Hide" : "Details"}
          </button>
        </div>
      </Surface>

      {expanded ? <AuditReportPanel report={report} /> : null}
    </div>
  );
}
