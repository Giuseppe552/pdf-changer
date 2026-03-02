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

      <Card title="Why this exists">
        <p className="text-neutral-700">
          Privacy is a human right recognized in most legal systems. Existing PDF
          tools upload your files to servers you can't audit. We built something
          different: every operation happens in your browser, on your device,
          under your control.
        </p>
      </Card>

      <Card title="How it works">
        <p className="text-neutral-700">
          Every tool processes files using JavaScript in your browser tab. No
          bytes leave your device. The API exists only for account sessions and
          billing — it never sees your PDFs.
        </p>
      </Card>

      <Card title="What we don't do">
        <ul className="list-inside list-disc space-y-2 text-neutral-700">
          <li>No analytics or usage tracking.</li>
          <li>No tracking pixels or third-party CDNs.</li>
          <li>No browser fingerprinting.</li>
          <li>No selling or sharing data with anyone.</li>
        </ul>
      </Card>

      <Card title="Our principles">
        <ul className="list-inside list-disc space-y-2 text-neutral-700">
          <li>Free tier forever.</li>
          <li>Honest about limitations.</li>
          <li>Open security documentation.</li>
          <li>No dark patterns.</li>
        </ul>
      </Card>

      <Card title="Verify it yourself">
        <p className="text-neutral-700">
          Don't take our word for it.
        </p>
        <ul className="mt-3 list-inside list-disc space-y-2 text-neutral-700">
          <li>
            <Link to="/verify" className="underline hover:text-neutral-900">
              Verify
            </Link>{" "}
            — run a live network monitor test.
          </li>
          <li>
            <Link to="/status" className="underline hover:text-neutral-900">
              Status
            </Link>{" "}
            — check system health.
          </li>
          <li>
            <Link to="/security" className="underline hover:text-neutral-900">
              Security
            </Link>{" "}
            — read our threat models and guides.
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
    </div>
  );
}
