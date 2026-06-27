"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  interpolate,
  languageToHtmlLang,
  resolveInitialLanguage,
  storeLanguage,
  translations,
  type Language,
  type Translations,
} from "@/lib/i18n";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translations;
  formatMessage: (
    template: string,
    values?: Record<string, string | number>,
  ) => string;
  isReady: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ms");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setLanguageState(resolveInitialLanguage());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    document.documentElement.lang = languageToHtmlLang(language);
  }, [language, isReady]);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    storeLanguage(next);
  };

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: translations[language],
      formatMessage: (template, values = {}) => interpolate(template, values),
      isReady,
    }),
    [language, isReady],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
