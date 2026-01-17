/**
 * Internationalization API Route
 * EN/FR + Indigenous languages support
 */

import { NextRequest, NextResponse } from "next/server";
import { i18nService } from "@/lib/services/i18n-service";
import type { SupportedLanguage } from "@/types/compliance.types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const language = (searchParams.get("language") || "en") as SupportedLanguage;

    switch (action) {
      case "languages":
        const languages = i18nService.getAvailableLanguages();
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
        const translation = i18nService.t(namespace, key, {}, language);
        return NextResponse.json({ translation });

      case "namespace":
        const ns = searchParams.get("namespace") || "common";
        const translations = i18nService.getNamespace(ns, language);
        return NextResponse.json(translations);

      case "coverage":
        const coverage = i18nService.getTranslationCoverage(language);
        return NextResponse.json(coverage);

      case "missing":
        const missing = i18nService.getMissingTranslations(language);
        return NextResponse.json(missing);

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

    switch (action) {
      case "formatDate":
        if (!date) {
          return NextResponse.json({ error: "Date required" }, { status: 400 });
        }
        const formattedDate = i18nService.formatDate(
          new Date(date),
          format || "long",
          language || "en"
        );
        return NextResponse.json({ formatted: formattedDate });

      case "formatNumber":
        if (number === undefined) {
          return NextResponse.json({ error: "Number required" }, { status: 400 });
        }
        const formattedNumber = i18nService.formatNumber(
          number,
          language || "en"
        );
        return NextResponse.json({ formatted: formattedNumber });

      case "detect":
        const { text } = body;
        if (!text) {
          return NextResponse.json({ error: "Text required" }, { status: 400 });
        }
        const detected = i18nService.detectLanguage(text);
        return NextResponse.json({ language: detected });

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
