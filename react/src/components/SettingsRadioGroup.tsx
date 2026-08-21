type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  name: string;
  ariaLabel: string;
  rowLabel?: string;
  stacked?: boolean;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
};

export function SettingsRadioGroup<T extends string>({
  name,
  ariaLabel,
  rowLabel,
  stacked,
  value,
  options,
  onChange,
}: Props<T>) {
  const group = (
    <div
      className={`settings-radio-group${stacked ? " settings-radio-group--stacked" : ""}`}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <label key={option.value} className="settings-radio">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );

  if (!rowLabel) return group;

  return (
    <div className="settings-row">
      <span className="settings-row-label">{rowLabel}</span>
      {group}
    </div>
  );
}
