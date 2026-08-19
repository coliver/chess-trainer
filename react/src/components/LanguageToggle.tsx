import { useTranslation } from "react-i18next";
import i18nInstance from "../i18n/i18n";

// One flag per configured language. Falls back to the language code itself
// if a new locale file is added before its flag is picked.
const FLAGS: Record<string, string> = {
  en: "🇬🇧",
  es: "🇪🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
  in: "🇮🇳",
  it: "🇮🇹",
  jp: "🇯🇵",
  ko: "🇰🇷",
  nl: "🇳🇱",
  pl: "🇵🇱",
  pt: "🇵🇹",
  ru: "🇷🇺",
  tr: "🇹🇷",
  "zh-CN": "🇨🇳",
  "en-x-pirate": "🏴‍☠️",
  "en-x-klingon": "🖖",
  "en-x-groot": "🌱",
};

const LANGUAGES = Object.keys(i18nInstance.options.resources ?? {}).sort((a, b) =>
  a.localeCompare(b)
);

function toLanguage(value: string): string {
  return LANGUAGES.includes(value) ? value : "en";
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
      {LANGUAGES.map((lang) => (
        <option key={lang} value={lang}>
          {FLAGS[lang] ?? lang}
        </option>
      ))}
    </select>
  );
}
