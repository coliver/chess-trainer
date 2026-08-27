import type { ReactNode } from "react";

type Props = {
  icon: string;
  value: ReactNode;
  label: ReactNode;
  variant?: "mastery";
  children?: ReactNode;
};

export function ProgressStat({ icon, value, label, variant, children }: Props) {
  return (
    <div
      className={`progress-stat${variant === "mastery" ? " progress-stat--mastery" : ""}`}
    >
      <span className="progress-stat-value">
        <span className="progress-stat-icon" aria-hidden="true">
          {icon}
        </span>
        {value}
      </span>
      <span className="progress-stat-label">{label}</span>
      {children}
    </div>
  );
}
