"use client";

import { LANGUAGES } from "@/lib/i18n";
import { useLanguage } from "./LanguageProvider";

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex justify-end">
      <div
        className="inline-flex rounded-xl border border-stone-200 bg-white p-1 shadow-sm"
        role="group"
        aria-label={t.languageSwitcherAria}
      >
        {LANGUAGES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLanguage(code)}
            className={`min-h-9 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              language === code
                ? "bg-amber-600 text-white"
                : "text-stone-600 hover:bg-stone-50"
            }`}
          >
            {t.languageNames[code]}
          </button>
        ))}
      </div>
    </div>
  );
}
