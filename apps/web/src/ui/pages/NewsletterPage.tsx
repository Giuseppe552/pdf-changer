import React from "react";
import { NavLink } from "react-router-dom";
import { Card } from "../components/Card";
import { NewsletterSignup } from "../components/NewsletterSignup";

export function NewsletterPage() {
  React.useEffect(() => {
    document.title = "Newsletter · PDF Changer";
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Newsletter</h1>
      <Card title="Product updates (optional)">
        <p className="text-neutral-700">
          If you want release notes and feature updates, subscribe here. No
          tracking pixels. Unsubscribe any time.
        </p>
        <div className="mt-4">
          <NewsletterSignup />
        </div>
      </Card>
      <Card title="Privacy note">
        <p className="text-neutral-700">
          This is optional. Accounts do not require email. See the full privacy
          policy for details:{" "}
          <NavLink to="/privacy-policy" className="text-neutral-900 underline">
            Privacy policy
          </NavLink>
          .
        </p>
      </Card>
    </div>
  );
}
