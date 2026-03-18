/**
 * BrightCare OS — Multilingual i18n system
 *
 * Reflects Greater Vancouver demographics:
 * - English (default)
 * - Simplified Chinese (简体中文)
 * - Traditional Chinese (繁體中文)
 * - Punjabi (ਪੰਜਾਬੀ)
 * - Tagalog (Filipino)
 */

import en from "@/messages/en/common.json";
import zhCN from "@/messages/zh-CN/common.json";
import zhTW from "@/messages/zh-TW/common.json";
import pa from "@/messages/pa/common.json";
import tl from "@/messages/tl/common.json";

export type Locale = "en" | "zh-CN" | "zh-TW" | "pa" | "tl";

export const SUPPORTED_LANGUAGES = [
  { code: "en" as Locale, label: "English", nativeLabel: "English" },
  { code: "zh-CN" as Locale, label: "Chinese (Simplified)", nativeLabel: "简体中文" },
  { code: "zh-TW" as Locale, label: "Chinese (Traditional)", nativeLabel: "繁體中文" },
  { code: "pa" as Locale, label: "Punjabi", nativeLabel: "ਪੰਜਾਬੀ" },
  { code: "tl" as Locale, label: "Tagalog", nativeLabel: "Tagalog" },
] as const;

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  pa: "ਪੰਜਾਬੀ",
  tl: "Tagalog",
};

// Flattened translation maps built from JSON files
type FlatMap = Record<string, string>;

function flatten(obj: Record<string, unknown>, prefix = ""): FlatMap {
  const result: FlatMap = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      result[fullKey] = value;
    } else if (typeof value === "object" && value !== null) {
      Object.assign(result, flatten(value as Record<string, unknown>, fullKey));
    }
  }
  return result;
}

const translations: Record<Locale, FlatMap> = {
  en: flatten(en),
  "zh-CN": flatten(zhCN),
  "zh-TW": flatten(zhTW),
  pa: flatten(pa),
  tl: flatten(tl),
};

const STORAGE_KEY = "brightcare.locale";

export function getLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in translations) return stored as Locale;
  return "en";
}

export function setLocale(locale: Locale): void {
  localStorage.setItem(STORAGE_KEY, locale);
  // Update <html lang> attribute
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
  window.dispatchEvent(new Event("locale-change"));
}

/**
 * Translate a dot-notation key.
 * Examples: t("nav.dashboard"), t("common.save"), t("billing.title")
 */
export function t(key: string, locale?: Locale): string {
  const l = locale || getLocale();
  return translations[l]?.[key] || translations.en[key] || key;
}
