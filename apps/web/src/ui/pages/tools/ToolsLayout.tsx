import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { gaTools } from "../../../content/tools/toolRegistry";

export function ToolsLayout() {
  const quickTabs = gaTools().filter((tool) => tool.featured);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Free PDF Tools</h1>
        <div className="text-sm text-[var(--ui-text-secondary)]">
          All tools run in your browser. No uploads, no tracking.
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <ToolTab to="/tools" label="Hub" />
        {quickTabs.map((tool) => (
          <ToolTab key={tool.slug} to={`/tools/${tool.slug}`} label={tool.name} />
        ))}
        <NavLink
          to="/tools#labs"
          className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] px-3 py-1.5 text-sm font-medium text-[var(--ui-text-secondary)] transition hover:bg-[var(--ui-bg)] hover:text-[var(--ui-text)]"
        >
          Labs
        </NavLink>
      </div>

      <Outlet />
    </div>
  );
}

function ToolTab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "rounded-sm border px-3 py-1.5 text-sm font-medium transition",
          isActive
            ? "border-[var(--ui-accent)] bg-[var(--ui-accent)] text-white"
            : "border-[var(--ui-border)] bg-[var(--ui-bg-raised)] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg)] hover:text-[var(--ui-text)]",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}
