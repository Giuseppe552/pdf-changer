import React from "react";

export function RouteSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-56 animate-pulse rounded bg-[var(--ui-bg-overlay)]" />
      <div className="h-48 animate-pulse rounded-sm border border-[var(--ui-border)] bg-[var(--ui-bg-raised)]" />
    </div>
  );
}

export function lazyNamed<T extends Record<string, unknown>, K extends keyof T>(
  loader: () => Promise<T>,
  key: K,
) {
  return React.lazy(async () => {
    const mod = await loader();
    const component = mod[key];
    if (!component || typeof component !== "function") {
      throw new Error(`Route component "${String(key)}" is unavailable.`);
    }
    const typedComponent =
      component as React.ComponentType<Record<string, unknown>>;
    return {
      default: typedComponent,
    };
  });
}

export function withSuspense(element: React.ReactNode) {
  return <React.Suspense fallback={<RouteSkeleton />}>{element}</React.Suspense>;
}
