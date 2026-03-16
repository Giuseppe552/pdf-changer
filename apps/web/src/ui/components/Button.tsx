import React from "react";

export function Button({
  children,
  onClick,
  disabled,
  type = "button",
  variant = "primary",
  size = "lg",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger";
  size?: "md" | "lg";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md border text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
  const sizeStyles = size === "lg" ? "min-h-11 px-5 py-2.5" : "min-h-10 px-4 py-2";
  const styles =
    variant === "primary"
      ? "border-[var(--ui-accent)] bg-[var(--ui-accent)] text-[#0e1117] hover:bg-[var(--ui-accent-hover)] focus:ring-[var(--ui-accent)]/30 focus:ring-offset-[var(--ui-bg)]"
      : variant === "danger"
        ? "border-red-600 bg-red-600 text-white hover:bg-red-500 focus:ring-red-500/30 focus:ring-offset-[var(--ui-bg)]"
        : "border-[var(--ui-border-strong)] bg-transparent text-[var(--ui-text-secondary)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-overlay)] hover:border-[var(--ui-text-muted)] focus:ring-[var(--ui-accent)]/20 focus:ring-offset-[var(--ui-bg)]";

  return (
    <button
      type={type}
      className={`${base} ${sizeStyles} ${styles}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
