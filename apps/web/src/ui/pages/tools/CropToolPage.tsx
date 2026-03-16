import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { PdfDropZone } from "../../components/PdfDropZone";
import { cropPdf, type CropUnit } from "../../../utils/pdf/operations/cropPdf";
import { canUseTool, incrementToolUse } from "../../../utils/usageV2";
import { toArrayBuffer } from "../../../utils/toArrayBuffer";
import { ResultDownloadPanel } from "./components/ResultDownloadPanel";
import { processAudited } from "../../../utils/vpe/processAudited";
import type { AuditReport } from "../../../utils/vpe/types";
import { AuditBadge } from "../../components/vpe/AuditBadge";

type ApplyTo = "all" | "range";
type MarginMode = "uniform" | "per-side";

export function CropToolPage() {
  const { me } = useAuth();
  const [file, setFile] = React.useState<File | null>(null);
  const [unit, setUnit] = React.useState<CropUnit>("percent");
  const [marginMode, setMarginMode] = React.useState<MarginMode>("uniform");
  const [uniformValue, setUniformValue] = React.useState(10);
  const [top, setTop] = React.useState(10);
  const [bottom, setBottom] = React.useState(10);
  const [left, setLeft] = React.useState(10);
  const [right, setRight] = React.useState(10);
  const [applyTo, setApplyTo] = React.useState<ApplyTo>("all");
  const [pageRanges, setPageRanges] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [out, setOut] = React.useState<{ url: string; name: string } | null>(null);
  const [summary, setSummary] = React.useState<{ cropped: number; total: number } | null>(null);
  const [auditReport, setAuditReport] = React.useState<AuditReport | null>(null);

  React.useEffect(
    () => () => {
      if (out?.url) URL.revokeObjectURL(out.url);
    },
    [out],
  );

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setOut(null);
    setSummary(null);
    try {
      if (!canUseTool(me, "crop")) {
        throw new Error("Monthly quota reached for this tool.");
      }
      const margins =
        marginMode === "uniform"
          ? { top: uniformValue, bottom: uniformValue, left: uniformValue, right: uniformValue }
          : { top, bottom, left, right };
      const inputBytes = new Uint8Array(await file.arrayBuffer());
      const { outputBytes, toolReport, auditReport: report } = await processAudited({
        toolName: "crop",
        inputBytes,
        processFn: async (bytes) => cropPdf({ inputBytes: bytes, margins, unit, pageRanges: applyTo === "all" ? "" : pageRanges }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool report shape
      const output = toolReport as any;
      setAuditReport(report);
      const blob = new Blob([toArrayBuffer(outputBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      incrementToolUse(me, "crop");
      setOut({ url, name: `${baseName(file.name)}.cropped.pdf` });
      setSummary({ cropped: output.croppedCount, total: output.pageCount });
    } catch (value) {
      setError(value instanceof Error ? value.message : "Crop failed");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-2 text-sm text-[var(--ui-text)]";

  return (
    <div className="space-y-4">
      <Card title="Crop PDF">
        <div className="space-y-4">
          <PdfDropZone
            label="Choose a PDF"
            help="Trim margins from all or selected pages."
            files={file ? [file] : []}
            onFiles={(files) => setFile(files[0] ?? null)}
            disabled={busy}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <div className="text-sm text-[var(--ui-text-secondary)]">Unit</div>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as CropUnit)}
                className={inputCls}
                disabled={busy}
              >
                <option value="percent">Percent (%)</option>
                <option value="points">Points (pt)</option>
              </select>
            </label>
            <label className="space-y-1">
              <div className="text-sm text-[var(--ui-text-secondary)]">Margin mode</div>
              <select
                value={marginMode}
                onChange={(e) => setMarginMode(e.target.value as MarginMode)}
                className={inputCls}
                disabled={busy}
              >
                <option value="uniform">Uniform (all sides)</option>
                <option value="per-side">Per side</option>
              </select>
            </label>
          </div>
          {marginMode === "uniform" ? (
            <label className="space-y-1">
              <div className="text-sm text-[var(--ui-text-secondary)]">
                Margin ({unit === "percent" ? "%" : "pt"})
              </div>
              <input
                type="number"
                min={0}
                max={unit === "percent" ? 49 : 500}
                step={1}
                value={uniformValue}
                onChange={(e) => setUniformValue(Number(e.target.value))}
                className={inputCls}
                disabled={busy}
              />
            </label>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {([["Top", top, setTop], ["Bottom", bottom, setBottom], ["Left", left, setLeft], ["Right", right, setRight]] as const).map(
                ([label, value, setter]) => (
                  <label key={label} className="space-y-1">
                    <div className="text-sm text-[var(--ui-text-secondary)]">
                      {label} ({unit === "percent" ? "%" : "pt"})
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={unit === "percent" ? 49 : 500}
                      step={1}
                      value={value}
                      onChange={(e) => setter(Number(e.target.value))}
                      className={inputCls}
                      disabled={busy}
                    />
                  </label>
                ),
              )}
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <div className="text-sm text-[var(--ui-text-secondary)]">Apply to</div>
              <select
                value={applyTo}
                onChange={(e) => setApplyTo(e.target.value as ApplyTo)}
                className={inputCls}
                disabled={busy}
              >
                <option value="all">All pages</option>
                <option value="range">Specific pages</option>
              </select>
            </label>
          </div>
          {applyTo === "range" ? (
            <label className="space-y-1">
              <div className="text-sm text-[var(--ui-text-secondary)]">
                Page ranges (example: 1,3-5,9-)
              </div>
              <input
                value={pageRanges}
                onChange={(e) => setPageRanges(e.target.value)}
                className={inputCls}
                disabled={busy}
                spellCheck={false}
              />
            </label>
          ) : null}
          <Button onClick={run} disabled={!file || busy}>
            {busy ? "Cropping…" : "Crop pages"}
          </Button>
        </div>
      </Card>

      {summary ? (
        <Card title="Result summary">
          <div className="text-[15px] text-[var(--ui-text-secondary)]">
            Cropped {summary.cropped} of {summary.total} pages.
          </div>
        </Card>
      ) : null}

      {auditReport ? <AuditBadge report={auditReport} /> : null}
      {out ? <ResultDownloadPanel files={[out]} /> : null}

      {error ? (
        <Card title="Error" variant="danger">
          <div className="text-[15px] text-red-300">{error}</div>
        </Card>
      ) : null}
    </div>
  );
}

function baseName(name: string): string {
  return name.toLowerCase().endsWith(".pdf") ? name.slice(0, -4) : name;
}
