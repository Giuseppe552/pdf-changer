import React from "react";
import { NavLink } from "react-router-dom";
import {
  isGaTool,
  processingModeLabel,
  type ToolDefinition,
} from "../../../../content/tools/toolRegistry";

export function ToolCard({
  tool,
  to,
}: {
  tool: ToolDefinition;
  to?: string;
}) {
  const href = to ?? `/tools/${tool.slug}`;
  const showLabsBadge = !isGaTool(tool);
  const disabledOpen = tool.status === "coming-soon" || !tool.enabled;

  const statusLabel =
    tool.status === "ga"
      ? "Stable"
      : tool.status === "beta"
        ? "Beta"
        : "Coming soon";

  return (
    <div className="ui-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-semibold text-neutral-900">{tool.name}</span>
        <span className="ui-tag">{processingModeLabel(tool.processingMode)}</span>
        {showLabsBadge ? (
          <span className="ui-tag border-purple-300 bg-purple-50 text-purple-800">
            {statusLabel}
          </span>
        ) : null}
        <span
          className={[
            "ui-tag",
            tool.bucket === "heavy"
              ? "border-amber-400 bg-amber-50 text-amber-800"
              : "border-neutral-400 bg-neutral-100 text-neutral-700",
          ].join(" ")}
        >
          {tool.bucket === "heavy" ? "Heavy quota" : "Core quota"}
        </span>
        {tool.availability === "limited" ? (
          <span className="ui-tag border-amber-400 bg-amber-50 text-amber-800">
            Limited
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[15px] text-neutral-700">{tool.description}</p>
      {tool.releaseNote ? (
        <p className="mt-2 text-sm text-neutral-600">{tool.releaseNote}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        {disabledOpen ? (
          <span className="text-neutral-500">Tool route unavailable in production</span>
        ) : (
          <NavLink className="underline text-neutral-800" to={href}>
            Open tool
          </NavLink>
        )}
        <NavLink className="underline text-neutral-700" to={`/tools/${tool.slug}/how-to`}>
          How-to
        </NavLink>
        <NavLink className="underline text-neutral-700" to={`/tools/${tool.slug}/privacy`}>
          Privacy
        </NavLink>
      </div>
    </div>
  );
}
