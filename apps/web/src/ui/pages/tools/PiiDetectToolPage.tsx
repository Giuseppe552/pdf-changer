import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { Card } from "../../components/Card";
import { ProcessingIndicator } from "../../components/ProcessingIndicator";
import { Button } from "../../components/Button";
import { PdfDropZone } from "../../components/PdfDropZone";
import { Surface } from "../../components/Surface";
import { pdfToImage } from "../../../utils/pdf/operations/pdfToImage";
import { redactPdf, type RedactionRect } from "../../../utils/pdf/operations/redactPdf";
import { detectPii, type PiiDetection, type PiiType } from "../../../utils/pdf/piiDetect";
import { loadNerModel, isNerModelLoaded } from "../../../utils/pdf/nerDetect";
import { canUseTool, incrementToolUse } from "../../../utils/usageV2";
import { toArrayBuffer } from "../../../utils/toArrayBuffer";
import { ResultDownloadPanel } from "./components/ResultDownloadPanel";
import { processAudited } from "../../../utils/vpe/processAudited";
import type { AuditReport } from "../../../utils/vpe/types";
import { AuditBadge } from "../../components/vpe/AuditBadge";

type PagePreview = { pageIndex: number; dataUrl: string; width: number; height: number };
type State = "idle" | "scanning" | "review" | "burning" | "done";

// Each detection gets an id + enabled flag for the review UI
type ReviewItem = PiiDetection & { id: string; enabled: boolean };

const TYPE_LABELS: Record<PiiType, string> = {
  ssn: "SSN",
  phone: "Phone number",
  email: "Email address",
  "credit-card": "Credit card",
  "date-of-birth": "Date of birth",
  "ip-address": "IP address",
  passport: "Passport number",
  person: "Person name",
  organization: "Organization",
  location: "Location",
};

const TYPE_COLORS: Record<PiiType, string> = {
  ssn: "#ef4444",
  phone: "#f59e0b",
  email: "#3b82f6",
  "credit-card": "#ef4444",
  "date-of-birth": "#a78bfa",
  "ip-address": "#6366f1",
  passport: "#ec4899",
  person: "#10b981",
  organization: "#14b8a6",
  location: "#8b5cf6",
};

const ALL_TYPES: PiiType[] = [
  "person", "organization", "location",
  "ssn", "phone", "email", "credit-card", "date-of-birth", "ip-address", "passport",
];

let nextId = 0;

