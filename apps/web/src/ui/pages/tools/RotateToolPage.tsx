import React from "react";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { PdfDropZone } from "../../components/PdfDropZone";
import { rotatePdf } from "../../../utils/pdf/operations/rotatePdf";
import { canUseTool, incrementToolUse } from "../../../utils/usageV2";
import { toArrayBuffer } from "../../../utils/toArrayBuffer";
import { ResultDownloadPanel } from "./components/ResultDownloadPanel";

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
      const output = await rotatePdf({
        inputBytes,
        angleDegrees,
        pageRanges: applyTo === "all" ? "" : pageRanges,
      });
      const blob = new Blob([toArrayBuffer(output.outputBytes)], {
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
              <div className="text-sm text-neutral-700">Rotation angle</div>
              <select
                value={angleDegrees}
                onChange={(e) => setAngleDegrees(Number(e.target.value) as AngleChoice)}
                className="w-full rounded-sm border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                disabled={busy}
              >
                <option value={90}>90° clockwise</option>
                <option value={180}>180°</option>
                <option value={270}>90° counter-clockwise</option>
              </select>
            </label>
            <label className="space-y-1">
              <div className="text-sm text-neutral-700">Apply to</div>
              <select
                value={applyTo}
                onChange={(e) => setApplyTo(e.target.value as ApplyTo)}
                className="w-full rounded-sm border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
                disabled={busy}
              >
                <option value="all">All pages</option>
                <option value="range">Specific pages</option>
              </select>
            </label>
          </div>
          {applyTo === "range" ? (
            <label className="space-y-1">
              <div className="text-sm text-neutral-700">
                Page ranges (example: 1,3-5,9-)
              </div>
              <input
                value={pageRanges}
                onChange={(e) => setPageRanges(e.target.value)}
                className="w-full rounded-sm border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
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

      {summary ? (
        <Card title="Result summary">
          <div className="text-[15px] text-neutral-800">
            Rotated {summary.rotated} of {summary.total} pages.
          </div>
        </Card>
      ) : null}

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
