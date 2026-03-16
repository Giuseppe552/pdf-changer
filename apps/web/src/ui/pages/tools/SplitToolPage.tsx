import React from "react";
import { PDFDocument } from "pdf-lib";
import { useAuth } from "../../auth/AuthContext";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { parsePageRanges } from "../../../utils/pdf/pageRanges";
import { toArrayBuffer } from "../../../utils/toArrayBuffer";
import { runAudited } from "../../../utils/vpe/auditRunner";
import type { AuditReport } from "../../../utils/vpe/types";
import { PdfDropZone } from "../../components/PdfDropZone";
import { AuditBadge } from "../../components/vpe/AuditBadge";
import { canUseTool, incrementToolUse } from "../../../utils/usageV2";
import { ResultDownloadPanel, type ToolOutputFile } from "./components/ResultDownloadPanel";

export function SplitToolPage() {
  const { me } = useAuth();
  const [file, setFile] = React.useState<File | null>(null);
  const [pageCount, setPageCount] = React.useState<number | null>(null);
  const [pageCountError, setPageCountError] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<"ranges" | "perPage">("ranges");
  const [ranges, setRanges] = React.useState("1-");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [outs, setOuts] = React.useState<ToolOutputFile[]>([]);
  const [auditReport, setAuditReport] = React.useState<AuditReport | null>(null);

  const MAX_PER_PAGE_OUTPUTS = 200;
  const MAX_RANGE_PARTS = 40;

  React.useEffect(() => {
    return () => {
      for (const o of outs) URL.revokeObjectURL(o.url);
    };
  }, [outs]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadPageCount() {
      if (!file) {
        setPageCount(null);
        setPageCountError(null);
        return;
      }
      setPageCountError(null);
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: false });
        if (cancelled) return;
        setPageCount(doc.getPageCount());
      } catch {
        if (cancelled) return;
        setPageCount(null);
        setPageCountError("Could not read pages from this file.");
      }
    }

    void loadPageCount();
    return () => {
      cancelled = true;
    };
  }, [file]);

  const rangePreview = React.useMemo(() => {
    if (mode !== "ranges" || !pageCount) {
      return { outputs: 0, selectedPages: 0, error: null as string | null };
    }
    try {
      const parts = parsePageRanges(ranges, pageCount);
      const selectedPages = parts.reduce((sum, part) => sum + part.length, 0);
      return { outputs: parts.length, selectedPages, error: null as string | null };
    } catch (value) {
      return {
        outputs: 0,
        selectedPages: 0,
        error: value instanceof Error ? value.message : "Invalid range syntax.",
      };
    }
  }, [mode, pageCount, ranges]);

  async function split() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setOuts([]);
    setAuditReport(null);
    try {
      if (!canUseTool(me, "split")) {
        throw new Error("Monthly quota reached for this tool.");
      }
      const inputBytes = new Uint8Array(await file.arrayBuffer());
      const { result, report } = await runAudited({
        toolName: "split",
        inputBytes,
        processFn: async (bytes) => {
          const src = await PDFDocument.load(bytes, { ignoreEncryption: false });
          const pageCount = src.getPageCount();
          const outputs: ToolOutputFile[] = [];

          if (mode === "perPage") {
            if (pageCount > MAX_PER_PAGE_OUTPUTS) {
              throw new Error(
                `This tool limits one-per-page exports to ${MAX_PER_PAGE_OUTPUTS} pages.`,
              );
            }
            for (let i = 0; i < pageCount; i++) {
              const outDoc = await PDFDocument.create();
              const [page] = await outDoc.copyPages(src, [i]);
              outDoc.addPage(page);
              const outBytes = new Uint8Array(await outDoc.save());
              const blob = new Blob([toArrayBuffer(outBytes)], { type: "application/pdf" });
              outputs.push({
                url: URL.createObjectURL(blob),
                name: `${baseName(file.name)}.page-${i + 1}.pdf`,
                bytes: outBytes,
              });
            }
          } else {
            const parts = parsePageRanges(ranges, pageCount);
            if (parts.length === 0) throw new Error("No pages selected.");
            if (parts.length > MAX_RANGE_PARTS) {
              throw new Error(`Too many parts. Keep it under ${MAX_RANGE_PARTS}.`);
            }
            for (let i = 0; i < parts.length; i++) {
              const outDoc = await PDFDocument.create();
              const pages = await outDoc.copyPages(src, parts[i]);
              for (const p of pages) outDoc.addPage(p);
              const outBytes = new Uint8Array(await outDoc.save());
              const blob = new Blob([toArrayBuffer(outBytes)], { type: "application/pdf" });
              outputs.push({
                url: URL.createObjectURL(blob),
                name: `${baseName(file.name)}.part-${i + 1}.pdf`,
                bytes: outBytes,
              });
            }
          }
          // Return first output's bytes as the "outputBytes" for the audit report hash
          const outputBytes = outputs[0]?.bytes ?? new Uint8Array(0);
          return { outputBytes, outputs };
        },
      });
      incrementToolUse(me, "split");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool report shape
      setOuts((result as any).outputs);
      setAuditReport(report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Split failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Split PDF">
        <div className="space-y-4">
          <PdfDropZone
            label="Choose a PDF"
            help="Drag & drop a PDF here, or click to browse."
            files={file ? [file] : []}
            onFiles={(files) => setFile(files[0] ?? null)}
            disabled={busy}
          />

          <div className="flex flex-wrap gap-2 text-xs">
            <label className="flex items-center gap-2 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-2 text-[var(--ui-text-secondary)]">
              <input
                type="radio"
                name="mode"
                checked={mode === "ranges"}
                onChange={() => setMode("ranges")}
              />
              Ranges
            </label>
            <label className="flex items-center gap-2 rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-2 text-[var(--ui-text-secondary)]">
              <input
                type="radio"
                name="mode"
                checked={mode === "perPage"}
                onChange={() => setMode("perPage")}
              />
              One per page
            </label>
          </div>

          {mode === "ranges" ? (
            <div className="space-y-2">
              <div className="text-xs text-[var(--ui-text-muted)]">
                Examples: <span className="font-mono">1-3,5,7-9</span> or{" "}
                <span className="font-mono">1-</span>
              </div>
              <input
                value={ranges}
                onChange={(e) => setRanges(e.target.value)}
                className="w-full rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-2 text-sm text-[var(--ui-text)] placeholder:text-[var(--ui-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ui-focus)]"
                spellCheck={false}
              />
            </div>
          ) : null}

          <div className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg)] p-3 text-[15px] text-[var(--ui-text-secondary)]">
            <div className="font-semibold text-[var(--ui-text)]">Preflight</div>
            <div className="mt-1">
              {pageCountError
                ? pageCountError
                : pageCount == null
                  ? "Load a PDF to estimate output volume."
                  : `Detected ${pageCount} pages.`}
            </div>
            {pageCount != null && mode === "perPage" ? (
              <div className="mt-1">
                Output estimate: {pageCount} files (limit {MAX_PER_PAGE_OUTPUTS}).
              </div>
            ) : null}
            {pageCount != null && mode === "ranges" ? (
              <div className="mt-1">
                {rangePreview.error
                  ? `Range issue: ${rangePreview.error}`
                  : `Output estimate: ${rangePreview.outputs} file(s), ${rangePreview.selectedPages} selected pages (part limit ${MAX_RANGE_PARTS}).`}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={split} disabled={!file || busy}>
              {busy ? "Splitting…" : "Split"}
            </Button>
          </div>
        </div>
      </Card>

      {auditReport ? <AuditBadge report={auditReport} /> : null}
      <ResultDownloadPanel title="Downloads" files={outs} zipName="split-outputs.zip" />

      {error ? (
        <Card title="Error">
          <div className="text-sm text-red-700">{error}</div>
        </Card>
      ) : null}
    </div>
  );
}

function baseName(name: string): string {
  return name.toLowerCase().endsWith(".pdf") ? name.slice(0, -4) : name;
}
