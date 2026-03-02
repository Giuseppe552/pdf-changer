import React, { useState, useCallback } from "react";
import { Card } from "../components/Card";

type Verdict = "idle" | "running" | "pass" | "fail";

export function VerifyPage() {
  const [verdict, setVerdict] = useState<Verdict>("idle");
  const [log, setLog] = useState<string[]>([]);

  React.useEffect(() => {
    document.title = "Verify · PDF Changer";
  }, []);

  const runTest = useCallback(async () => {
    setVerdict("running");
    setLog([]);

    const entries: string[] = [];

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const name = (entry as PerformanceResourceTiming).name;
        entries.push(name);
        setLog((prev) => [...prev, name]);
      }
    });
    observer.observe({ entryTypes: ["resource"] });

    // Clear existing performance entries so we only capture new ones
    performance.clearResourceTimings();

    try {
      const { PDFDocument } = await import("pdf-lib");
      const { deepScrubPdf } = await import("../../utils/pdf/deepScrub");

      // Filter out the dynamic import requests themselves
      const preTestEntries = new Set(entries.map((e) => e));

      const samplePdf = await PDFDocument.create();
      samplePdf.addPage([200, 200]);
      const pdfBytes = await samplePdf.save();

      await deepScrubPdf(new Uint8Array(pdfBytes));

      // Small delay to let any late network events flush
      await new Promise((r) => setTimeout(r, 300));

      observer.disconnect();

      // Filter: only count requests that happened after imports loaded
      const processingRequests = entries.filter((e) => !preTestEntries.has(e));

      if (processingRequests.length === 0) {
        setVerdict("pass");
        setLog([]);
      } else {
        setVerdict("fail");
        setLog(processingRequests);
      }
    } catch (err) {
      observer.disconnect();
      setVerdict("fail");
      setLog([(err as Error).message]);
    }
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Verify</h1>

      <Card title="Don't trust us. Verify.">
        <p className="text-neutral-700">
          This page lets you prove our privacy claims yourself. Click the button
          below to create a sample PDF in memory, scrub it with our engine, and
          monitor every network request that happens during processing.
        </p>
      </Card>

      <Card title="Network monitor test">
        <div className="space-y-4">
          <button
            onClick={runTest}
            disabled={verdict === "running"}
            className="rounded-sm border border-neutral-400 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 disabled:opacity-50"
          >
            {verdict === "running" ? "Running…" : "Run test"}
          </button>

          {verdict === "pass" && (
            <div className="rounded-sm border border-green-300 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">
              0 network requests during processing.
            </div>
          )}

          {verdict === "fail" && (
            <div className="space-y-2 rounded-sm border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
              <div className="font-semibold">
                Network requests detected during processing:
              </div>
              <ul className="list-inside list-disc space-y-1">
                {log.map((entry, i) => (
                  <li key={i} className="break-all">
                    {entry}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {verdict === "running" && (
            <div className="text-sm text-neutral-600">
              Creating sample PDF and running scrub…
            </div>
          )}
        </div>
      </Card>

      <Card title="DIY verification">
        <ol className="list-inside list-decimal space-y-2 text-neutral-700">
          <li>Open your browser DevTools (F12).</li>
          <li>Go to the Network tab.</li>
          <li>Run any PDF tool on a file.</li>
          <li>See for yourself: zero requests to external servers.</li>
        </ol>
      </Card>

      <Card title="Technical transparency">
        <ul className="list-inside list-disc space-y-2 text-neutral-700">
          <li>No third-party scripts loaded on any page.</li>
          <li>Service worker enables full offline operation.</li>
          <li>Content Security Policy restricts all external connections.</li>
        </ul>
      </Card>
    </div>
  );
}
