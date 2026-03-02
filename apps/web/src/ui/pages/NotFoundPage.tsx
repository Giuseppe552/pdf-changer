import React from "react";
import { NavLink } from "react-router-dom";

export function NotFoundPage() {
  React.useEffect(() => {
    document.title = "Not found · PDF Changer";
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
      <div className="rounded-sm border border-neutral-200 bg-white p-6 text-sm text-neutral-700 shadow-sm">
        This page doesn’t exist. Go back to{" "}
        <NavLink to="/" className="text-neutral-900 underline">
          Home
        </NavLink>
        .
      </div>
    </div>
  );
}

