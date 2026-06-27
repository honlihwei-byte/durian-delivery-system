"use client";

import type { ReactNode } from "react";
import { LanguageProvider, useLanguage } from "./LanguageProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";

type CustomerPageShellProps = {
  children: ReactNode;
};

function CustomerPageContent({ children }: CustomerPageShellProps) {
  const { isReady } = useLanguage();

  if (!isReady) {
    return <div className="min-h-screen bg-[#f7f3ea]" />;
  }

  return (
    <>
      <div className="mx-auto w-full max-w-2xl px-4 pt-4">
        <LanguageSwitcher />
      </div>
      {children}
    </>
  );
}

export function CustomerPageShell({ children }: CustomerPageShellProps) {
  return (
    <LanguageProvider>
      <CustomerPageContent>{children}</CustomerPageContent>
    </LanguageProvider>
  );
}
