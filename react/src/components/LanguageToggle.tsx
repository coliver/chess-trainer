import { useTranslation } from "react-i18next";

const LANGUAGES = ["en", "es", "en-x-pirate"] as const;
type Language = (typeof LANGUAGES)[number];

function toLanguage(value: string): Language {
  return (LANGUAGES as readonly string[]).includes(value)
    ? (value as Language)
    : "en";
}

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const language = toLanguage(i18n.language);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = toLanguage(e.target.value);
    i18n.changeLanguage(next);
    localStorage.setItem("language", next);
  }

  return (
    <select
      className="language-toggle-select"
      value={language}
      onChange={onChange}
      aria-label={t("language.toggle")}
      title={t("language.toggle")}
    >
      <option value="en">🇬🇧</option>
      <option value="es">🇪🇸</option>
      <option value="en-x-pirate">🏴‍☠️</option>
    </select>
  );
}
