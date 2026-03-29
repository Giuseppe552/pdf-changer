import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { PdfDropZone } from "../../components/PdfDropZone";
import { watermarkPdf } from "../../../utils/pdf/operations/watermarkPdf";
import { canUseTool, incrementToolUse } from "../../../utils/usageV2";
import { toArrayBuffer } from "../../../utils/toArrayBuffer";
import { ResultDownloadPanel } from "./components/ResultDownloadPanel";
import { processAudited } from "../../../utils/vpe/processAudited";
import type { AuditReport } from "../../../utils/vpe/types";
import { AuditBadge } from "../../components/vpe/AuditBadge";
import { ProcessingIndicator } from "../../components/ProcessingIndicator";

export function WatermarkToolPage() {
  const { me } = useAuth();
  const [file, setFile] = React.useState<File | null>(null);
  const [text, setText] = React.useState("CONFIDENTIAL");
  const [opacity, setOpacity] = React.useState(0.2);
  const [fontSize, setFontSize] = React.useState(48);
  const [angleDegrees, setAngleDegrees] = React.useState(-35);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [out, setOut] = React.useState<{ url: string; name: string } | null>(null);
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
    try {
      if (!canUseTool(me, "watermark")) {
        throw new Error("Monthly quota reached for this tool.");
      }
      const inputBytes = new Uint8Array(await file.arrayBuffer());
      const { outputBytes, toolReport, auditReport: report } = await processAudited({
        toolName: "watermark",
        inputBytes,
        processFn: async (bytes) => watermarkPdf({ inputBytes: bytes, text, opacity, fontSize, angleDegrees }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool report shape
      const output = toolReport as any;
      setAuditReport(report);
      const blob = new Blob([toArrayBuffer(outputBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      incrementToolUse(me, "watermark");
      setOut({ url, name: `${baseName(file.name)}.watermarked.pdf` });
    } catch (value) {
      setError(value instanceof Error ? value.message : "Watermark failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Add Watermark">
        <div className="space-y-4">
          <PdfDropZone
            label="Choose a PDF"
            help="Add text watermark to each page."
            files={file ? [file] : []}
            onFiles={(files) => setFile(files[0] ?? null)}
            disabled={busy}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <div className="text-sm text-[var(--ui-text-secondary)]">Watermark text</div>
              <input
                value={text}
                onChange={(event) => setText(event.target.value)}
                className="w-full rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-2 text-sm text-[var(--ui-text)]"
                disabled={busy}
              />
            </label>
            <label className="space-y-1">
              <div className="text-sm text-[var(--ui-text-secondary)]">Opacity (0.05–0.95)</div>
              <input
                type="number"
                min={0.05}
                max={0.95}
                step={0.05}
                value={opacity}
                onChange={(event) => setOpacity(Number(event.target.value))}
                className="w-full rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-2 text-sm text-[var(--ui-text)]"
                disabled={busy}
              />
            </label>
            <label className="space-y-1">
              <div className="text-sm text-[var(--ui-text-secondary)]">Font size</div>
              <input
                type="number"
                min={10}
                max={120}
                step={1}
                value={fontSize}
                onChange={(event) => setFontSize(Number(event.target.value))}
                className="w-full rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-2 text-sm text-[var(--ui-text)]"
                disabled={busy}
              />
            </label>
            <label className="space-y-1">
              <div className="text-sm text-[var(--ui-text-secondary)]">Angle (degrees)</div>
              <input
                type="number"
                min={-85}
                max={85}
                step={1}
                value={angleDegrees}
                onChange={(event) => setAngleDegrees(Number(event.target.value))}
                className="w-full rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-2 text-sm text-[var(--ui-text)]"
                disabled={busy}
              />
            </label>
          </div>
          <Button onClick={run} disabled={!file || busy}>
            {busy ? "Applying…" : "Apply watermark"}
          </Button>
        </div>
      </Card>

      {busy && <ProcessingIndicator label="Applying watermark" />}

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

