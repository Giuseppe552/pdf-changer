import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { PdfDropZone } from "../../components/PdfDropZone";
import { unlockPdf } from "../../../utils/pdf/operations/unlockPdf";
import { canUseTool, incrementToolUse } from "../../../utils/usageV2";
import { toArrayBuffer } from "../../../utils/toArrayBuffer";
import { ResultDownloadPanel } from "./components/ResultDownloadPanel";
import { processAudited } from "../../../utils/vpe/processAudited";
import type { AuditReport } from "../../../utils/vpe/types";
import { AuditBadge } from "../../components/vpe/AuditBadge";

export function UnlockToolPage() {
  const { me } = useAuth();
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [out, setOut] = React.useState<{ url: string; name: string } | null>(null);
  const [encryptedState, setEncryptedState] = React.useState<string | null>(null);
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
    setEncryptedState(null);
    try {
      if (!canUseTool(me, "unlock")) {
        throw new Error("Monthly heavy quota reached for this device.");
      }
      const inputBytes = new Uint8Array(await file.arrayBuffer());
      const { outputBytes, toolReport, auditReport: report } = await processAudited({
        toolName: "unlock",
        inputBytes,
        processFn: async (bytes) => unlockPdf({ inputBytes: bytes }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool report shape
      const output = toolReport as any;
      setAuditReport(report);
      const blob = new Blob([toArrayBuffer(outputBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      incrementToolUse(me, "unlock");
      setOut({ url, name: `${baseName(file.name)}.unlocked.pdf` });
      setEncryptedState(
        output.wasEncrypted
          ? "Input appeared encrypted. Output rebuild completed."
          : "Input did not report encryption; output was rebuilt.",
      );
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unlock failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Unlock PDF (Authorized Access Only)">
        <div className="space-y-4">
          <PdfDropZone
            label="Choose a PDF"
            help="Only use this on files you are authorized to process."
            files={file ? [file] : []}
            onFiles={(files) => setFile(files[0] ?? null)}
            disabled={busy}
          />
          <div className="rounded-sm border border-neutral-300 bg-neutral-50 p-3 text-[15px] text-neutral-700">
            This beta path performs a local PDF rebuild only. It does not ask for a
            password because the current local engine cannot decrypt locked files via
            password entry.
          </div>
          <Button onClick={run} disabled={!file || busy}>
            {busy ? "Rebuilding…" : "Unlock / rebuild"}
          </Button>
        </div>
      </Card>

      {encryptedState ? (
        <Card title="Result note">
          <div className="text-[15px] text-neutral-800">{encryptedState}</div>
        </Card>
      ) : null}

      {auditReport ? <AuditBadge report={auditReport} /> : null}
      {out ? <ResultDownloadPanel files={[out]} /> : null}

      <Card title="Limitations" variant="warning">
        <ul className="list-inside list-disc space-y-1 text-[15px] text-neutral-800">
          <li>This does not bypass legal access controls or ownership rights.</li>
          <li>
            Password-encrypted documents may fail and require dedicated decrypt support.
          </li>
          <li>Use only on files you are explicitly authorized to process.</li>
        </ul>
      </Card>

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
