import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import es from "./locales/es.json";
import enPirate from "./locales/en-x-pirate.json";

const saved = localStorage.getItem("language");
const initialLanguage =
  saved === "es" || saved === "en" || saved === "en-x-pirate" ? saved : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    "en-x-pirate": { translation: enPirate },
  },
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
