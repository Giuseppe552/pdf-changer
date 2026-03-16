import React, { useState, useCallback } from "react";
import { Card } from "../components/Card";
import { AuditReportPanel } from "../components/vpe/AuditReportPanel";
import { processAudited } from "../../utils/vpe/processAudited";
import type { AuditReport } from "../../utils/vpe/types";

type Verdict = "idle" | "running" | "pass" | "fail";

export function VerifyPage() {
  const [verdict, setVerdict] = useState<Verdict>("idle");
  const [error, setError] = useState<string | null>(null);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);

  React.useEffect(() => {
    document.title = "Verify · PDF Changer";
  }, []);

  const runTest = useCallback(async () => {
    setVerdict("running");
    setError(null);
    setAuditReport(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const { deepScrubPdf } = await import("../../utils/pdf/deepScrub");

      const samplePdf = await PDFDocument.create();
      samplePdf.addPage([200, 200]);
      const pdfBytes = await samplePdf.save();

      const { auditReport: report } = await processAudited({
        toolName: "verify-self-test",
        inputBytes: new Uint8Array(pdfBytes),
        processFn: async (bytes) => {
          const { outputBytes } = await deepScrubPdf(bytes);
          return { outputBytes };
        },
      });

      setAuditReport(report);
      setVerdict(report.verdict === "clean" ? "pass" : "fail");
    } catch (err) {
      setVerdict("fail");
      setError((err as Error).message);
    }
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Verify</h1>

      <Card title="Don't trust us. Verify.">
        <p className="text-[var(--ui-text-secondary)]">
          This page lets you prove our privacy claims yourself. Click the button
          below to create a sample PDF in memory, scrub it with our engine, and
          monitor every network request, CSP violation, and DOM injection that
          happens during processing.
        </p>
      </Card>

      <Card title="Network monitor test">
        <div className="space-y-4">
          <button
            onClick={runTest}
            disabled={verdict === "running"}
            className="rounded-sm border border-[var(--ui-border-strong)] bg-[var(--ui-bg-raised)] px-4 py-2 text-sm font-semibold text-[var(--ui-text-secondary)] transition hover:bg-[var(--ui-bg-overlay)] disabled:opacity-50"
          >
            {verdict === "running" ? "Running…" : "Run test"}
          </button>

          {verdict === "pass" && (
            <div className="rounded-sm border border-green-300 bg-green-950/30 px-4 py-3 text-sm font-semibold text-green-300">
              0 suspicious events during processing. 3 monitors active.
            </div>
          )}

          {verdict === "fail" && !error && (
            <div className="rounded-sm border border-amber-700/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
              <div className="font-semibold">
                Suspicious activity detected during processing.
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-sm border border-red-700/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {verdict === "running" && (
            <div className="text-sm text-[var(--ui-text-muted)]">
              Creating sample PDF and running scrub with 3 monitors…
            </div>
          )}
        </div>
      </Card>

      {auditReport ? <AuditReportPanel report={auditReport} /> : null}

      <Card title="DIY verification">
        <ol className="list-inside list-decimal space-y-2 text-[var(--ui-text-secondary)]">
          <li>Open your browser DevTools (F12).</li>
          <li>Go to the Network tab.</li>
          <li>Run any PDF tool on a file.</li>
          <li>See for yourself: zero requests to external servers.</li>
        </ol>
      </Card>

      <Card title="Technical transparency">
        <ul className="list-inside list-disc space-y-2 text-[var(--ui-text-secondary)]">
          <li>No third-party scripts loaded on any page.</li>
          <li>Service worker enables full offline operation.</li>
          <li>Content Security Policy restricts all external connections.</li>
          <li>WebRTC is monkey-patched during processing to prevent IP leaks.</li>
          <li>DOM mutation observer catches injected scripts and tracking pixels.</li>
          <li>CSP violation listener captures blocked exfiltration attempts.</li>
        </ul>
      </Card>
    </div>
  );
}
