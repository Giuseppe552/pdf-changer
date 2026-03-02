import React from "react";

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-900">
      {children}
    </code>
  );
}
