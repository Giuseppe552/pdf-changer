import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Surface } from "../../components/Surface";
import { InlineCode } from "../../components/InlineCode";
import { PdfDropZone } from "../../components/PdfDropZone";
import { canUseTool, incrementToolUse } from "../../../utils/usageV2";
import { analyzePdf, type ForensicReport, type Finding, type RiskLevel } from "../../../utils/pdf/analyzePdf";
import { ProcessingIndicator } from "../../components/ProcessingIndicator";

function formatBytes(n: number): string {
  if (n <= 0) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  let v = n, i = 0;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}

function riskVariant(level: RiskLevel) {
  if (level === "critical" || level === "high") return "danger" as const;
  if (level === "medium") return "warning" as const;
  return "default" as const;
}

function riskLabel(level: RiskLevel): string {
  switch (level) {
    case "critical": return "Critical privacy risks detected";
    case "high": return "Significant identity exposure";
    case "medium": return "Moderate information leakage";
    default: return "Minimal exposure detected";
  }
}

function severityVariant(s: Finding["severity"]) {
  if (s === "critical") return "danger" as const;
  if (s === "warning") return "warning" as const;
  return "default" as const;
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-sm text-[var(--ui-text-muted)]">{k}</div>
      <div className={`text-right text-sm text-[var(--ui-text)] ${mono ? "font-mono break-all" : ""}`}>
        {v}
      </div>
    </div>
  );
}

export function AnalyzeToolPage() {
  const { me } = useAuth();
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [report, setReport] = React.useState<ForensicReport | null>(null);

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      if (!canUseTool(me, "analyze")) {
        throw new Error("Monthly quota reached for this device.");
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const res = await analyzePdf(bytes);
      incrementToolUse(me, "analyze");
      setReport(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  }

  // sort findings: critical first, then warning, then info
  const sorted = report
    ? [...report.findings].sort((a, b) => {
        const ord = { critical: 0, warning: 1, info: 2 };
        return ord[a.severity] - ord[b.severity];
      })
    : [];

  return (
    <div className="space-y-4">
      <Card title="Forensic Analyzer">
        <div className="space-y-4">
          <PdfDropZone
            label="Choose a PDF to analyze"
            help="Drag and drop a PDF. Analysis runs on-device — nothing leaves your browser."
            files={file ? [file] : []}
            onFiles={(f) => setFile(f[0] ?? null)}
            disabled={busy}
          />
          <Button onClick={run} disabled={!file || busy}>
            {busy ? "Analyzing…" : "Analyze locally"}
          </Button>
        </div>
      </Card>

      {busy && <ProcessingIndicator label="Analyzing PDF" />}

      {error ? (
        <Card title="Error" variant="danger">
          <div className="text-[15px] text-red-300">{error}</div>
        </Card>
      ) : null}

      {report ? (
        <>
          {/* risk badge */}
          <Surface variant={riskVariant(report.riskLevel)} compact>
            <div className="text-[15px] font-semibold">
              {riskLabel(report.riskLevel)}
            </div>
            <div className="mt-1 text-sm text-[var(--ui-text-secondary)]">
              {report.findings.length} finding{report.findings.length !== 1 ? "s" : ""} across{" "}
              {report.pageCount} page{report.pageCount !== 1 ? "s" : ""}
            </div>
          </Surface>

          {/* findings */}
          {sorted.length > 0 ? (
            <Card title="Findings">
              <div className="space-y-3">
                {sorted.map((f, i) => (
                  <Surface key={i} variant={severityVariant(f.severity)} compact>
                    <div className="text-sm font-semibold text-[var(--ui-text)]">{f.title}</div>
                    <div className="mt-1 text-[15px] text-[var(--ui-text-secondary)]">{f.detail}</div>
                    <div className="mt-1 text-sm text-[var(--ui-text-muted)]">{f.remediation}</div>
                  </Surface>
                ))}
              </div>
            </Card>
          ) : null}

          {/* doc overview */}
          <Card title="Document overview">
            <div className="grid gap-2 text-[15px] text-[var(--ui-text-secondary)] md:grid-cols-3">
              <div>
                <span className="font-semibold text-[var(--ui-text)]">Pages:</span> {report.pageCount}
              </div>
              <div>
                <span className="font-semibold text-[var(--ui-text)]">Size:</span> {formatBytes(report.fileSize)}
              </div>
              <div>
                <span className="font-semibold text-[var(--ui-text)]">Revisions:</span> {report.revisionCount}
              </div>
            </div>
          </Card>

          {/* metadata table */}
          {Object.values(report.metadata).some(Boolean) ? (
            <Card title="Document metadata">
              <div className="grid gap-2 md:grid-cols-2">
                {Object.entries(report.metadata).map(([k, v]) => (
                  <KV key={k} k={k} v={v ?? "—"} />
                ))}
              </div>
            </Card>
          ) : null}

          {/* image exif */}
          {report.imageExif.length > 0 ? (
            <Card title="Embedded image EXIF">
              <p className="mb-3 text-sm text-[var(--ui-text-muted)]">
                Shown so you can understand what your document exposes. Use the scrubber to remove it before sharing.
              </p>
              <div className="space-y-3">
                {report.imageExif.map((img) => (
                  <Surface key={img.index} compact>
                    <div className="text-sm font-semibold text-[var(--ui-text)]">Image {img.index}</div>
                    <div className="mt-1 grid gap-1">
                      {img.make ? <KV k="Make" v={img.make} /> : null}
                      {img.model ? <KV k="Model" v={img.model} /> : null}
                      {img.software ? <KV k="Software" v={img.software} /> : null}
                      {img.dateTime ? <KV k="DateTime" v={img.dateTime} /> : null}
                      {img.gps ? (
                        <KV k="GPS" v={`${img.gps.lat.toFixed(6)}, ${img.gps.lon.toFixed(6)}`} mono />
                      ) : null}
                    </div>
                  </Surface>
                ))}
              </div>
            </Card>
          ) : null}

          {/* outbound URLs */}
          {report.outboundUrls.length > 0 ? (
            <Card title="Outbound URLs">
              <ul className="space-y-1 text-[15px]">
                {report.outboundUrls.map((url, i) => (
                  <li key={i} className="break-all font-mono text-sm text-[var(--ui-text-secondary)]">{url}</li>
                ))}
              </ul>
            </Card>
          ) : null}

          {/* font fingerprints */}
          {report.fontFingerprints.length > 0 ? (
            <Card title="Font subset fingerprints">
              <div className="flex flex-wrap gap-2">
                {report.fontFingerprints.map((f) => (
                  <InlineCode key={f}>{f}</InlineCode>
                ))}
              </div>
            </Card>
          ) : null}

          {/* CTA */}
          <Surface variant="emphasis" compact>
            <div className="text-[15px] text-[var(--ui-text-secondary)]">
              Want to neutralize these threats?{" "}
              <NavLink className="underline" to="/tools/scrub">Scrub this PDF</NavLink>
              {" or use the "}
              <NavLink className="underline" to="/tools/pipeline">Privacy Pipeline</NavLink>
              {" for maximum protection."}
            </div>
          </Surface>
        </>
      ) : null}
    </div>
  );
}
