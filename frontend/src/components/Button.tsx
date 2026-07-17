import React from "react";

type Props = {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  type?: "button" | "submit";
};

export function Button({
  onClick,
  children,
  variant = "primary",
  disabled,
  type = "button",
}: Props) {
  const className = variant === "secondary" ? "btn btn-secondary" : "btn";
  return (
    <button type={type} className={className} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}