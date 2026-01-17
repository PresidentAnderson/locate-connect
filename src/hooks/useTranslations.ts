"use client";

import { useTranslations as useNextTranslations } from "next-intl";
import type { Namespace } from "@/lib/i18n";

export function useTranslations(namespace: Namespace) {
  return useNextTranslations(namespace);
}
