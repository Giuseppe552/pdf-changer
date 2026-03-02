import React from "react";
import { NavLink } from "react-router-dom";
import { Card } from "../../../components/Card";

export function ToolLimitNotice({
  title = "Usage limit reached",
  message,
}: {
  title?: string;
  message?: string;
}) {
  return (
    <Card title={title} variant="warning">
      <div className="space-y-2 text-[15px] text-neutral-800">
        <div>
          {message ??
            "This device reached its monthly action limit for this tool bucket."}
        </div>
        <div>
          You can continue next month, or use paid plan for unlimited workflow
          usage.
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <NavLink className="underline" to="/pricing">
            View pricing
          </NavLink>
          <NavLink className="underline" to="/donate">
            Support free tools
          </NavLink>
          <NavLink className="underline" to="/faq/tool-usage/can-i-use-pdf-changer-offline">
            Read quota FAQ
          </NavLink>
        </div>
      </div>
    </Card>
  );
}

