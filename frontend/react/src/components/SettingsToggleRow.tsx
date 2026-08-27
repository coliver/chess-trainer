type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function SettingsToggleRow({ label, checked, onChange }: Props) {
  return (
    <label className="settings-row settings-row--checkbox">
      <span className="settings-row-label">{label}</span>
      <span className="settings-switch">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="settings-switch-track" aria-hidden="true" />
      </span>
    </label>
  );
}
