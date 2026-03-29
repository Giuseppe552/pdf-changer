import React, { useState } from "react";
import { AuditReportPanel } from "./AuditReportPanel";
import type { AuditReport } from "../../../utils/vpe/types";

export function AuditBadge({ report }: { report: AuditReport }) {
  const [expanded, setExpanded] = useState(false);
  const clean = report.verdict === "clean";
  const suspicious = report.verdict === "suspicious";

  return (
    <div className="space-y-2">
      <div
        className={[
          "rounded-lg border p-4",
          clean
            ? "border-emerald-800/40 bg-emerald-950/30"
            : suspicious
              ? "border-amber-700/40 bg-amber-950/20"
              : "border-red-700/40 bg-red-950/20",
        ].join(" ")}
      >
        {/* Verdict header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldIcon className={clean ? "text-emerald-400" : suspicious ? "text-amber-400" : "text-red-400"} />
            <span className={`text-[15px] font-semibold ${clean ? "text-emerald-300" : suspicious ? "text-amber-300" : "text-red-300"}`}>
              {clean ? "Verified — nothing leaked" : suspicious ? "Suspicious activity detected" : "Audit failed"}
            </span>
          </div>
          <span className="mono text-xs tabular-nums text-[var(--ui-text-muted)]">
            {report.durationMs}ms
          </span>
        </div>

        {/* Monitor checks — the actual proof */}
        <div className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          <Check
            passed={!report.events.some((e) => e.type === "network-request")}
            label="Network isolation"
            detail={`${report.events.filter((e) => e.type === "network-request").length} outbound requests`}
          />
          <Check
            passed={!report.events.some((e) => e.type === "csp-violation")}
            label="CSP enforcement"
            detail={report.cspPolicyActive ? "sandbox policy active" : "no policy detected"}
          />
          <Check
            passed={!report.events.some((e) => e.type === "dom-injection")}
            label="DOM integrity"
            detail={`${report.events.filter((e) => e.type === "dom-injection").length} injected elements`}
          />
          <Check
            passed={report.webrtcPatched}
            label="WebRTC blocked"
            detail="ICE candidates suppressed"
          />
        </div>

        {/* File hashes — compact, always visible */}
        <div className="mt-3 space-y-0.5 border-t border-[var(--ui-border)] pt-3">
          <HashRow label="in" hex={report.inputSha256Hex} />
          <HashRow label="out" hex={report.outputSha256Hex} />
        </div>

        {/* Expand for full report */}
        <div className="mt-3 flex items-center justify-between border-t border-[var(--ui-border)] pt-3">
          <span className="text-xs text-[var(--ui-text-muted)]">
            {report.monitors.length} monitors · {report.events.length} events · SHA-256 verified
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium text-[var(--ui-text-muted)] underline-offset-2 hover:text-[var(--ui-text)] hover:underline"
          >
            {expanded ? "Hide full report" : "Full report + export"}
          </button>
        </div>
      </div>

      {expanded ? <AuditReportPanel report={report} /> : null}
    </div>
  );
}

function Check({
  passed,
  label,
  detail,
}: {
  passed: boolean;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={passed ? "text-emerald-400" : "text-red-400"}>
        {passed ? "✓" : "✗"}
      </span>
      <span className="text-[var(--ui-text)]">{label}</span>
      <span className="text-[var(--ui-text-muted)]">— {detail}</span>
    </div>
  );
}

function HashRow({ label, hex }: { label: string; hex: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="mono w-6 shrink-0 text-right text-xs text-[var(--ui-text-muted)]">{label}</span>
      <span className="mono truncate text-xs text-[var(--ui-text-secondary)]">{hex}</span>
    </div>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className ?? ""}`}
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
}
