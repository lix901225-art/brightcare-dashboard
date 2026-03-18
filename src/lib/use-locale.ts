"use client";

import { useCallback, useEffect, useState } from "react";
import { getLocale, setLocale, t as translate, type Locale } from "./i18n";

/**
 * React hook for reactive i18n — re-renders on locale change.
 *
 * Usage:
 *   const { t, locale, changeLocale } = useLocale();
 *   return <h1>{t("nav.dashboard")}</h1>;
 */
export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    setLocaleState(getLocale());

    const handler = () => setLocaleState(getLocale());
    window.addEventListener("locale-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("locale-change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const changeLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
    setLocaleState(newLocale);
  }, []);

  const t = useCallback(
    (key: string) => translate(key, locale),
    [locale],
  );

  return { locale, changeLocale, t };
}
