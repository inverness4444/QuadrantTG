import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { translations, type SupportedLanguage } from "../i18n/locales";

type TranslationParams = Record<string, string | number>;

type LocalizationContextValue = {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  t: (key: string, params?: TranslationParams) => string;
};

const LocalizationContext = createContext<LocalizationContextValue | undefined>(undefined);

type LocalizationProviderProps = {
  initialLanguage?: SupportedLanguage;
  children: React.ReactNode;
};

const interpolate = (template: string, params?: TranslationParams) => {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key];
    return value !== undefined && value !== null ? String(value) : match;
  });
};

export const LocalizationProvider = ({
  initialLanguage = "en",
  children
}: LocalizationProviderProps) => {
  const [language, setLanguage] = useState<SupportedLanguage>(initialLanguage);

  const translate = useCallback(
    (key: string, params?: TranslationParams) => {
      const dictionary = translations[language] ?? translations.en;
      const fallbackDictionary = translations.en;
      const template = dictionary[key] ?? fallbackDictionary[key] ?? key;
      return interpolate(template, params);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: translate
    }),
    [language, translate]
  );

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
};

export const useLocalizationContext = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error("useLocalizationContext must be used within LocalizationProvider");
  }
  return context;
};
