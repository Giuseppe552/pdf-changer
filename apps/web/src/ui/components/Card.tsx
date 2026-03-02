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
        <h2 className="mb-3 text-base font-semibold text-neutral-950">{title}</h2>
      ) : null}
      <div className="text-[15px] text-neutral-800">{children}</div>
      {footer ? (
        <div className="mt-4 border-t border-neutral-300 pt-4">{footer}</div>
      ) : null}
    </Surface>
  );
}
