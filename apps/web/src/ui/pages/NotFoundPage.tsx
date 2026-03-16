import React from "react";
import { NavLink } from "react-router-dom";

export function NotFoundPage() {
  React.useEffect(() => {
    document.title = "Not found · PDF Changer";
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
      <div className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 text-sm text-[var(--ui-text-secondary)] shadow-sm">
        This page doesn’t exist. Go back to{" "}
        <NavLink to="/" className="text-[var(--ui-text)] underline">
          Home
        </NavLink>
        .
      </div>
    </div>
  );
}

