import React from "react";
import { NavLink } from "react-router-dom";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { useAuth } from "../auth/AuthContext";
import { api } from "../../utils/api";
import { InlineCode } from "../components/InlineCode";
import { Surface } from "../components/Surface";

export function PricingPage() {
  const { me, loading, refresh } = useAuth();
  const [busy, setBusy] = React.useState(false);
  const canUpgrade = me.authenticated;

  async function startCheckout() {
    if (!canUpgrade) return;
    setBusy(true);
    try {
      const { url } = await api.checkout();
      window.location.assign(url);
    } finally {
      setBusy(false);
      void refresh();
    }
  }

  async function openPortal() {
    setBusy(true);
    try {
      const { url } = await api.portal();
      window.location.assign(url);
    } finally {
      setBusy(false);
      void refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="ui-title">Pricing</h1>
        <p className="ui-subtitle max-w-3xl">
          All core tools are free with generous local quotas. Upgrade for
          unlimited workflow scale.
        </p>
      </div>

      <Surface variant="emphasis" compact>
        <div className="text-[15px] text-neutral-800">
          Payments are handled by Stripe. Core privacy stance remains the same:
          no analytics trackers and no PDF upload processing in v1.
        </div>
      </Surface>

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          title="Guest"
          footer={<div className="text-sm text-neutral-600">No account.</div>}
          className="h-full"
        >
          <ul className="list-inside list-disc space-y-2">
            <li>All core tools enabled</li>
            <li>40 actions/month (device-local)</li>
          </ul>
        </Card>
        <Card
          title="Free (Passkey)"
          footer={
            <div className="text-sm text-neutral-600">
              Create a passkey in <InlineCode>/account</InlineCode>.
            </div>
          }
          className="h-full"
        >
          <ul className="list-inside list-disc space-y-2">
            <li>All core tools enabled</li>
            <li>600 actions/month (device-local)</li>
            <li>Heavy-bucket cap: 150/month</li>
          </ul>
        </Card>
        <Card
          title="Paid"
          footer={
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={startCheckout}
                disabled={busy || loading || me.plan === "paid" || !canUpgrade}
              >
                £10/mo — Upgrade
              </Button>
              <Button
                variant="secondary"
                onClick={openPortal}
                disabled={busy || loading || !me.authenticated}
              >
                Billing portal
              </Button>
            </div>
          }
          variant="emphasis"
          className="h-full"
        >
          <div className="mb-3 text-[15px] text-neutral-700">
            Workflow unlock plan for higher-volume and repeat workloads.
          </div>
          <div className="overflow-x-auto border border-neutral-300">
            <table className="min-w-full border-collapse text-left text-[15px]">
              <thead>
                <tr className="border-b border-neutral-300 bg-neutral-50 text-neutral-800">
                  <th className="px-3 py-2 font-semibold">Capability</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-neutral-200">
                  <td className="px-3 py-2">Unlimited actions on all GA tools</td>
                  <td className="px-3 py-2 font-semibold text-emerald-700">Available now</td>
                </tr>
                <tr className="border-b border-neutral-200">
                  <td className="px-3 py-2">Offline paid use until entitlement expiry</td>
                  <td className="px-3 py-2 font-semibold text-emerald-700">Available now</td>
                </tr>
                <tr className="border-b border-neutral-200">
                  <td className="px-3 py-2">Batch queue + pipelines</td>
                  <td className="px-3 py-2 font-semibold text-amber-700">Planned</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Saved presets and profile defaults</td>
                  <td className="px-3 py-2 font-semibold text-amber-700">Planned</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {!canUpgrade ? (
        <Card title="Upgrade requires a passkey account">
          <p className="text-[15px] text-neutral-700">
            We do not require email or phone. Create a passkey in{" "}
            <InlineCode>/account</InlineCode> to upgrade.
          </p>
          <div className="mt-3">
            <NavLink className="underline text-[15px]" to="/account">
              Open account setup
            </NavLink>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
