import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const localeModules = import.meta.glob<{ default: Record<string, unknown> }>(
  "./locales/*.json",
  { eager: true },
);

const resources = Object.fromEntries(
  Object.entries(localeModules).map(([path, mod]) => {
    const [, language] = /\.\/locales\/(.+)\.json$/.exec(path) ?? [];
    return [language, { translation: mod.default }];
  }),
);

const languages = Object.keys(resources);
const saved = localStorage.getItem("language");
const initialLanguage = saved && languages.includes(saved) ? saved : "en";

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
