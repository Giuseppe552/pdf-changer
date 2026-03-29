import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { PdfDropZone } from "../../components/PdfDropZone";
import { rotatePdf } from "../../../utils/pdf/operations/rotatePdf";
import { canUseTool, incrementToolUse } from "../../../utils/usageV2";
import { toArrayBuffer } from "../../../utils/toArrayBuffer";
import { ResultDownloadPanel } from "./components/ResultDownloadPanel";
import { processAudited } from "../../../utils/vpe/processAudited";
import type { AuditReport } from "../../../utils/vpe/types";
import { AuditBadge } from "../../components/vpe/AuditBadge";
import { ProcessingIndicator } from "../../components/ProcessingIndicator";

type AngleChoice = 90 | 180 | 270;
type ApplyTo = "all" | "range";

export function RotateToolPage() {
  const { me } = useAuth();
  const [file, setFile] = React.useState<File | null>(null);
  const [angleDegrees, setAngleDegrees] = React.useState<AngleChoice>(90);
  const [applyTo, setApplyTo] = React.useState<ApplyTo>("all");
  const [pageRanges, setPageRanges] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [out, setOut] = React.useState<{ url: string; name: string } | null>(null);
  const [summary, setSummary] = React.useState<{ rotated: number; total: number } | null>(null);
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
      if (!canUseTool(me, "rotate")) {
        throw new Error("Monthly quota reached for this tool.");
      }
      const inputBytes = new Uint8Array(await file.arrayBuffer());
      const { outputBytes, toolReport, auditReport: report } = await processAudited({
        toolName: "rotate",
        inputBytes,
        processFn: async (bytes) => rotatePdf({ inputBytes: bytes, angleDegrees, pageRanges: applyTo === "all" ? "" : pageRanges }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool report shape
      const output = toolReport as any;
      setAuditReport(report);
      const blob = new Blob([toArrayBuffer(outputBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      incrementToolUse(me, "rotate");
      setOut({ url, name: `${baseName(file.name)}.rotated.pdf` });
      setSummary({ rotated: output.rotatedCount, total: output.pageCount });
    } catch (value) {
      setError(value instanceof Error ? value.message : "Rotation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Rotate PDF">
        <div className="space-y-4">
          <PdfDropZone
            label="Choose a PDF"
            help="Rotate all or selected pages by 90, 180, or 270 degrees."
            files={file ? [file] : []}
            onFiles={(files) => setFile(files[0] ?? null)}
            disabled={busy}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <div className="text-sm text-[var(--ui-text-secondary)]">Rotation angle</div>
              <select
                value={angleDegrees}
                onChange={(e) => setAngleDegrees(Number(e.target.value) as AngleChoice)}
                className="w-full rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-2 text-sm text-[var(--ui-text)]"
                disabled={busy}
              >
                <option value={90}>90° clockwise</option>
                <option value={180}>180°</option>
                <option value={270}>90° counter-clockwise</option>
              </select>
            </label>
            <label className="space-y-1">
              <div className="text-sm text-[var(--ui-text-secondary)]">Apply to</div>
              <select
                value={applyTo}
                onChange={(e) => setApplyTo(e.target.value as ApplyTo)}
                className="w-full rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-2 text-sm text-[var(--ui-text)]"
                disabled={busy}
              >
                <option value="all">All pages</option>
                <option value="range">Specific pages</option>
              </select>
            </label>
          </div>
          {applyTo === "range" ? (
            <label className="space-y-1">
              <div className="text-sm text-[var(--ui-text-secondary)]">
                Page ranges (example: 1,3-5,9-)
              </div>
              <input
                value={pageRanges}
                onChange={(e) => setPageRanges(e.target.value)}
                className="w-full rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-2 text-sm text-[var(--ui-text)]"
                disabled={busy}
                spellCheck={false}
              />
            </label>
          ) : null}
          <Button onClick={run} disabled={!file || busy}>
            {busy ? "Rotating…" : "Rotate pages"}
          </Button>
        </div>
      </Card>

      {busy && <ProcessingIndicator label="Rotating" />}

      {summary ? (
        <Card title="Result summary">
          <div className="text-[15px] text-[var(--ui-text-secondary)]">
            Rotated {summary.rotated} of {summary.total} pages.
          </div>
        </Card>
      ) : null}

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
