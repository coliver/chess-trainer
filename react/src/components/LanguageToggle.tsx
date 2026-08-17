import { useTranslation } from "react-i18next";

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const language = i18n.language === "es" ? "es" : "en";

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value === "es" ? "es" : "en";
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
    </select>
  );
}
