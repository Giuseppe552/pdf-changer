import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { PdfDropZone } from "../../components/PdfDropZone";
import { ProcessingIndicator } from "../../components/ProcessingIndicator";
import { Surface } from "../../components/Surface";
import { Term } from "../../components/Term";
import { flattenToImagePdf } from "../../../utils/pdf/operations/flattenToImagePdf";
import { canUseTool, incrementToolUse } from "../../../utils/usageV2";
import { toArrayBuffer } from "../../../utils/toArrayBuffer";
import { ResultDownloadPanel } from "./components/ResultDownloadPanel";
import { processAudited } from "../../../utils/vpe/processAudited";
import type { AuditReport } from "../../../utils/vpe/types";
import type { ProgressUpdate } from "../../../utils/progress";
import { AuditBadge } from "../../components/vpe/AuditBadge";

const DPI_OPTIONS = [72, 150, 200, 300] as const;

export function FlattenToolPage() {
  const { me } = useAuth();
  const [file, setFile] = React.useState<File | null>(null);
  const [dpi, setDpi] = React.useState<number>(150);
  const [format, setFormat] = React.useState<"png" | "jpeg">("png");
  const [quality, setQuality] = React.useState(0.92);
  const [busy, setBusy] = React.useState(false);
  const [progressInfo, setProgressInfo] = React.useState<ProgressUpdate | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    url: string;
    name: string;
    pageCount: number;
  } | null>(null);
  const [auditReport, setAuditReport] = React.useState<AuditReport | null>(null);

  React.useEffect(
    () => () => {
      if (result?.url) URL.revokeObjectURL(result.url);
    },
    [result],
  );

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setProgressInfo(null);
    try {
      if (!canUseTool(me, "flatten")) {
        throw new Error("Monthly heavy quota reached for this device.");
      }
      const inputBytes = new Uint8Array(await file.arrayBuffer());
      const { outputBytes, toolReport, auditReport: report } = await processAudited({
        toolName: "flatten",
        inputBytes,
        processFn: async (bytes) => flattenToImagePdf({ pdfBytes: bytes, dpi, format, jpegQuality: quality, onProgress: setProgressInfo }),
        onProgress: setProgressInfo,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool report shape
      const output = toolReport as any;
      setAuditReport(report);
      const blob = new Blob([toArrayBuffer(outputBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      incrementToolUse(me, "flatten");
      setResult({
        url,
        name: `${baseName(file.name)}.flattened.pdf`,
        pageCount: output.pageCount,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Flatten failed");
    } finally {
      setBusy(false);
      setProgressInfo(null);
    }
  }

  return (
    <div className="space-y-4">
      <Surface variant="warning" compact>
        <div className="text-[15px] text-amber-300">
          This tool <Term tip="Converts each page into a flat image">rasterizes</Term> every
          page, removing all hidden structure (fonts, layers,{" "}
          <Term tip="Author, dates, software info embedded in the file">metadata</Term>,
          embedded files, scripts, form data,{" "}
          <Term tip="Photo data: camera model, date, GPS coordinates">EXIF</Term>).
          Text will become non-selectable.
        </div>
      </Surface>

      <Card title="Flatten PDF to Images">
        <div className="space-y-4">
          <PdfDropZone
            label="Choose a PDF"
            help="Every page will be rasterized to an image. All hidden structure is destroyed."
            files={file ? [file] : []}
            onFiles={(files) => setFile(files[0] ?? null)}
            disabled={busy}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-[var(--ui-text)]">DPI</label>
              <select
                className="w-full rounded border border-[var(--ui-border)] px-3 py-2 text-sm"
                value={dpi}
                onChange={(e) => setDpi(Number(e.target.value))}
                disabled={busy}
              >
                {DPI_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} DPI{d === 150 ? " (recommended)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-[var(--ui-text)]">Format</label>
              <select
                className="w-full rounded border border-[var(--ui-border)] px-3 py-2 text-sm"
                value={format}
                onChange={(e) => setFormat(e.target.value as "png" | "jpeg")}
                disabled={busy}
              >
                <option value="png">PNG (lossless)</option>
                <option value="jpeg">JPEG (smaller)</option>
              </select>
            </div>

            {format === "jpeg" ? (
              <div className="space-y-1">
                <label className="text-sm font-semibold text-[var(--ui-text)]">
                  Quality: {Math.round(quality * 100)}%
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={1}
                  step={0.01}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full"
                  disabled={busy}
                />
              </div>
            ) : null}
          </div>

          <Button onClick={run} disabled={!file || busy}>
            {busy ? "Flattening…" : "Flatten locally"}
          </Button>
        </div>
      </Card>

      {busy && (
        <ProcessingIndicator
          label="Rasterising pages"
          progress={progressInfo}
        />
      )}

      {result ? (
        <Card title="Flatten report">
          <div className="text-[15px] text-[var(--ui-text-secondary)]">
            <span className="font-semibold text-[var(--ui-text)]">Pages:</span>{" "}
            {result.pageCount} rasterized. All metadata cleared. Text is non-selectable.
          </div>
        </Card>
      ) : null}

      {auditReport ? <AuditBadge report={auditReport} /> : null}
      {result ? (
        <ResultDownloadPanel files={[{ url: result.url, name: result.name }]} />
      ) : null}

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
