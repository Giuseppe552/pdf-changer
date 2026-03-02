import React, { useState, useCallback, useEffect } from "react";
import { Card } from "../components/Card";
import { api } from "../../utils/api";

type CheckStatus = "pending" | "pass" | "fail";

interface HealthChecks {
  api: CheckStatus;
  serviceWorker: CheckStatus;
  localStorage: CheckStatus;
  pdfEngine: CheckStatus;
}

const initial: HealthChecks = {
  api: "pending",
  serviceWorker: "pending",
  localStorage: "pending",
  pdfEngine: "pending",
};

function Badge({ status }: { status: CheckStatus }) {
  if (status === "pending") {
    return (
      <span className="inline-block rounded-sm bg-neutral-200 px-2 py-0.5 text-xs font-semibold text-neutral-600">
        checking…
      </span>
    );
  }
  if (status === "pass") {
    return (
      <span className="inline-block rounded-sm bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
        OK
      </span>
    );
  }
  return (
    <span className="inline-block rounded-sm bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
      failed
    </span>
  );
}

export function StatusPage() {
  const [checks, setChecks] = useState<HealthChecks>(initial);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const runChecks = useCallback(async () => {
    setChecks(initial);

    // API reachable
    try {
      await api.health();
      setChecks((c) => ({ ...c, api: "pass" }));
    } catch {
      setChecks((c) => ({ ...c, api: "fail" }));
    }

    // Service Worker
    const swActive = !!navigator.serviceWorker?.controller;
    setChecks((c) => ({ ...c, serviceWorker: swActive ? "pass" : "fail" }));

    // Local storage
    try {
      const key = "__pdf_changer_health_check__";
      window.localStorage.setItem(key, "1");
      const val = window.localStorage.getItem(key);
      window.localStorage.removeItem(key);
      setChecks((c) => ({ ...c, localStorage: val === "1" ? "pass" : "fail" }));
    } catch {
      setChecks((c) => ({ ...c, localStorage: "fail" }));
    }

    // PDF engine
    try {
      await import("pdfjs-dist");
      setChecks((c) => ({ ...c, pdfEngine: "pass" }));
    } catch {
      setChecks((c) => ({ ...c, pdfEngine: "fail" }));
    }

    setLastChecked(new Date());
  }, []);

  useEffect(() => {
    document.title = "Status · PDF Changer";
    runChecks();
  }, [runChecks]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Status</h1>

      <Card title="All systems operational (v1)">
        <ul className="list-inside list-disc space-y-2 text-neutral-700">
          <li>PDF processing runs locally in your browser.</li>
          <li>The API is used only for account sessions and billing.</li>
          <li>No analytics or tracking scripts are used.</li>
        </ul>
      </Card>

      <Card title="Offline mode">
        The scrubber works offline after the first load (within local usage
        caps).
      </Card>

      <Card title="Live health checks">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-700">API reachable</span>
              <Badge status={checks.api} />
            </div>
            {checks.api === "fail" && (
              <p className="text-xs text-neutral-500">
                API not reachable (all tools still work locally).
              </p>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-700">Service Worker</span>
              <Badge status={checks.serviceWorker} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-700">Local storage</span>
              <Badge status={checks.localStorage} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-700">PDF engine</span>
              <Badge status={checks.pdfEngine} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={runChecks}
              className="rounded-sm border border-neutral-400 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100"
            >
              Re-check
            </button>
            {lastChecked && (
              <span className="text-xs text-neutral-500">
                Last checked: {lastChecked.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </Card>

      <Card title="Uptime">
        <p className="text-neutral-700">
          All PDF tools run in your browser. There is no server to go down. The
          API handles only authentication and billing.
        </p>
      </Card>
    </div>
  );
}
