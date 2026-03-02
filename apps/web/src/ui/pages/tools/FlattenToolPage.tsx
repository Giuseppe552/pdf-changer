import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { PdfDropZone } from "../../components/PdfDropZone";
import { Surface } from "../../components/Surface";
import { flattenToImagePdf } from "../../../utils/pdf/operations/flattenToImagePdf";
import { canUseTool, incrementToolUse } from "../../../utils/usageV2";
import { toArrayBuffer } from "../../../utils/toArrayBuffer";
import { ResultDownloadPanel } from "./components/ResultDownloadPanel";

const DPI_OPTIONS = [72, 150, 200, 300] as const;

export function FlattenToolPage() {
  const { me } = useAuth();
  const [file, setFile] = React.useState<File | null>(null);
  const [dpi, setDpi] = React.useState<number>(150);
  const [format, setFormat] = React.useState<"png" | "jpeg">("png");
  const [quality, setQuality] = React.useState(0.92);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    url: string;
    name: string;
    pageCount: number;
  } | null>(null);

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
    try {
      if (!canUseTool(me, "flatten")) {
        throw new Error("Monthly heavy quota reached for this device.");
      }
      const inputBytes = new Uint8Array(await file.arrayBuffer());
      const output = await flattenToImagePdf({
        pdfBytes: inputBytes,
        dpi,
        format,
        jpegQuality: quality,
      });
      const blob = new Blob([toArrayBuffer(output.outputBytes)], {
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
    }
  }

  return (
    <div className="space-y-4">
      <Surface variant="warning" compact>
        <div className="text-[15px] text-amber-900">
          This tool rasterizes every page, destroying all hidden structure (fonts,
          layers, metadata, embedded files, scripts, form data, EXIF). Text will
          become non-selectable. This is the nuclear option for maximum privacy.
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
              <label className="text-sm font-semibold text-neutral-900">DPI</label>
              <select
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
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
              <label className="text-sm font-semibold text-neutral-900">Format</label>
              <select
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
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
                <label className="text-sm font-semibold text-neutral-900">
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

      {result ? (
        <Card title="Flatten report">
          <div className="text-[15px] text-neutral-800">
            <span className="font-semibold text-neutral-900">Pages:</span>{" "}
            {result.pageCount} rasterized. All metadata cleared. Text is non-selectable.
          </div>
        </Card>
      ) : null}

      {result ? (
        <ResultDownloadPanel files={[{ url: result.url, name: result.name }]} />
      ) : null}

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