export function PiiDetectToolPage() {
  const { me } = useAuth();
  const [file, setFile] = React.useState<File | null>(null);
  const [state, setState] = React.useState<State>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState("");
  const [pages, setPages] = React.useState<PagePreview[]>([]);
  const [selectedPage, setSelectedPage] = React.useState<number | null>(null);
  const [items, setItems] = React.useState<ReviewItem[]>([]);
  const [textExtracted, setTextExtracted] = React.useState(true);
  const [result, setResult] = React.useState<{
    url: string;
    name: string;
    pageCount: number;
    redactedPageCount: number;
  } | null>(null);
  const [auditReport, setAuditReport] = React.useState<AuditReport | null>(null);
  const [nerEnabled, setNerEnabled] = React.useState(false);
  const [nerLoading, setNerLoading] = React.useState(false);
  const [nerProgress, setNerProgress] = React.useState(0);
  const [nerReady, setNerReady] = React.useState(() => isNerModelLoaded());

  React.useEffect(
    () => () => { if (result?.url) URL.revokeObjectURL(result.url); },
    [result],
  );

  async function toggleNer() {
    if (nerReady) {
      setNerEnabled((v) => !v);
      return;
    }
    // First time: download and load the model
    setNerLoading(true);
    setNerProgress(0);
    try {
      await loadNerModel((p) => setNerProgress(p));
      setNerReady(true);
      setNerEnabled(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load AI model");
    } finally {
      setNerLoading(false);
    }
  }

  // --- actions ---

  async function scan() {
    if (!file) return;
    setState("scanning");
    setError(null);
    setItems([]);
    setPages([]);
    setSelectedPage(null);
    setResult(null);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());

      setProgress("Extracting text and scanning for PII...");
      const scanResult = await detectPii(bytes, (page, total) => {
        setProgress(`Scanning page ${page} of ${total}...`);
      });
      setTextExtracted(scanResult.textExtracted);

      const reviewItems: ReviewItem[] = scanResult.detections.map((d) => ({
        ...d,
        id: `pii-${++nextId}`,
        enabled: true,
      }));
      setItems(reviewItems);

      setProgress("Rendering page previews...");
      const output = await pdfToImage({ pdfBytes: new Uint8Array(bytes), format: "png", scale: 1, maxPages: 200 });
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
      setState("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
      setState("idle");
    }
  }

  function toggleItem(id: string) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, enabled: !it.enabled } : it));
  }

  function toggleType(type: PiiType) {
    setItems((prev) => {
      const ofType = prev.filter((it) => it.type === type);
      const allEnabled = ofType.every((it) => it.enabled);
      return prev.map((it) => it.type === type ? { ...it, enabled: !allEnabled } : it);
    });
  }

  function selectAll() { setItems((prev) => prev.map((it) => ({ ...it, enabled: true }))); }
  function deselectAll() { setItems((prev) => prev.map((it) => ({ ...it, enabled: false }))); }

  async function burn() {
    if (!file) return;
    if (!canUseTool(me, "pii-detect")) {
      setError("Monthly heavy quota reached for this device.");
      return;
    }
    setState("burning");
    setError(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const redactions: RedactionRect[] = items
        .filter((it) => it.enabled)
        .map((it) => it.rect);

      const { outputBytes, toolReport, auditReport: report } = await processAudited({
        toolName: "redact",
        inputBytes: bytes,
        processFn: async (b) =>
          redactPdf({ pdfBytes: b, redactions, dpi: 200, flattenAll: true }),
      });
      const output = toolReport as { pageCount: number; redactedPageCount: number };
      setAuditReport(report);
      const blob = new Blob([toArrayBuffer(outputBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      incrementToolUse(me, "pii-detect");
      setResult({
        url,
        name: `${baseName(file.name)}.redacted.pdf`,
        pageCount: output.pageCount,
        redactedPageCount: output.redactedPageCount,
      });
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Redaction failed");
      setState("review");
    }
  }

  // --- derived state ---

  const enabledCount = items.filter((it) => it.enabled).length;
  const typeCounts = new Map<PiiType, { total: number; enabled: number }>();
  for (const it of items) {
    const c = typeCounts.get(it.type) ?? { total: 0, enabled: 0 };
    c.total++;
    if (it.enabled) c.enabled++;
    typeCounts.set(it.type, c);
  }
  const activeTypes = ALL_TYPES.filter((t) => typeCounts.has(t));
  const activePageItems = items.filter((it) => selectedPage !== null && it.pageIndex === selectedPage);
  const activePage = selectedPage !== null ? pages.find((p) => p.pageIndex === selectedPage) : null;

  // --- render ---

  return (
    <div className="space-y-4">
      <Surface compact>
        <div className="text-[15px] text-[var(--ui-text-secondary)]">
          Scans text in your PDF for sensitive data patterns (SSNs, phone numbers, emails, credit
          cards). Everything runs in your browser — the file is never uploaded.
        </div>
      </Surface>

      {/* IDLE: file picker */}
      {state === "idle" && (
        <Card title="PII Detection">
          <div className="space-y-4">
            <PdfDropZone
              label="Choose a PDF to scan"
              help="Drop a document and we'll highlight sensitive data for review."
              files={file ? [file] : []}
              onFiles={(files) => setFile(files[0] ?? null)}
            />
            {/* NER model toggle */}
            <div className="flex items-center gap-3 rounded-md border border-[var(--ui-border)] px-4 py-3">
              <input
                type="checkbox"
                checked={nerEnabled}
                onChange={toggleNer}
                disabled={nerLoading}
                className="h-4 w-4 rounded accent-[var(--ui-accent)]"
                id="ner-toggle"
              />
              <label htmlFor="ner-toggle" className="flex-1 cursor-pointer">
                <div className="text-[14px] font-medium text-[var(--ui-text)]">
                  AI name detection
                  {nerReady && <span className="ml-2 text-[11px] text-emerald-400">ready</span>}
                </div>
                <div className="text-[12px] text-[var(--ui-text-muted)]">
                  {nerLoading
                    ? `Downloading model... ${nerProgress}%`
                    : nerReady
                      ? "BERT NER model loaded. Detects person names, organizations, and locations."
                      : "Downloads a ~65 MB AI model on first use (cached after). Detects person names, organizations, and locations that regex can't catch."}
                </div>
              </label>
            </div>

            <Button onClick={scan} disabled={!file || nerLoading}>Scan for PII</Button>
          </div>
        </Card>
      )}

      {/* SCANNING: progress */}
      {state === "scanning" && (
        <Card title="Scanning...">
          <ProcessingIndicator label={progress} />
        </Card>
      )}

      {/* REVIEW: the main UI */}
      {(state === "review" || state === "burning") && (
        <>
          {!textExtracted && (
            <Surface variant="warning" compact>
              <div className="text-[15px] text-amber-300">
                No text layer found. This PDF may be image-only. Try the OCR tool first to extract
                text, then re-scan.
              </div>
            </Surface>
          )}

          {items.length === 0 ? (
            <Card title="No PII detected">
              <div className="text-[15px] text-[var(--ui-text-muted)]">
                No sensitive data patterns found in the text layer.
              </div>
              <div className="mt-3">
                <Button variant="secondary" onClick={() => setState("idle")}>Try another file</Button>
              </div>
            </Card>
          ) : (
            <>
              {/* Category toggles */}
              <Card title={`Found ${items.length} item${items.length !== 1 ? "s" : ""}`}>
                <div className="space-y-3">
                  <div className="text-[13px] text-[var(--ui-text-muted)]">
                    Toggle categories to include or exclude entire types. Then fine-tune individual items below.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeTypes.map((type) => {
                      const c = typeCounts.get(type)!;
                      const allOn = c.enabled === c.total;
                      return (
                        <button
                          key={type}
                          onClick={() => toggleType(type)}
                          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors border"
                          style={{
                            borderColor: allOn ? TYPE_COLORS[type] : "var(--ui-border)",
                            background: allOn ? `${TYPE_COLORS[type]}18` : "transparent",
                            color: allOn ? TYPE_COLORS[type] : "var(--ui-text-muted)",
                          }}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-sm"
                            style={{ background: allOn ? TYPE_COLORS[type] : "var(--ui-border)" }}
                          />
                          {c.total} {TYPE_LABELS[type]}{c.total !== 1 ? "s" : ""}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 text-[12px]">
                    <button onClick={selectAll} className="text-[var(--ui-accent)] hover:underline">Select all</button>
                    <span className="text-[var(--ui-border)]">·</span>
                    <button onClick={deselectAll} className="text-[var(--ui-text-muted)] hover:underline">Deselect all</button>
                  </div>
                </div>
              </Card>

              {/* Detection list */}
              <Card title="Review detections">
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {items.map((it) => (
                    <label
                      key={it.id}
                      className="flex items-start gap-3 rounded-md px-3 py-2 transition-colors hover:bg-[var(--ui-bg)] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={it.enabled}
                        onChange={() => toggleItem(it.id)}
                        className="mt-1 h-4 w-4 rounded accent-[var(--ui-accent)]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              background: `${TYPE_COLORS[it.type]}20`,
                              color: TYPE_COLORS[it.type],
                            }}
                          >
                            {TYPE_LABELS[it.type]}
                          </span>
                          <span className="text-[11px] text-[var(--ui-text-muted)]">
                            Page {it.pageIndex + 1}
                          </span>
                        </div>
                        <div className="mt-0.5 truncate font-mono text-[13px] text-[var(--ui-text)]">
                          {it.value}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </Card>

              {/* Page preview with overlay highlights */}
              <Card title="Page preview">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {pages.map((p) => {
                      const pageItems = items.filter((it) => it.pageIndex === p.pageIndex);
                      const enabledOnPage = pageItems.filter((it) => it.enabled).length;
                      return (
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
                          <img src={p.dataUrl} alt={`Page ${p.pageIndex + 1}`} className="h-full w-full object-cover" />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 text-center text-[10px] text-white">
                            {p.pageIndex + 1}
                            {enabledOnPage > 0 ? ` (${enabledOnPage})` : ""}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {activePage && (
                    <div className="relative inline-block max-w-full overflow-hidden rounded border border-[var(--ui-border)]">
                      <img
                        src={activePage.dataUrl}
                        alt="PDF page"
                        className="block max-h-[700px] w-auto"
                      />
                      {/* Colored overlay rectangles for enabled detections */}
                      {activePageItems.filter((it) => it.enabled).map((it) => (
                        <div
                          key={it.id}
                          className="absolute pointer-events-none"
                          style={{
                            left: `${it.rect.x * 100}%`,
                            top: `${it.rect.y * 100}%`,
                            width: `${it.rect.width * 100}%`,
                            height: `${it.rect.height * 100}%`,
                            background: `${TYPE_COLORS[it.type]}35`,
                            border: `2px solid ${TYPE_COLORS[it.type]}`,
                            borderRadius: 2,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {!activePage && pages.length > 0 && (
                    <div className="text-[13px] text-[var(--ui-text-muted)]">
                      Click a page thumbnail to preview detections.
                    </div>
                  )}
                </div>
              </Card>

              {/* Actions */}
              <div className="flex gap-3">
                <Button onClick={burn} disabled={enabledCount === 0 || state === "burning"}>
                  {state === "burning"
                    ? "Redacting…"
                    : `Redact ${enabledCount} item${enabledCount !== 1 ? "s" : ""}`}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setState("idle");
                    setPages([]);
                    setItems([]);
                    setSelectedPage(null);
                  }}
                  disabled={state === "burning"}
                >
                  Start over
                </Button>
              </div>
            </>
          )}
        </>
      )}

      {state === "burning" && <ProcessingIndicator label="Burning redactions into the document" />}

      {/* DONE: result */}
      {state === "done" && result && (
        <>
          <Card title="Redaction complete">
            <div className="grid gap-2 text-[15px] text-[var(--ui-text-secondary)] md:grid-cols-2">
              <div>
                <span className="font-semibold text-[var(--ui-text)]">Pages:</span>{" "}
                {result.pageCount} rasterized
              </div>
              <div>
                <span className="font-semibold text-[var(--ui-text)]">Redacted:</span>{" "}
                {enabledCount} item{enabledCount !== 1 ? "s" : ""} removed
              </div>
            </div>
          </Card>
          {auditReport ? <AuditBadge report={auditReport} /> : null}
          <ResultDownloadPanel files={[{ url: result.url, name: result.name }]} />
        </>
      )}

      {error && (
        <Card title="Error" variant="danger">
          <div className="text-[15px] text-red-300">{error}</div>
        </Card>
      )}
    </div>
  );
}

function baseName(name: string): string {
  return name.toLowerCase().endsWith(".pdf") ? name.slice(0, -4) : name;
}
