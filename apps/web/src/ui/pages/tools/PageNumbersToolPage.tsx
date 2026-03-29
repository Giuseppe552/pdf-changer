import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { PdfDropZone } from "../../components/PdfDropZone";
import {
  pageNumbersPdf,
  type PageNumbersPosition,
} from "../../../utils/pdf/operations/pageNumbersPdf";
import { canUseTool, incrementToolUse } from "../../../utils/usageV2";
import { toArrayBuffer } from "../../../utils/toArrayBuffer";
import { ResultDownloadPanel } from "./components/ResultDownloadPanel";
import { processAudited } from "../../../utils/vpe/processAudited";
import type { AuditReport } from "../../../utils/vpe/types";
import { AuditBadge } from "../../components/vpe/AuditBadge";
import { ProcessingIndicator } from "../../components/ProcessingIndicator";

export function PageNumbersToolPage() {
  const { me } = useAuth();
  const [file, setFile] = React.useState<File | null>(null);
  const [startAt, setStartAt] = React.useState(1);
  const [position, setPosition] = React.useState<PageNumbersPosition>("bottom-right");
  const [fontSize, setFontSize] = React.useState(12);
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
      if (!canUseTool(me, "page-numbers")) {
        throw new Error("Monthly quota reached for this tool.");
      }
      const inputBytes = new Uint8Array(await file.arrayBuffer());
      const { outputBytes, toolReport, auditReport: report } = await processAudited({
        toolName: "page-numbers",
        inputBytes,
        processFn: async (bytes) => pageNumbersPdf({ inputBytes: bytes, startAt, position, fontSize }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool report shape
      const output = toolReport as any;
      setAuditReport(report);
      const blob = new Blob([toArrayBuffer(outputBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      incrementToolUse(me, "page-numbers");
      setOut({ url, name: `${baseName(file.name)}.numbered.pdf` });
    } catch (value) {
      setError(value instanceof Error ? value.message : "Page numbering failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Add Page Numbers">
        <div className="space-y-4">
          <PdfDropZone
            label="Choose a PDF"
            help="Apply sequential page numbers to all pages."
            files={file ? [file] : []}
            onFiles={(files) => setFile(files[0] ?? null)}
            disabled={busy}
          />
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1">
              <div className="text-sm text-[var(--ui-text-secondary)]">Start at</div>
              <input
                type="number"
                min={1}
                step={1}
                value={startAt}
                onChange={(event) => setStartAt(Number(event.target.value))}
                className="w-full rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-2 text-sm text-[var(--ui-text)]"
                disabled={busy}
              />
            </label>
            <label className="space-y-1">
              <div className="text-sm text-[var(--ui-text-secondary)]">Position</div>
              <select
                value={position}
                onChange={(event) => setPosition(event.target.value as PageNumbersPosition)}
                className="w-full rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-2 text-sm text-[var(--ui-text)]"
                disabled={busy}
              >
                <option value="bottom-right">Bottom right</option>
                <option value="bottom-center">Bottom center</option>
                <option value="bottom-left">Bottom left</option>
              </select>
            </label>
            <label className="space-y-1">
              <div className="text-sm text-[var(--ui-text-secondary)]">Font size</div>
              <input
                type="number"
                min={8}
                max={48}
                step={1}
                value={fontSize}
                onChange={(event) => setFontSize(Number(event.target.value))}
                className="w-full rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-2 text-sm text-[var(--ui-text)]"
                disabled={busy}
              />
            </label>
          </div>
          <Button onClick={run} disabled={!file || busy}>
            {busy ? "Applying…" : "Add page numbers"}
          </Button>
        </div>
      </Card>

      {busy && <ProcessingIndicator label="Adding page numbers" />}

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

