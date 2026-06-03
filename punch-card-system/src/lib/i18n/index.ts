import { en } from "./en";
import { ms } from "./ms";
import { zh } from "./zh";
import {
  DEFAULT_LOCALE,
  PREFERRED_LANGUAGE_KEY,
  type Locale,
  type TranslationTree,
} from "./types";

export {
  DEFAULT_LOCALE,
  LOCALES,
  PREFERRED_LANGUAGE_KEY,
  type Locale,
  type TranslationTree,
} from "./types";

const catalogs: Record<Locale, TranslationTree> = { en, zh, ms };

function resolvePath(tree: TranslationTree, key: string): string | undefined {
  const parts = key.split(".").filter(Boolean);
  let cur: string | TranslationTree | undefined = tree;
  for (const part of parts) {
    if (cur == null || typeof cur === "string") return undefined;
    cur = cur[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "zh" || value === "ms";
}

export function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const raw = localStorage.getItem(PREFERRED_LANGUAGE_KEY);
    if (isLocale(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

export function storeLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFERRED_LANGUAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

/** Translate key with English fallback when missing. */
export function translate(locale: Locale, key: string): string {
  const primary = resolvePath(catalogs[locale], key);
  if (primary) return primary;
  const fallback = resolvePath(catalogs.en, key);
  if (fallback) return fallback;
  return key;
}

export function tForLocale(locale: Locale, key: string): string {
  return translate(locale, key);
}

/** Standalone translate (defaults to English). Prefer `useI18n().t` in client components. */
export function t(key: string, locale: Locale = DEFAULT_LOCALE): string {
  return translate(locale, key);
}
