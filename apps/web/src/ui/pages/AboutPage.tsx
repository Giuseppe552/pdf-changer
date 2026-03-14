import React from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/Card";

export function AboutPage() {
  React.useEffect(() => {
    document.title = "About · PDF Changer";
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">About</h1>

      <Card title="Why I built this">
        <div className="space-y-3 text-neutral-700">
          <p>
            I was paying Adobe a monthly subscription just to merge two PDFs. When
            I cancelled, I tried the free alternatives — and they were worse. Pop-up
            ads, unclear privacy policies, and every one of them wanted me to upload
            my files to their servers. For a task that should take a few lines of
            code.
          </p>
          <p>
            Most of these tools are built on top of open-source libraries anyway. So
            I thought: how hard can it be to build one that just runs in the browser?
            No uploads, no subscriptions, no tracking.
          </p>
          <p>
            Turns out it's a fun problem. I learned a lot about document security along
            the way — how much hidden data PDFs carry, how metadata can identify you,
            what actually happens when you "redact" something versus just drawing a
            black box over it. I documented everything I learned in the{" "}
            <Link to="/security" className="underline">
              security guides
            </Link>{" "}
            so other people don't have to figure it out the hard way.
          </p>
        </div>
      </Card>

      <Card title="How it works">
        <p className="text-neutral-700">
          Every tool runs JavaScript in your browser tab. Your PDF bytes stay on
          your device — they're never uploaded to a server. The only network
          requests are for account sessions and billing if you choose to upgrade.
        </p>
      </Card>

      <Card title="What I don't do">
        <ul className="list-inside list-disc space-y-2 text-neutral-700">
          <li>No analytics or usage tracking.</li>
          <li>No tracking pixels or third-party scripts.</li>
          <li>No browser fingerprinting.</li>
          <li>No selling or sharing data with anyone.</li>
        </ul>
      </Card>

      <Card title="Verify it yourself">
        <p className="text-neutral-700">
          Don't take my word for it.
        </p>
        <ul className="mt-3 list-inside list-disc space-y-2 text-neutral-700">
          <li>
            <Link to="/verify" className="underline hover:text-neutral-900">
              Verify
            </Link>{" "}
            — run a live network monitor test while processing a PDF.
          </li>
          <li>
            <Link to="/security" className="underline hover:text-neutral-900">
              Security
            </Link>{" "}
            — read the threat models and technical documentation.
          </li>
          <li>
            <Link
              to="/privacy-policy"
              className="underline hover:text-neutral-900"
            >
              Privacy policy
            </Link>{" "}
            — the legal version.
          </li>
        </ul>
      </Card>

      <div className="rounded-sm border border-neutral-200 bg-white p-5">
        <div className="text-sm text-neutral-500">
          Built by{" "}
          <span className="font-semibold text-neutral-900">Giuseppe Giona</span>.
        </div>
      </div>
    </div>
  );
}
