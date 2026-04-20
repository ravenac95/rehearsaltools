import React from "react";

interface ChipProps {
  children: React.ReactNode;
  variant?: "dashed" | "solid" | "ghost";  // dashed = default
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export function Chip({ children, variant = "dashed", onClick, disabled, className = "", style, title }: ChipProps) {
  const cls = ["chip", variant === "solid" ? "solid" : variant === "ghost" ? "ghost" : "", className]
    .filter(Boolean).join(" ");
  return (
    <button className={cls} onClick={onClick} disabled={disabled} style={style} title={title}>
      {children}
    </button>
  );
}
