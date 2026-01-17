"use client";

import { translate } from "@/lib/i18n";
import type { Namespace } from "@/lib/i18n";
import { useLocale } from "@/components/i18n/LocaleProvider";

export function useTranslations(namespace: Namespace) {
  const { locale } = useLocale();

  return (key: string) => translate(locale, namespace, key);
}
