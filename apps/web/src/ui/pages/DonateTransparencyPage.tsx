import React from "react";
import { NavLink } from "react-router-dom";
import { Card } from "../components/Card";

export function DonateTransparencyPage() {
  React.useEffect(() => {
    document.title = "Donate Transparency · PDF Changer";
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-sm text-neutral-500">
          <NavLink className="hover:text-neutral-900" to="/donate">
            Donate
          </NavLink>{" "}
          / Transparency
        </div>
        <h1 className="ui-title">
          Minimal monthly transparency
        </h1>
        <p className="ui-subtitle max-w-3xl">
          We publish high-level totals and spend categories without exposing
          operationally sensitive details.
        </p>
      </div>

      <Card title="Reporting model">
        <ul className="list-inside list-disc space-y-2 text-[15px] text-neutral-700">
          <li>Total donations received (month).</li>
          <li>Total product and infrastructure spend (month).</li>
          <li>Spend categories: hosting, security review, documentation, operations.</li>
          <li>Closing reserve balance (month end).</li>
        </ul>
      </Card>

      <Card title="Latest sample report (placeholder)">
        <div className="space-y-2 text-[15px] text-neutral-700">
          <div>Month: 2026-02</div>
          <div>Donations received: £0.00 (publishes after launch).</div>
          <div>Operational spend: £0.00 (publishes after launch).</div>
          <div>Reserve balance: £0.00 (publishes after launch).</div>
        </div>
      </Card>

      <Card title="Boundaries">
        <div className="space-y-2 text-[15px] text-neutral-700">
          <div>
            We do not publish donor identities, transaction-level linking data, or
            account-level payment details.
          </div>
          <div>
            For scope boundaries, read{" "}
            <NavLink className="underline" to="/security/policy">
              defensive-only policy
            </NavLink>
            .
          </div>
          <div>
            Verify donation addresses at{" "}
            <NavLink className="underline" to="/donate/proof">
              trust center
            </NavLink>{" "}
            and review historical records in{" "}
            <NavLink className="underline" to="/donate/proof/archive">
              proof archive
            </NavLink>
            .
          </div>
        </div>
      </Card>
    </div>
  );
}
