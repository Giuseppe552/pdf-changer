import React from "react";
import { NavLink } from "react-router-dom";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { InlineCode } from "../components/InlineCode";
import { Term } from "../components/Term";
import { useAuth } from "../auth/AuthContext";
import { canUseScrubber, incrementScrubUse, usageStatus } from "../../utils/usage";
import { deepScrubPdf } from "../../utils/pdf/deepScrub";
import { paranoidScrubPdf } from "../../utils/pdf/paranoidScrub";
import { bytesToHex } from "../../utils/hex";
import { toArrayBuffer } from "../../utils/toArrayBuffer";
import { processAudited } from "../../utils/vpe/processAudited";
import type { AuditReport } from "../../utils/vpe/types";
import { PdfDropZone } from "../components/PdfDropZone";
import { Surface } from "../components/Surface";
import { AuditBadge } from "../components/vpe/AuditBadge";

export function ScrubberPage() {
  const { me, loading } = useAuth();
  const [file, setFile] = React.useState<File | null>(null);
  const [paranoidMode, setParanoidMode] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    url: string;
    filename: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- scrub report shape varies by mode
    report: any;
    auditReport: AuditReport;
  } | null>(null);

  const status = usageStatus(me);
  const allowed = canUseScrubber(me);

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      if (!allowed) {
        throw new Error("Usage limit reached. Create a passkey account to continue.");
      }
      const inputBytes = new Uint8Array(await file.arrayBuffer());
      const { outputBytes, toolReport, auditReport } = await processAudited({
        toolName: paranoidMode ? "paranoid-scrub" : "deep-scrub",
        inputBytes,
        processFn: async (bytes) =>
          paranoidMode ? paranoidScrubPdf(bytes) : deepScrubPdf(bytes),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- scrub report shape varies
      const scrubReport = (toolReport as any).report ?? toolReport;
      const blob = new Blob([toArrayBuffer(outputBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const safeName = file.name.toLowerCase().endsWith(".pdf")
        ? file.name.slice(0, -4)
        : file.name;
      const filename = `${safeName}.scrubbed.pdf`;
      incrementScrubUse(me);
      setResult({ url, filename, report: scrubReport, auditReport });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scrub failed");
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    return () => {
      if (result?.url) URL.revokeObjectURL(result.url);
    };
  }, [result]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="ui-title">Deep Metadata Scrubber</h1>
        <p className="ui-subtitle max-w-3xl">
          Upload nothing. Process on device. Review the report before sharing.
        </p>
      </div>

      <Surface variant="emphasis" compact>
        <div className="text-[15px] text-neutral-800">
          Processing happens locally in your browser. Open{" "}
          <NavLink className="underline" to="/security">
            Security Hub
          </NavLink>{" "}
          for limits and safe workflow guidance.
        </div>
      </Surface>

      <Card
        title="Usage and plan"
        footer={
          <div className="text-sm text-neutral-600">
            Limits are privacy-first and local. Clearing site storage can reset
            counters.
          </div>
        }
      >
        <div className="space-y-1">
          <div>
            <span className="font-semibold text-neutral-900">Plan:</span> {me.plan}
          </div>
          <div>{status}</div>
        </div>
      </Card>

      <Card title="Choose a PDF">
        <div className="space-y-4">
          <PdfDropZone
            label="Choose a PDF file"
            help="Drag and drop a PDF, or click Browse. Processing stays on-device."
            files={file ? [file] : []}
            onFiles={(files) => setFile(files[0] ?? null)}
            disabled={busy}
          />
          <label className="flex items-center gap-2 text-sm text-neutral-800">
            <input
              type="checkbox"
              checked={paranoidMode}
              onChange={(e) => setParanoidMode(e.target.checked)}
              disabled={busy}
            />
            <span className="font-semibold">Paranoid mode</span>
            <span className="text-neutral-600">
              — also removes JavaScript, embedded files,{" "}
              <Term tip="Color profiles embedded by design software">ICC profiles</Term>,{" "}
              <Term tip="Unique file fingerprint that can track copies">document ID</Term>
            </span>
          </label>
          <div className="flex flex-wrap gap-3">
            <Button onClick={run} disabled={!file || busy || loading}>
              {busy ? "Scrubbing…" : paranoidMode ? "Paranoid scrub" : "Scrub locally"}
            </Button>
            <NavLink to="/security">
              <Button variant="secondary">Read security model</Button>
            </NavLink>
          </div>
          {!allowed ? (
            <div className="text-[15px] text-amber-800">
              Monthly quota reached on this device. Wait for reset or see{" "}
              <InlineCode>/pricing</InlineCode> for unlimited workflow usage.
            </div>
          ) : null}
        </div>
      </Card>

      {error ? (
        <Card title="Error" variant="danger">
          <div className="text-[15px] text-red-800">{error}</div>
        </Card>
      ) : null}

      {result ? (
        <Card
          title="Scrubbed file"
          footer={
            <div className="text-sm text-neutral-600">
              If your workflow requires integrity checks, verify input/output
              hashes before submission.
            </div>
          }
        >
          <div className="space-y-4">
            <a download={result.filename} href={result.url}>
              <Button>Download {result.filename}</Button>
            </a>
            <AuditBadge report={result.auditReport} />
            <ScrubReport report={result.report} />
          </div>
        </Card>
      ) : null}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- scrub report shape varies by mode
function ScrubReport({ report }: { report: any }) {
  return (
    <div className="space-y-3 text-[15px]">
      {report.exifStripReport &&
      (report.exifStripReport.jpegSegmentsStripped > 0 ||
        report.exifStripReport.pngChunksStripped > 0) ? (
        <Surface variant="emphasis" compact>
          Stripped {report.exifStripReport.jpegSegmentsStripped + report.exifStripReport.pngChunksStripped}{" "}
          <Term tip="Photo data: camera, date, location">EXIF</Term>/<Term tip="Caption and copyright fields">IPTC</Term>{" "}
          segments ({report.exifStripReport.bytesRemoved} bytes) from embedded images.
        </Surface>
      ) : report.exifWarning ? (
        <Surface variant="warning" compact>
          EXIF markers detected but could not be fully stripped. Consider using
          Flatten to Image for maximum protection.
        </Surface>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Surface compact>
          <div className="mb-2 text-sm font-semibold text-neutral-900">Input</div>
          <KeyValue k="Pages" v={String(report.pageCount ?? "—")} />
          <KeyValue k="SHA-256" v={bytesToHex(report.inputSha256)} mono />
        </Surface>
        <Surface compact>
          <div className="mb-2 text-sm font-semibold text-neutral-900">Output</div>
          <KeyValue k="SHA-256" v={bytesToHex(report.outputSha256)} mono />
          <KeyValue k="Dates" v={"2000-01-01T00:00:00Z"} />
        </Surface>
      </div>

      <Surface compact>
        <div className="mb-2 text-sm font-semibold text-neutral-900">
          Metadata (before)
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {Object.entries(report.metadataBefore ?? {}).map(([k, v]) => (
            <KeyValue key={k} k={k} v={String(v ?? "—")} />
          ))}
        </div>
      </Surface>

      <Surface compact>
        <div className="mb-2 text-sm font-semibold text-neutral-900">
          Scrub actions
        </div>
        <ul className="list-inside list-disc space-y-1 text-neutral-800">
          <li>Document Info fields cleared</li>
          <li><Term tip="Hidden metadata stream, often from Adobe software">XMP</Term> metadata removed</li>
          <li>Open actions and additional actions removed</li>
          <li>Forms removed</li>
          <li>Annotations removed (including hyperlinks)</li>
          <li>Embedded files removed</li>
          <li>PDF rebuilt (removes edit history leftovers)</li>
          <li>EXIF/IPTC metadata stripped from embedded images</li>
        </ul>
      </Surface>

      {report.fontWarning && report.customFontNames?.length > 0 ? (
        <Surface variant="warning" compact>
          <div className="text-[15px] text-amber-900">
            Custom <Term tip="Partial fonts with unique random prefixes">font subsets</Term> detected ({report.customFontNames.length} fonts).
            Font subsets can fingerprint the source application. Use{" "}
            <NavLink className="underline" to="/tools/flatten">
              Flatten to Image
            </NavLink>{" "}
            to destroy all font data.
          </div>
        </Surface>
      ) : null}

      {report.paranoid ? (
        <Surface compact>
          <div className="mb-2 text-sm font-semibold text-neutral-900">
            Paranoid actions
          </div>
          <ul className="list-inside list-disc space-y-1 text-neutral-800">
            {report.paranoid.javascriptRemoved ? <li>JavaScript entries removed</li> : null}
            {report.paranoid.embeddedFilesRemoved ? <li>Embedded files removed</li> : null}
            {report.paranoid.iccProfilesRemoved ? <li>ICC profiles removed</li> : null}
            {report.paranoid.idArrayRemoved ? <li>Document ID array removed</li> : null}
            {report.paranoid.producerNormalized ? <li>Producer normalized to "PDF"</li> : null}
          </ul>
        </Surface>
      ) : null}
    </div>
  );
}

function KeyValue({
  k,
  v,
  mono,
}: {
  k: string;
  v: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-sm text-neutral-600">{k}</div>
      <div
        className={`text-right text-sm text-neutral-900 ${mono ? "font-mono break-all" : ""}`}
      >
        {v}
      </div>
    </div>
  );
}
