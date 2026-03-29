import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { Card } from "../Card";
import { Surface } from "../Surface";
import { Button } from "../Button";
import { exportReportJson, exportReportHtml } from "../../../utils/vpe/reportExport";
import type { AuditReport } from "../../../utils/vpe/types";

function KeyValue({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-sm text-[var(--ui-text-muted)]">{k}</div>
      <div
        className={`text-right text-sm text-[var(--ui-text)] ${mono ? "font-mono break-all" : ""}`}
      >
        {v}
      </div>
    </div>
  );
}

export function AuditReportPanel({ report }: { report: AuditReport }) {
  const [exporting, setExporting] = useState(false);

  const verdictLabel =
    report.verdict === "clean"
      ? "Clean — no suspicious activity detected"
      : report.verdict === "suspicious"
        ? `Suspicious — ${report.events.length} event(s) detected`
        : "Failed — audit could not complete";

  const verdictBg =
    report.verdict === "clean"
      ? "emphasis"
      : report.verdict === "suspicious"
        ? "warning"
        : "danger";

  async function downloadJson() {
    setExporting(true);
    try {
      const json = await exportReportJson(report);
      download(new Blob([json], { type: "application/json" }), `vpe-report-${report.toolName}.json`);
    } finally {
      setExporting(false);
    }
  }

  async function downloadHtml() {
    setExporting(true);
    try {
      const blob = await exportReportHtml(report);
      download(blob, `vpe-report-${report.toolName}.html`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card title="Audit report">
      <div className="space-y-4">
        <Surface variant={verdictBg} compact>
          <div className="text-[15px] font-semibold">{verdictLabel}</div>
        </Surface>

        <Surface compact>
          <div className="mb-2 text-sm font-semibold text-[var(--ui-text)]">
            Hashes
          </div>
          <KeyValue k="Input SHA-256" v={report.inputSha256Hex} mono />
          <KeyValue k="Output SHA-256" v={report.outputSha256Hex} mono />
        </Surface>

        <Surface compact>
          <div className="mb-2 text-sm font-semibold text-[var(--ui-text)]">
            Monitors
          </div>
          <div className="space-y-1 text-[15px] text-[var(--ui-text-secondary)]">
            {report.monitors.map((m) => (
              <div key={m} className="flex items-center gap-2">
                <span className="text-emerald-400">&#10003;</span>
                <span className="capitalize">{m}</span>
                <span className="text-[var(--ui-text-muted)]">— clean</span>
              </div>
            ))}
          </div>
        </Surface>

        {report.events.length > 0 ? (
          <Surface variant="warning" compact>
            <div className="mb-2 text-sm font-semibold text-[var(--ui-text)]">
              Events
            </div>
            <ul className="list-inside list-disc space-y-1 text-sm text-[var(--ui-text-secondary)]">
              {report.events.map((e, i) => (
                <li key={i} className="break-all">
                  <span className="font-semibold">{e.type}</span>:{" "}
                  {e.type === "network-request"
                    ? `${e.url} (${e.initiatorType})`
                    : e.type === "csp-violation"
                      ? `${e.blockedURI} blocked by ${e.violatedDirective}`
                      : `<${e.tagName}>${e.src ? ` src="${e.src}"` : ""}`}
                </li>
              ))}
            </ul>
          </Surface>
        ) : null}

        <Surface compact>
          <div className="mb-2 text-sm font-semibold text-[var(--ui-text)]">
            Residual risks
          </div>
          <p className="text-[15px] text-[var(--ui-text-secondary)]">
            This audit cannot detect browser extensions, OS-level compromise, or
            hardware-level attacks. For maximum safety, use Tor Browser on Tails
            OS.{" "}
            <NavLink
              to="/security/technical/residual-risk-disclosure"
              className="underline"
            >
              Full disclosure
            </NavLink>
          </p>
        </Surface>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void downloadJson()} disabled={exporting}>
            Download JSON
          </Button>
          <Button variant="secondary" onClick={() => void downloadHtml()} disabled={exporting}>
            Download HTML report
          </Button>
        </div>

        <div className="text-xs text-[var(--ui-text-muted)]">
          Threat model based on analysis of 45+ browser exfiltration vectors.{" "}
          <NavLink
            to="/security/technical/csp-exfiltration-analysis"
            className="underline"
          >
            References
          </NavLink>
        </div>
      </div>
    </Card>
  );
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
