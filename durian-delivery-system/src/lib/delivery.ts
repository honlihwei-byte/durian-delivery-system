import type { Language } from "@/lib/i18n";

const MY_TIMEZONE = "Asia/Kuala_Lumpur";

const DATE_LOCALES: Record<Language, string> = {
  ms: "ms-MY",
  zh: "zh-CN",
  en: "en-MY",
};

export function getTomorrowDateMY(now = new Date()): string {
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: MY_TIMEZONE,
  }).format(now);
  const [year, month, day] = todayStr.split("-").map(Number);
  const tomorrow = new Date(year, month - 1, day + 1);

  return [
    tomorrow.getFullYear(),
    String(tomorrow.getMonth() + 1).padStart(2, "0"),
    String(tomorrow.getDate()).padStart(2, "0"),
  ].join("-");
}

export function formatDeliveryDateMY(
  dateValue: string,
  language: Language = "ms",
): string {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat(DATE_LOCALES[language], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
