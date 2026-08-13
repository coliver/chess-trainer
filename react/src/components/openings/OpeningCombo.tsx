// frontend/src/components/openings/OpeningCombo.tsx
import { useEffect, useRef, useState } from "react";
import type { Opening } from "../../pages/Dashboard";

type Props = {
  rootLabel: string;
  query: string;
  setQuery: (v: string) => void;

  isOpen: boolean;
  setIsOpen: (v: boolean) => void;

  options: Opening[];
  selectedOpeningName: string | null;

  onPick: (idx: number) => void;
};

export default function OpeningCombo({
  rootLabel,
  query,
  setQuery,
  isOpen,
  setIsOpen,
  options,
  selectedOpeningName,
  onPick,
}: Props) {
  const [highlightIndex, setHighlightIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [setIsOpen]);

  const canNavigate = options.length > 0;

  const clampedHighlightIndex = canNavigate
    ? Math.min(highlightIndex, options.length - 1)
    : 0;

  const activeHighlightIndex = isOpen ? clampedHighlightIndex : 0;

  const pickHighlighted = () => {
    if (!canNavigate) return;
    onPick(activeHighlightIndex);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!canNavigate) return;
      setIsOpen(true);
      setHighlightIndex((i) => Math.min(i + 1, options.length - 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightIndex((i) => Math.max(0, i - 1));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      pickHighlighted();
      return;
    }

    if (e.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (!isOpen && (e.key === "ArrowDown" || e.key === "Enter")) {
      setIsOpen(true);
    }
  };

  return (
    <div className="select-wrap" ref={rootRef}>
      <div className="combo-root">
        <input
          className="combo-input"
          placeholder="Search openings..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={onKeyDown}
          onClick={(e) => {
            e.currentTarget.select();
          }}
          aria-label={rootLabel}
          aria-expanded={isOpen}
          role="combobox"
        />

        {isOpen && (
          <div className="combo-list" role="listbox">
            {options.length === 0 ? (
              <div className="combo-item combo-item--empty">No matches</div>
            ) : (
              options.map((o, idx) => {
                const isSelected = o.name === selectedOpeningName;
                const isHighlighted = idx === activeHighlightIndex;

                return (
                  <button
                    key={`${o.eco}-${o.name}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={[
                      "combo-item",
                      isHighlighted ? "combo-item--selected" : "",
                    ].join(" ")}
                    onMouseEnter={() => {
                      if (!canNavigate) return;
                      setHighlightIndex(idx);
                    }}
                    onMouseDown={(ev) => ev.preventDefault()} // keep focus
                    onClick={() => onPick(idx)}
                  >
                    {o.eco} — {o.name}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
