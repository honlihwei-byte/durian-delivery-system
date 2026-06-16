"use client";

import type { ReactNode } from "react";
import { LanguageProvider } from "./LanguageProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";

type CustomerPageShellProps = {
  children: ReactNode;
};

export function CustomerPageShell({ children }: CustomerPageShellProps) {
  return (
    <LanguageProvider>
      <div className="mx-auto w-full max-w-2xl px-4 pt-4">
        <LanguageSwitcher />
      </div>
      {children}
    </LanguageProvider>
  );
}
