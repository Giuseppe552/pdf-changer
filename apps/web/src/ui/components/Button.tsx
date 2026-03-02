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
    "inline-flex items-center justify-center rounded-sm border text-[15px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:ring-offset-2 focus:ring-offset-neutral-50 disabled:cursor-not-allowed disabled:opacity-60";
  const sizeStyles = size === "lg" ? "min-h-12 px-5" : "min-h-11 px-4";
  const styles =
    variant === "primary"
      ? "border-blue-800 bg-blue-800 text-white hover:bg-blue-700"
      : variant === "danger"
        ? "border-red-700 bg-red-700 text-white hover:bg-red-600"
        : "border-neutral-400 bg-white text-neutral-900 hover:bg-neutral-100";

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
