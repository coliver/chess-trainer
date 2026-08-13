// frontend/src/components/DashboardTile.tsx
import type { ReactNode } from "react";

type Props = {
  className?: string;
  tile?: ReactNode; // for fully custom tile (training tile)
  icon?: ReactNode;  
  title?: string;
  subtitle?: ReactNode;
  cta?: ReactNode;
  customBody?: ReactNode;
  compact?: boolean;
};

export default function DashboardTile({
  className,
  tile,
  icon,
  title,
  subtitle,
  cta,
  customBody,
  compact,
}: Props) {
  if (tile) {
    return <div className={`dashboard-tile ${className ?? ""}`}>{tile}</div>;
  }

  return (
    <div className={`dashboard-tile ${className ?? ""}`}>
      <div className={compact ? "tile-header" : "tile-header-row"}>
        <div className="tile-icon-inline" aria-hidden="true">
          {icon}
        </div>

        <div>
          <div
            className={
              compact ? "tile-title tile-title--compact" : "tile-title"
            }
          >
            {title}
          </div>
          <div className="tile-subtitle">{subtitle}</div>
        </div>
      </div>

      {customBody ? customBody : <>{cta}</>}
    </div>
  );
}
