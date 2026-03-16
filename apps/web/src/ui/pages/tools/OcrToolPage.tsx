import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { PdfDropZone } from "../../components/PdfDropZone";
import { Surface } from "../../components/Surface";
import { ocrPdf, type OcrPdfOutput } from "../../../utils/pdf/operations/ocrPdf";
import { canUseTool, incrementToolUse } from "../../../utils/usageV2";
import { ResultDownloadPanel } from "./components/ResultDownloadPanel";

const LANGUAGES = [
  { value: "eng", label: "English" },
  { value: "spa", label: "Spanish" },
  { value: "fra", label: "French" },
  { value: "deu", label: "German" },
  { value: "ita", label: "Italian" },
  { value: "por", label: "Portuguese" },
  { value: "nld", label: "Dutch" },
  { value: "pol", label: "Polish" },
  { value: "rus", label: "Russian" },
  { value: "jpn", label: "Japanese" },
  { value: "chi_sim", label: "Chinese (Simplified)" },
  { value: "kor", label: "Korean" },
  { value: "ara", label: "Arabic" },
];

export function OcrToolPage() {
  const { me } = useAuth();
  const [file, setFile] = React.useState<File | null>(null);
  const [language, setLanguage] = React.useState("eng");
  const [maxPages, setMaxPages] = React.useState(20);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<{ current: number; total: number } | null>(null);
  const [result, setResult] = React.useState<OcrPdfOutput | null>(null);
  const [textFileUrl, setTextFileUrl] = React.useState<string | null>(null);

  React.useEffect(
    () => () => {
      if (textFileUrl) URL.revokeObjectURL(textFileUrl);
    },
    [textFileUrl],
  );

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress(null);
    if (textFileUrl) URL.revokeObjectURL(textFileUrl);
    setTextFileUrl(null);
    try {
      if (!canUseTool(me, "ocr")) {
        throw new Error("Monthly quota reached for this tool.");
      }
      const pdfBytes = new Uint8Array(await file.arrayBuffer());
      const output = await ocrPdf({
        pdfBytes,
        language,
        maxPages,
        onProgress: (current, total) => setProgress({ current, total }),
      });
      incrementToolUse(me, "ocr");
      setResult(output);
      const blob = new Blob([output.fullText], { type: "text/plain" });
      setTextFileUrl(URL.createObjectURL(blob));
    } catch (value) {
      setError(value instanceof Error ? value.message : "OCR failed");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const inputCls =
    "w-full rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-2 text-sm text-[var(--ui-text)]";

  return (
    <div className="space-y-4">
      <Surface variant="emphasis" compact>
        <div className="text-[15px] text-[var(--ui-accent)]">
          OCR extracts text from scanned or image-based PDF pages using Tesseract.js.
          The first run for each language downloads a language data file (~2-15 MB).
          All processing happens in your browser.
        </div>
      </Surface>

      <Card title="OCR Text Recognition">
        <div className="space-y-4">
          <PdfDropZone
            label="Choose a PDF"
            help="Extract text from scanned or image-based PDF pages."
            files={file ? [file] : []}
            onFiles={(files) => setFile(files[0] ?? null)}
            disabled={busy}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <div className="text-sm text-[var(--ui-text-secondary)]">Language</div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={inputCls}
                disabled={busy}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <div className="text-sm text-[var(--ui-text-secondary)]">Max pages</div>
              <input
                type="number"
                min={1}
                max={100}
                value={maxPages}
                onChange={(e) => setMaxPages(Number(e.target.value))}
                className={inputCls}
                disabled={busy}
              />
            </label>
          </div>
          <Button onClick={run} disabled={!file || busy}>
            {busy ? "Running OCR…" : "Extract text"}
          </Button>
        </div>
      </Card>

      {progress ? (
        <Card title="Progress">
          <div className="space-y-2">
            <div className="text-[15px] text-[var(--ui-text-secondary)]">
              Processing page {progress.current} of {progress.total}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--ui-bg-overlay)]">
              <div
                className="h-full bg-[var(--ui-accent-hover)] transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        </Card>
      ) : null}

      {result ? (
        <>
          <Card title="OCR result">
            <div className="space-y-3">
              <div className="grid gap-2 text-[15px] text-[var(--ui-text-secondary)] md:grid-cols-3">
                <div>
                  <span className="font-semibold">Pages:</span> {result.pages.length}
                </div>
                <div>
                  <span className="font-semibold">Avg confidence:</span>{" "}
                  {result.averageConfidence.toFixed(1)}%
                </div>
                <div>
                  <span className="font-semibold">Characters:</span>{" "}
                  {result.fullText.length.toLocaleString()}
                </div>
              </div>
              <textarea
                readOnly
                value={result.fullText}
                rows={12}
                className="w-full rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg)] p-3 font-mono text-xs text-[var(--ui-text-secondary)]"
              />
            </div>
          </Card>
          {textFileUrl ? (
            <ResultDownloadPanel
              files={[{ url: textFileUrl, name: `${file ? baseName(file.name) : "ocr"}.txt` }]}
            />
          ) : null}
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
