import React from "react";

type Props = {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
};

export function Button({
  onClick,
  children,
  variant = "primary",
  disabled,
  type = "button",
  className,
}: Props) {
  const base = variant === "secondary" ? "btn btn-secondary" : "btn";
  return (
    <button
      type={type}
      className={`${base}${className ? ` ${className}` : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
