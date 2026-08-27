import { useTranslation } from "react-i18next";
import i18nInstance from "../i18n/i18n";
import { usePreferences } from "../context/PreferencesContext";

// One flag per configured language. Falls back to the language code itself
// if a new locale file is added before its flag is picked.
const FLAGS: Record<string, string> = {
  "en-GB": "🇬🇧",
  "en-US": "🇺🇸",
  "en-AU": "🇦🇺",

  es: "🇪🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
  hi: "🇮🇳",
  it: "🇮🇹",
  ja: "🇯🇵",
  kl: "🖖",
  ko: "🇰🇷",
  nl: "🇳🇱",
  pl: "🇵🇱",
  pt: "🇵🇹",
  "pt-BR": "🇧🇷",
  ru: "🇷🇺",
  tr: "🇹🇷",
  "zh-CN": "🇨🇳",

  ar: "🇸🇦",
  cs: "🇨🇿",
  da: "🇩🇰",
  el: "🇬🇷",
  fi: "🇫🇮",
  he: "🇮🇱",
  hu: "🇭🇺",
  id: "🇮🇩",
  ms: "🇲🇾",
  no: "🇳🇴",
  ro: "🇷🇴",
  sk: "🇸🇰",
  sv: "🇸🇪",
  uk: "🇺🇦",
  vi: "🇻🇳",

  "en-x-pirate": "🏴‍☠️",
  "en-x-groot": "🌱",

  sd: "🧝",
  khz: "⛏️",
};


const LANGUAGES = Object.keys(i18nInstance.options.resources ?? {}).sort((a, b) =>
  a.localeCompare(b)
);

function toLanguage(value: string): string {
  return LANGUAGES.includes(value) ? value : "en-US";
}

export function LanguageToggle() {
  const { t } = useTranslation();
  const { preferences, update } = usePreferences();
  const language = toLanguage(preferences.language);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    update({ language: toLanguage(e.target.value) });
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
