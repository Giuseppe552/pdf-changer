import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { PdfDropZone } from "../../components/PdfDropZone";
import { removePagesPdf } from "../../../utils/pdf/operations/removePagesPdf";
import { canUseTool, incrementToolUse } from "../../../utils/usageV2";
import { toArrayBuffer } from "../../../utils/toArrayBuffer";
import { ResultDownloadPanel } from "./components/ResultDownloadPanel";
import { processAudited } from "../../../utils/vpe/processAudited";
import type { AuditReport } from "../../../utils/vpe/types";
import { AuditBadge } from "../../components/vpe/AuditBadge";

export function RemovePagesToolPage() {
  const { me } = useAuth();
  const [file, setFile] = React.useState<File | null>(null);
  const [removeRanges, setRemoveRanges] = React.useState("1");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [out, setOut] = React.useState<{ url: string; name: string } | null>(null);
  const [summary, setSummary] = React.useState<{
    keptPages: number;
    removedPages: number;
  } | null>(null);
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
    setSummary(null);
    try {
      if (!canUseTool(me, "remove-pages")) {
        throw new Error("Monthly quota reached for this tool.");
      }
      const inputBytes = new Uint8Array(await file.arrayBuffer());
      const { outputBytes, toolReport, auditReport: report } = await processAudited({
        toolName: "remove-pages",
        inputBytes,
        processFn: async (bytes) => removePagesPdf({ inputBytes: bytes, removeRanges }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool report shape
      const output = toolReport as any;
      setAuditReport(report);
      const blob = new Blob([toArrayBuffer(outputBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      incrementToolUse(me, "remove-pages");
      setOut({ url, name: `${baseName(file.name)}.trimmed.pdf` });
      setSummary({
        keptPages: output.keptPages,
        removedPages: output.removedPages,
      });
    } catch (value) {
      setError(value instanceof Error ? value.message : "Page removal failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Remove Pages by Range">
        <div className="space-y-4">
          <PdfDropZone
            label="Choose a PDF"
            help="Remove the specified page ranges and export a trimmed PDF."
            files={file ? [file] : []}
            onFiles={(files) => setFile(files[0] ?? null)}
            disabled={busy}
          />
          <label className="space-y-1">
            <div className="text-sm text-neutral-700">
              Page ranges to remove (example: 1,3-5,9-)
            </div>
            <input
              value={removeRanges}
              onChange={(event) => setRemoveRanges(event.target.value)}
              className="w-full rounded-sm border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
              disabled={busy}
              spellCheck={false}
            />
          </label>
          <Button onClick={run} disabled={!file || busy}>
            {busy ? "Processing…" : "Remove pages"}
          </Button>
        </div>
      </Card>

      {summary ? (
        <Card title="Result summary">
          <div className="text-[15px] text-neutral-800">
            Removed {summary.removedPages} page(s), kept {summary.keptPages}.
          </div>
        </Card>
      ) : null}

      {auditReport ? <AuditBadge report={auditReport} /> : null}
      {out ? <ResultDownloadPanel files={[out]} /> : null}

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

