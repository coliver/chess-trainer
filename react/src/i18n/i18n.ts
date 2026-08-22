import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Locale files live in packages/i18n-locales/ so the Rails frontend can load
// the identical translation content (see rails/config/initializers/i18n_json_loader.rb)
// instead of maintaining a second, independently-drifting copy.
const localeModules = import.meta.glob<{ default: Record<string, unknown> }>(
  "../../../packages/i18n-locales/locales/*.json",
  { eager: true },
);

const resources = Object.fromEntries(
  Object.entries(localeModules).map(([path, mod]) => {
    const [, language] = /\/locales\/(.+)\.json$/.exec(path) ?? [];
    return [language, { translation: mod.default }];
  }),
);

const languages = Object.keys(resources);
const saved = localStorage.getItem("language");
const initialLanguage = saved && languages.includes(saved) ? saved : "en-US";

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: "en-US",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
