import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { Card } from "../../components/Card";
import { ProcessingIndicator } from "../../components/ProcessingIndicator";
import { Button } from "../../components/Button";
import { PdfDropZone } from "../../components/PdfDropZone";
import { Surface } from "../../components/Surface";
import { RedactionCanvas, type RedactionRectUI } from "../../components/RedactionCanvas";
import { pdfToImage } from "../../../utils/pdf/operations/pdfToImage";
import { redactPdf, type RedactionRect } from "../../../utils/pdf/operations/redactPdf";
import { canUseTool, incrementToolUse } from "../../../utils/usageV2";
import { toArrayBuffer } from "../../../utils/toArrayBuffer";
import { ResultDownloadPanel } from "./components/ResultDownloadPanel";
import { processAudited } from "../../../utils/vpe/processAudited";
import type { AuditReport } from "../../../utils/vpe/types";
import { AuditBadge } from "../../components/vpe/AuditBadge";

type PagePreview = { pageIndex: number; dataUrl: string; width: number; height: number };

type State = "idle" | "loading" | "marking" | "burning" | "done";

let nextRectId = 0;

export function RedactToolPage() {
  const { me } = useAuth();
  const [file, setFile] = React.useState<File | null>(null);
  const [state, setState] = React.useState<State>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [pages, setPages] = React.useState<PagePreview[]>([]);
  const [selectedPage, setSelectedPage] = React.useState<number | null>(null);
  const [redactions, setRedactions] = React.useState<Map<number, RedactionRectUI[]>>(new Map());
  const [result, setResult] = React.useState<{
    url: string;
    name: string;
    pageCount: number;
    redactedPageCount: number;
  } | null>(null);
  const [auditReport, setAuditReport] = React.useState<AuditReport | null>(null);

  React.useEffect(
    () => () => {
      if (result?.url) URL.revokeObjectURL(result.url);
    },
    [result],
  );

  async function loadPdf() {
    if (!file) return;
    setState("loading");
    setError(null);
    setPages([]);
    setRedactions(new Map());
    setSelectedPage(null);
    setResult(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const output = await pdfToImage({
        pdfBytes: bytes,
        format: "png",
        scale: 1,
        maxPages: 200,
      });
      const previews: PagePreview[] = output.images.map((img) => {
        const image = new Image();
        image.src = img.dataUrl;
        return {
          pageIndex: img.pageIndex,
          dataUrl: img.dataUrl,
          width: image.width || 612,
          height: image.height || 792,
        };
      });
      setPages(previews);
      setState("marking");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load PDF");
      setState("idle");
    }
  }

  function addRedaction(pageIndex: number, rect: Omit<RedactionRectUI, "id">) {
    const id = `r-${++nextRectId}`;
    setRedactions((prev) => {
      const next = new Map(prev);
      const list = [...(next.get(pageIndex) ?? []), { ...rect, id }];
      next.set(pageIndex, list);
      return next;
    });
  }

  function removeRedaction(pageIndex: number, id: string) {
    setRedactions((prev) => {
      const next = new Map(prev);
      const list = (next.get(pageIndex) ?? []).filter((r) => r.id !== id);
      if (list.length === 0) next.delete(pageIndex);
      else next.set(pageIndex, list);
      return next;
    });
  }

  async function burn() {
    if (!file) return;
    if (!canUseTool(me, "redact")) {
      setError("Monthly heavy quota reached for this device.");
      return;
    }
    setState("burning");
    setError(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const allRedactions: RedactionRect[] = [];
      for (const [pageIndex, rects] of redactions) {
        for (const r of rects) {
          allRedactions.push({
            pageIndex,
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
          });
        }
      }
      const { outputBytes, toolReport, auditReport: report } = await processAudited({
        toolName: "redact",
        inputBytes: bytes,
        processFn: async (b) => redactPdf({ pdfBytes: b, redactions: allRedactions, dpi: 200, flattenAll: true }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool report shape
      const output = toolReport as any;
      setAuditReport(report);
      const blob = new Blob([toArrayBuffer(outputBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      incrementToolUse(me, "redact");
      setResult({
        url,
        name: `${baseName(file.name)}.redacted.pdf`,
        pageCount: output.pageCount,
        redactedPageCount: output.redactedPageCount,
      });
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Redaction failed");
      setState("marking");
    }
  }

  const totalRedactions = Array.from(redactions.values()).reduce((s, r) => s + r.length, 0);
  const activePage = selectedPage !== null ? pages.find((p) => p.pageIndex === selectedPage) : null;
  const activeRedactions = selectedPage !== null ? redactions.get(selectedPage) ?? [] : [];

  return (
    <div className="space-y-4">
      <Surface variant="warning" compact>
        <div className="text-[15px] text-amber-300">
          Burned redactions are irreversible. All pages are rasterized for uniformity.
          Text under redacted areas is permanently destroyed.
        </div>
      </Surface>

      {state === "idle" ? (
        <Card title="Visual Redaction">
          <div className="space-y-4">
            <PdfDropZone
              label="Choose a PDF to redact"
              help="Draw black-out boxes on pages, then burn them permanently."
              files={file ? [file] : []}
              onFiles={(files) => setFile(files[0] ?? null)}
            />
            <Button onClick={loadPdf} disabled={!file}>
              Load pages
            </Button>
          </div>
        </Card>
      ) : null}

      {state === "loading" ? (
        <Card title="Loading pages...">
          <div className="text-[15px] text-[var(--ui-text-muted)]">Rendering page thumbnails...</div>
        </Card>
      ) : null}

      {state === "marking" || state === "burning" ? (
        <>
          <Card title="Mark redactions">
            <div className="space-y-3">
              <div className="text-[15px] text-[var(--ui-text-secondary)]">
                Click a page thumbnail to mark redaction areas.{" "}
                <span className="font-semibold">{totalRedactions}</span> redaction(s) marked.
              </div>
              <div className="flex flex-wrap gap-2">
                {pages.map((p) => (
                  <button
                    key={p.pageIndex}
                    className={[
                      "relative h-24 w-16 overflow-hidden border-2 transition",
                      selectedPage === p.pageIndex
                        ? "border-[var(--ui-accent)]"
                        : "border-[var(--ui-border)] hover:border-[var(--ui-border-strong)]",
                    ].join(" ")}
                    onClick={() => setSelectedPage(p.pageIndex)}
                  >
                    <img
                      src={p.dataUrl}
                      alt={`Page ${p.pageIndex + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 text-center text-[10px] text-white">
                      {p.pageIndex + 1}
                      {(redactions.get(p.pageIndex)?.length ?? 0) > 0
                        ? ` (${redactions.get(p.pageIndex)!.length})`
                        : ""}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {activePage ? (
            <Card title={`Page ${activePage.pageIndex + 1} — Draw to redact, click red area to remove`}>
              <RedactionCanvas
                imageDataUrl={activePage.dataUrl}
                pageWidth={activePage.width}
                pageHeight={activePage.height}
                redactions={activeRedactions}
                onAdd={(rect) => addRedaction(activePage.pageIndex, rect)}
                onRemove={(id) => removeRedaction(activePage.pageIndex, id)}
              />
            </Card>
          ) : null}

          <div className="flex gap-3">
            <Button
              onClick={burn}
              disabled={totalRedactions === 0 || state === "burning"}
            >
              {state === "burning" ? "Burning redactions…" : "Burn redactions"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setState("idle");
                setPages([]);
                setRedactions(new Map());
                setSelectedPage(null);
              }}
              disabled={state === "burning"}
            >
              Start over
            </Button>
          </div>
        </>
      ) : null}

      {state === "burning" && <ProcessingIndicator label="Burning redactions into the document" />}

      {state === "done" && result ? (
        <>
          <Card title="Redaction report">
            <div className="grid gap-2 text-[15px] text-[var(--ui-text-secondary)] md:grid-cols-2">
              <div>
                <span className="font-semibold text-[var(--ui-text)]">Pages:</span>{" "}
                {result.pageCount} rasterized
              </div>
              <div>
                <span className="font-semibold text-[var(--ui-text)]">Redacted pages:</span>{" "}
                {result.redactedPageCount} with black-out areas
              </div>
            </div>
          </Card>
          {auditReport ? <AuditBadge report={auditReport} /> : null}
          <ResultDownloadPanel files={[{ url: result.url, name: result.name }]} />
        </>
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
