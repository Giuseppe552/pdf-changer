import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { PdfDropZone } from "../../components/PdfDropZone";
import { compressPdf } from "../../../utils/pdf/operations/compressPdf";
import { canUseTool, incrementToolUse } from "../../../utils/usageV2";
import { toArrayBuffer } from "../../../utils/toArrayBuffer";
import { ResultDownloadPanel } from "./components/ResultDownloadPanel";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function CompressToolPage() {
  const { me } = useAuth();
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    url: string;
    name: string;
    inputSizeBytes: number;
    outputSizeBytes: number;
    reductionRatio: number;
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
      if (!canUseTool(me, "compress")) {
        throw new Error("Monthly heavy quota reached for this device.");
      }
      const inputBytes = new Uint8Array(await file.arrayBuffer());
      const output = await compressPdf({ inputBytes });
      const blob = new Blob([toArrayBuffer(output.outputBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      incrementToolUse(me, "compress");
      setResult({
        url,
        name: `${baseName(file.name)}.compressed.pdf`,
        inputSizeBytes: output.inputSizeBytes,
        outputSizeBytes: output.outputSizeBytes,
        reductionRatio: output.reductionRatio,
      });
    } catch (value) {
      setError(value instanceof Error ? value.message : "Compression failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Compress PDF">
        <div className="space-y-4">
          <PdfDropZone
            label="Choose a PDF"
            help="Drag and drop a PDF to optimize file structure and reduce size."
            files={file ? [file] : []}
            onFiles={(files) => setFile(files[0] ?? null)}
            disabled={busy}
          />
          <Button onClick={run} disabled={!file || busy}>
            {busy ? "Compressing…" : "Compress locally"}
          </Button>
        </div>
      </Card>

      {result ? (
        <Card title="Compression report">
          <div className="grid gap-2 text-[15px] text-neutral-800 md:grid-cols-3">
            <div>
              <span className="font-semibold text-neutral-900">Input:</span>{" "}
              {formatBytes(result.inputSizeBytes)}
            </div>
            <div>
              <span className="font-semibold text-neutral-900">Output:</span>{" "}
              {formatBytes(result.outputSizeBytes)}
            </div>
            <div>
              <span className="font-semibold text-neutral-900">Change:</span>{" "}
              {(result.reductionRatio * 100).toFixed(1)}%
            </div>
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

