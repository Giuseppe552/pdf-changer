import React from "react";
import {
  isRouteErrorResponse,
  NavLink,
  useRouteError,
} from "react-router-dom";

function normalizeError(error: unknown): {
  heading: string;
  detail: string | null;
  status: string | null;
} {
  if (isRouteErrorResponse(error)) {
    return {
      heading: "Page unavailable",
      detail:
        typeof error.data === "string" && error.data.trim()
          ? error.data
          : error.statusText || "This route could not be loaded.",
      status: `${error.status}`,
    };
  }
  if (error instanceof Error) {
    return {
      heading: "Unexpected application error",
      detail: error.message || "The page crashed while rendering.",
      status: null,
    };
  }
  return {
    heading: "Unexpected application error",
    detail: "The page crashed while rendering.",
    status: null,
  };
}

export function RouteErrorPage() {
  const error = useRouteError();
  const info = normalizeError(error);
  const detail =
    isRouteErrorResponse(error) || import.meta.env.DEV
      ? info.detail
      : "This page could not be loaded.";

  React.useEffect(() => {
    document.title = "Error · PDF Changer";
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{info.heading}</h1>
      <div className="rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)] p-6 text-sm text-[var(--ui-text-secondary)] shadow-sm">
        <div className="space-y-2">
          {info.status ? (
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--ui-text-muted)]">
              Status {info.status}
            </div>
          ) : null}
          <p>{detail}</p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-sm bg-[var(--ui-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--ui-accent-hover)]"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
      <div className="text-sm text-[var(--ui-text-muted)]">
        Go to{" "}
        <NavLink to="/" className="text-[var(--ui-text)] underline">
          Home
        </NavLink>{" "}
        or{" "}
        <NavLink to="/blog" className="text-[var(--ui-text)] underline">
          Blog
        </NavLink>
        .
      </div>
    </div>
  );
}
