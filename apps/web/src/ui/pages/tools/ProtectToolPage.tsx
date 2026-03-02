import React from "react";
import { Card } from "../../components/Card";
import { NavLink } from "react-router-dom";

export function ProtectToolPage() {
  React.useEffect(() => {
    document.title = "Protect PDF (Labs) · PDF Changer";
  }, []);

  return (
    <div className="space-y-4">
      <Card title="Protect PDF (Labs Preview)">
        <div className="space-y-3 text-[15px] text-neutral-800">
          <p>
            This route is intentionally not active in production yet. We do not show a fake
            “run” button for a feature that cannot complete reliably.
          </p>
          <p>
            Current local engine limitation: password-protected writing is not available.
          </p>
        </div>
      </Card>

      <Card title="What to use right now" variant="warning">
        <div className="space-y-2 text-[15px] text-neutral-800">
          <div>Use available GA tools for document prep and risk reduction:</div>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <NavLink className="underline" to="/tools/scrub">
                Deep metadata scrubber
              </NavLink>
            </li>
            <li>
              <NavLink className="underline" to="/tools/watermark">
                Watermark tool
              </NavLink>
            </li>
            <li>
              <NavLink className="underline" to="/security">
                Security Hub guidance
              </NavLink>
            </li>
          </ul>
          <div>No silent upload will be introduced for this route.</div>
        </div>
      </Card>
    </div>
  );
}
