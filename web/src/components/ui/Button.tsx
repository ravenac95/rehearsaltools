import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  style?: React.CSSProperties;
  className?: string;
}

export function Button({
  children,
  variant = "secondary",
  onClick,
  disabled,
  type = "button",
  style,
  className = "",
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[variant, className].filter(Boolean).join(" ")}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  );
}
