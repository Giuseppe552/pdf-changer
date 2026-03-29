import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { PdfDropZone } from "../../components/PdfDropZone";
import { Surface } from "../../components/Surface";
import { SignaturePad } from "../../components/SignaturePad";
import { signPdf } from "../../../utils/pdf/operations/signPdf";
import { canUseTool, incrementToolUse } from "../../../utils/usageV2";
import { toArrayBuffer } from "../../../utils/toArrayBuffer";
import { ResultDownloadPanel } from "./components/ResultDownloadPanel";
import { processAudited } from "../../../utils/vpe/processAudited";
import type { AuditReport } from "../../../utils/vpe/types";
import { AuditBadge } from "../../components/vpe/AuditBadge";
import { ProcessingIndicator } from "../../components/ProcessingIndicator";

type WidthChoice = 0.2 | 0.25 | 0.3 | 0.4 | 0.5;

export function SignToolPage() {
  const { me } = useAuth();
  const [file, setFile] = React.useState<File | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = React.useState<string | null>(null);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [xPos, setXPos] = React.useState(0.55);
  const [yPos, setYPos] = React.useState(0.85);
  const [widthFraction, setWidthFraction] = React.useState<WidthChoice>(0.3);
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
    if (!file || !signatureDataUrl) return;
    setBusy(true);
    setError(null);
    setOut(null);
    try {
      if (!canUseTool(me, "sign")) {
        throw new Error("Monthly quota reached for this tool.");
      }
      const inputBytes = new Uint8Array(await file.arrayBuffer());
      const { outputBytes, toolReport, auditReport: report } = await processAudited({
        toolName: "sign",
        inputBytes,
        processFn: async (bytes) => signPdf({ inputBytes: bytes, signaturePngDataUrl: signatureDataUrl, placement: { pageIndex, x: xPos, y: yPos, widthFraction } }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool report shape
      const output = toolReport as any;
      setAuditReport(report);
      const blob = new Blob([toArrayBuffer(outputBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      incrementToolUse(me, "sign");
      setOut({ url, name: `${baseName(file.name)}.signed.pdf` });
    } catch (value) {
      setError(value instanceof Error ? value.message : "Signing failed");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-2 text-sm text-[var(--ui-text)]";

  return (
    <div className="space-y-4">
      <Surface variant="emphasis" compact>
        <div className="text-[15px] text-[var(--ui-accent)]">
          This is a visual overlay, not a cryptographic digital signature — it does not prove
          who signed or whether the document was changed afterward.
        </div>
      </Surface>

      <Card title="Sign PDF">
        <div className="space-y-4">
          <PdfDropZone
            label="Choose a PDF"
            help="Draw a freehand signature and place it on any page."
            files={file ? [file] : []}
            onFiles={(files) => setFile(files[0] ?? null)}
            disabled={busy}
          />

          <div className="space-y-1">
            <div className="text-sm text-[var(--ui-text-secondary)]">Draw your signature</div>
            <SignaturePad
              onSignatureChange={setSignatureDataUrl}
              disabled={busy}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <div className="text-sm text-[var(--ui-text-secondary)]">Page number</div>
              <input
                type="number"
                min={1}
                step={1}
                value={pageIndex + 1}
                onChange={(e) => setPageIndex(Math.max(0, Number(e.target.value) - 1))}
                className={inputCls}
                disabled={busy}
              />
            </label>
            <label className="space-y-1">
              <div className="text-sm text-[var(--ui-text-secondary)]">Signature width</div>
              <select
                value={widthFraction}
                onChange={(e) => setWidthFraction(Number(e.target.value) as WidthChoice)}
                className={inputCls}
                disabled={busy}
              >
                <option value={0.2}>20% of page width</option>
                <option value={0.25}>25% of page width</option>
                <option value={0.3}>30% of page width</option>
                <option value={0.4}>40% of page width</option>
                <option value={0.5}>50% of page width</option>
              </select>
            </label>
            <label className="space-y-1">
              <div className="text-sm text-[var(--ui-text-secondary)]">
                Horizontal position ({Math.round(xPos * 100)}%)
              </div>
              <input
                type="range"
                min={0}
                max={0.9}
                step={0.01}
                value={xPos}
                onChange={(e) => setXPos(Number(e.target.value))}
                className="w-full"
                disabled={busy}
              />
            </label>
            <label className="space-y-1">
              <div className="text-sm text-[var(--ui-text-secondary)]">
                Vertical position ({Math.round(yPos * 100)}%)
              </div>
              <input
                type="range"
                min={0}
                max={0.95}
                step={0.01}
                value={yPos}
                onChange={(e) => setYPos(Number(e.target.value))}
                className="w-full"
                disabled={busy}
              />
            </label>
          </div>

          <Button onClick={run} disabled={!file || !signatureDataUrl || busy}>
            {busy ? "Signing…" : "Place signature"}
          </Button>
        </div>
      </Card>

      {busy && <ProcessingIndicator label="Applying signature" />}

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
