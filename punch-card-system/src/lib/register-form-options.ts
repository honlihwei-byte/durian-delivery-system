import { COMPANY_TIMEZONE_OPTIONS } from "@/lib/company-timezones";

/** Stored in companies.business_type — display via i18n only. */
export const REGISTER_BUSINESS_TYPES = [
  "retail",
  "fnb",
  "services",
  "warehouse",
  "office",
  "other",
] as const;

export type RegisterBusinessType = (typeof REGISTER_BUSINESS_TYPES)[number];

export const REGISTER_COUNTRY_CODES = ["MY", "SG", "ID", "TH", "BN"] as const;

export type RegisterCountryCode = (typeof REGISTER_COUNTRY_CODES)[number];

export const COUNTRY_DEFAULT_TIMEZONE: Record<RegisterCountryCode, string> = {
  MY: "Asia/Kuala_Lumpur",
  SG: "Asia/Singapore",
  ID: "Asia/Jakarta",
  TH: "Asia/Bangkok",
  BN: "Asia/Brunei",
};

const TIMEZONE_TO_COUNTRY: Partial<Record<string, RegisterCountryCode>> = {
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Singapore": "SG",
  "Asia/Jakarta": "ID",
  "Asia/Bangkok": "TH",
  "Asia/Brunei": "BN",
};

/** Staff estimate ranges stored in companies.staff_estimate. */
export const REGISTER_STAFF_ESTIMATES = ["1-10", "11-30", "31-50", "51-100", "100+"] as const;

/** Timezones shown on register (auto-selected by country; user may override). */
export const REGISTER_TIMEZONE_OPTIONS: string[] = [
  ...Object.values(COUNTRY_DEFAULT_TIMEZONE),
  ...COMPANY_TIMEZONE_OPTIONS.filter(
    (tz) => !Object.values(COUNTRY_DEFAULT_TIMEZONE).includes(tz as (typeof COUNTRY_DEFAULT_TIMEZONE)[RegisterCountryCode]),
  ),
];

export function detectRegisterDefaults(): {
  country: RegisterCountryCode;
  timezone: string;
} {
  if (typeof Intl === "undefined") {
    return { country: "MY", timezone: COUNTRY_DEFAULT_TIMEZONE.MY };
  }
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const country = TIMEZONE_TO_COUNTRY[tz] ?? "MY";
  return {
    country,
    timezone: COUNTRY_DEFAULT_TIMEZONE[country],
  };
}

export function timezoneForCountry(country: RegisterCountryCode): string {
  return COUNTRY_DEFAULT_TIMEZONE[country];
}
