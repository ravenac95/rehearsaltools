import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function Card({ children, className = "", style, onClick }: CardProps) {
  return (
    <div
      className={["card", className].filter(Boolean).join(" ")}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
