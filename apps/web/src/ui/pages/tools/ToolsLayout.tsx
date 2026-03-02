import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { gaTools } from "../../../content/tools/toolRegistry";

export function ToolsLayout() {
  const quickTabs = gaTools().filter((tool) => tool.featured);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Tools Hub</h1>
        <div className="text-sm text-neutral-700">
          Free-first daily tools with honest availability labels
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <ToolTab to="/tools" label="Hub" />
        {quickTabs.map((tool) => (
          <ToolTab key={tool.slug} to={`/tools/${tool.slug}`} label={tool.name} />
        ))}
        <NavLink
          to="/tools#labs"
          className="rounded-sm border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 hover:text-neutral-900"
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
            ? "border-blue-700 bg-blue-700 text-white"
            : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}
