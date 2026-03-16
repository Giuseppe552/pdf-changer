import React from "react";

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-[var(--ui-bg-overlay)] px-1.5 py-0.5 text-xs text-[var(--ui-text)]">
      {children}
    </code>
  );
}
