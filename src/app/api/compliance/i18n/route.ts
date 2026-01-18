/**
 * Internationalization API Route
 * EN/FR + Indigenous languages support
 */

import { NextRequest, NextResponse } from "next/server";
import { i18nService } from "@/lib/services/i18n-service";
import type { SupportedLanguage, TranslationNamespace } from "@/types/compliance.types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const language = (searchParams.get("language") || "en") as SupportedLanguage;

    // Set the language for translations
    i18nService.setLanguage(language);

    switch (action) {
      case "languages":
        const languages = i18nService.getEnabledLanguages();
        return NextResponse.json(languages);

      case "indigenous":
        const indigenous = i18nService.getIndigenousLanguages();
        return NextResponse.json(indigenous);

      case "translate":
        const namespace = searchParams.get("namespace") || "common";
        const key = searchParams.get("key");
        if (!key) {
          return NextResponse.json({ error: "Key required" }, { status: 400 });
        }
        const translation = i18nService.t(namespace as keyof TranslationNamespace, key);
        return NextResponse.json({ translation });

      case "namespace":
        const ns = searchParams.get("namespace") || "common";
        const translations = i18nService.getNamespace(ns as keyof TranslationNamespace);
        return NextResponse.json(translations);

      case "config":
        const config = i18nService.getLanguageConfig(language);
        return NextResponse.json(config);

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[API] I18n error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, language, date, format, number } = body;

    // Set the language for formatting
    if (language) {
      i18nService.setLanguage(language as SupportedLanguage);
    }

    switch (action) {
      case "formatDate":
        if (!date) {
          return NextResponse.json({ error: "Date required" }, { status: 400 });
        }
        const formattedDate = i18nService.formatDate(
          new Date(date),
          format || "long"
        );
        return NextResponse.json({ formatted: formattedDate });

      case "formatNumber":
        if (number === undefined) {
          return NextResponse.json({ error: "Number required" }, { status: 400 });
        }
        const formattedNumber = i18nService.formatNumber(number);
        return NextResponse.json({ formatted: formattedNumber });

      case "direction":
        return NextResponse.json({ direction: i18nService.getDirection() });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[API] I18n error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
