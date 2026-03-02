import React from "react";
import { PDFDocument } from "pdf-lib";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { PdfDropZone } from "../../components/PdfDropZone";
import { pdfToImage } from "../../../utils/pdf/operations/pdfToImage";
import { canUseTool, incrementToolUse } from "../../../utils/usageV2";
import { ResultDownloadPanel, type ToolOutputFile } from "./components/ResultDownloadPanel";

export function PdfToImageToolPage() {
  const { me } = useAuth();
  const [file, setFile] = React.useState<File | null>(null);
  const [pageCount, setPageCount] = React.useState<number | null>(null);
  const [pageCountError, setPageCountError] = React.useState<string | null>(null);
  const [format, setFormat] = React.useState<"png" | "jpeg">("png");
  const [scale, setScale] = React.useState(1);
  const [maxPages, setMaxPages] = React.useState(20);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [outputs, setOutputs] = React.useState<ToolOutputFile[]>([]);

  const HARD_PAGE_LIMIT = 40;

  const plannedPages =
    pageCount == null ? null : Math.max(1, Math.min(pageCount, maxPages));

  React.useEffect(
    () => () => {
      for (const output of outputs) URL.revokeObjectURL(output.url);
    },
    [outputs],
  );

  React.useEffect(() => {
    let cancelled = false;
    async function loadPageCount() {
      if (!file) {
        setPageCount(null);
        setPageCountError(null);
        return;
      }
      try {
        setPageCountError(null);
        const bytes = new Uint8Array(await file.arrayBuffer());
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: false });
        if (cancelled) return;
        setPageCount(doc.getPageCount());
      } catch {
        if (cancelled) return;
        setPageCount(null);
        setPageCountError("Could not read page count from this PDF.");
      }
    }
    void loadPageCount();
    return () => {
      cancelled = true;
    };
  }, [file]);

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setOutputs([]);
    try {
      if (!canUseTool(me, "pdf-to-image")) {
        throw new Error("Monthly heavy quota reached for this device.");
      }
      if (plannedPages == null) {
        throw new Error("Unable to estimate pages for export.");
      }
      if (plannedPages > HARD_PAGE_LIMIT) {
        throw new Error(`Export is limited to ${HARD_PAGE_LIMIT} pages per run.`);
      }
      if (scale > 2.5) {
        throw new Error("Scale above 2.5 is blocked to prevent browser memory spikes.");
      }
      const pdfBytes = new Uint8Array(await file.arrayBuffer());
      const result = await pdfToImage({
        pdfBytes,
        format,
        scale,
        maxPages: plannedPages,
      });
      const extension = format === "jpeg" ? "jpg" : "png";
      const base = baseName(file.name);
      const nextOutputs = await Promise.all(
        result.images.map(async (image) => {
          const response = await fetch(image.dataUrl);
          const blob = await response.blob();
          const bytes = new Uint8Array(await blob.arrayBuffer());
          return {
            name: `${base}.page-${image.pageIndex + 1}.${extension}`,
            url: URL.createObjectURL(blob),
            bytes,
          };
        }),
      );
      incrementToolUse(me, "pdf-to-image");
      setOutputs(nextOutputs);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card title="PDF → JPG/PNG">
        <div className="space-y-4">
          <PdfDropZone
            label="Choose a PDF"
            help="Export PDF pages to image files locally."
            files={file ? [file] : []}
            onFiles={(files) => setFile(files[0] ?? null)}
            disabled={busy}
          />
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1">
              <div className="text-sm text-neutral-700">Format</div>
              <select
                value={format}
                onChange={(event) => setFormat(event.target.value as "png" | "jpeg")}
                className="w-full rounded-sm border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                disabled={busy}
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPG</option>
              </select>
            </label>

            <label className="space-y-1">
              <div className="text-sm text-neutral-700">Render scale</div>
              <input
                type="number"
                min={0.5}
                max={2.5}
                step={0.1}
                value={scale}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (!Number.isFinite(next)) return;
                  setScale(next);
                }}
                className="w-full rounded-sm border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                disabled={busy}
              />
            </label>

            <label className="space-y-1">
              <div className="text-sm text-neutral-700">Max pages</div>
              <input
                type="number"
                min={1}
                max={HARD_PAGE_LIMIT}
                step={1}
                value={maxPages}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (!Number.isFinite(next)) return;
                  setMaxPages(next);
                }}
                className="w-full rounded-sm border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                disabled={busy}
              />
            </label>
          </div>

          <div className="rounded-sm border border-neutral-300 bg-neutral-50 p-3 text-[15px] text-neutral-700">
            <div className="font-semibold text-neutral-900">Preflight</div>
            <div className="mt-1">
              {pageCountError
                ? pageCountError
                : pageCount == null
                  ? "Load a PDF to estimate output volume."
                  : `Detected ${pageCount} pages.`}
            </div>
            {plannedPages != null ? (
              <div className="mt-1">
                Planned export: {plannedPages} page(s), scale {scale.toFixed(1)},
                {` `}format {format.toUpperCase()} (run limit {HARD_PAGE_LIMIT} pages).
              </div>
            ) : null}
          </div>

          <Button onClick={run} disabled={!file || busy}>
            {busy ? "Exporting…" : "Export images locally"}
          </Button>
        </div>
      </Card>

      <ResultDownloadPanel
        title="Image downloads"
        files={outputs}
        zipName={`${baseName(file?.name ?? "pdf")}-images.zip`}
      />

      {error ? (
        <Card title="Error" variant="danger">
          <div className="text-[15px] text-red-800">{error}</div>
        </Card>
      ) : null}
    </div>
  );
}

function baseName(name: string): string {
  return name.toLowerCase().endsWith(".pdf") ? name.slice(0, -4) : name;
}
