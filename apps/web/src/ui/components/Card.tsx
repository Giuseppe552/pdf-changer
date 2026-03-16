import React from "react";
import { Surface, type SurfaceVariant } from "./Surface";

export function Card({
  title,
  children,
  footer,
  variant = "default",
  compact = false,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: SurfaceVariant;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Surface
      as="section"
      variant={variant}
      compact={compact}
      className={className}
    >
      {title ? (
        <h2 className="mb-3 text-sm font-semibold text-[var(--ui-text)]">{title}</h2>
      ) : null}
      <div className="text-sm text-[var(--ui-text-secondary)]">{children}</div>
      {footer ? (
        <div className="mt-4 border-t border-[var(--ui-border)] pt-4">{footer}</div>
      ) : null}
    </Surface>
  );
}
