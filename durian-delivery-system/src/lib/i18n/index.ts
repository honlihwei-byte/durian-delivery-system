import type { Language } from "./types";
import { LANGUAGE_STORAGE_KEY } from "./types";

export type { Language, Translations } from "./types";
export { translations, interpolate } from "./translations";
export { LANGUAGE_STORAGE_KEY, LANGUAGES } from "./types";

export function detectBrowserLanguage(): Language {
  if (typeof navigator === "undefined") {
    return "ms";
  }

  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("zh")) return "zh";
  if (lang.startsWith("en")) return "en";
  return "ms";
}

export function readStoredLanguage(): Language | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === "ms" || stored === "zh" || stored === "en") {
    return stored;
  }

  return null;
}

export function resolveInitialLanguage(): Language {
  return readStoredLanguage() ?? detectBrowserLanguage();
}

export function storeLanguage(language: Language): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

export function languageToHtmlLang(language: Language): string {
  switch (language) {
    case "zh":
      return "zh-Hans";
    case "en":
      return "en";
    default:
      return "ms";
  }
}
