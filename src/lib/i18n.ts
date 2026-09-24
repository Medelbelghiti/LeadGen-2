import en from "@/locales/en.json";
import fr from "@/locales/fr.json";

export type Locale = "en" | "fr";
export const LOCALES: Locale[] = ["en", "fr"];
export const DEFAULT_LOCALE: Locale = "en";

const dictionaries: Record<Locale, Record<string, string>> = { en, fr };

export function isLocale(v: string | undefined | null): v is Locale {
  return v === "en" || v === "fr";
}

export function getDictionary(locale: Locale): Record<string, string> {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export function translate(locale: Locale, key: string, fallback?: string): string {
  const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
  return dict[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? fallback ?? key;
}

export function dirFor(locale: Locale): "ltr" | "rtl" {
  return "ltr";
}
