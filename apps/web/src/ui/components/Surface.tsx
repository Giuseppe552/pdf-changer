import React from "react";

export type SurfaceVariant = "default" | "emphasis" | "warning" | "danger";

const variantClass: Record<SurfaceVariant, string> = {
  default: "ui-surface",
  emphasis: "ui-surface-emphasis",
  warning: "ui-surface-warning",
  danger: "ui-surface-danger",
};

export function Surface({
  as: Component = "section",
  children,
  className,
  variant = "default",
  compact = false,
}: {
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  variant?: SurfaceVariant;
  compact?: boolean;
}) {
  return (
    <Component
      className={[
        variantClass[variant],
        compact ? "p-4" : "p-6",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </Component>
  );
}
