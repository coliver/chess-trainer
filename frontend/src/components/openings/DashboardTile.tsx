// frontend/src/components/DashboardTile.tsx
import type { ReactNode } from "react";

type Props = {
  className?: string;
  tile?: ReactNode; // for fully custom tile (training tile)
  icon?: ReactNode;
  rightArrowIcon?: ReactNode;
  title?: string;
  subtitle?: string;
  cta?: ReactNode;
  customBody?: ReactNode;
  compact?: boolean;
};

export default function DashboardTile({
  className,
  tile,
  icon,
  rightArrowIcon,
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
        {rightArrowIcon ? (
          <div className="tile-icon tile-icon--right" aria-hidden="true">
            {rightArrowIcon}
          </div>
        ) : (
          <div className="tile-icon-inline" aria-hidden="true">
            {icon}
          </div>
        )}

        <div>
          <div className={compact ? "tile-title tile-title--compact" : "tile-title"}>
            {title}
          </div>
          <div className="tile-subtitle">{subtitle}</div>
        </div>
      </div>

      {customBody ? (
        customBody
      ) : (
        <>
          {cta}
        </>
      )}
    </div>
  );
}
