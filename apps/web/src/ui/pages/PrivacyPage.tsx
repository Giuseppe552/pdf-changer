import React from "react";
import { Card } from "../components/Card";
import { InlineCode } from "../components/InlineCode";

export function PrivacyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy</h1>
      <Card title="No uploads">
        Your PDF files never leave your device. Every tool runs locally in
        your browser.
      </Card>
      <Card title="No trackers">
        No analytics scripts, no third-party CDNs, no marketing pixels.
      </Card>
      <Card title="Minimal account data">
        <ul className="list-inside list-disc space-y-2">
          <li>Passkeys: we store only public keys + counters.</li>
          <li>Billing: Stripe IDs for subscription status.</li>
          <li>
            Newsletter (optional): if you subscribe, we store the email you
            provide for product updates.
          </li>
          <li>
            We do not build usage fingerprints. Limits are locally enforced.
          </li>
          <li>
            Network providers inevitably see IP addresses to deliver requests;
            we do not store IPs in our database and we do not run analytics.
          </li>
        </ul>
      </Card>
      <Card title="Payments">
        Payments are handled by Stripe. See <InlineCode>/pricing</InlineCode> to
        upgrade.
      </Card>
    </div>
  );
}
