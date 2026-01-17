import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, normalizeLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

type LanguagePreferencePayload = {
  preferred_language?: string | null;
  additional_languages?: string[] | null;
  communication_language?: string | null;
  needs_interpreter?: boolean | null;
};

function isSupportedLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

function parseLocale(
  value: string | null | undefined,
  fallback: Locale,
  field: string
): Locale | Error {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value !== "string") {
    return new Error(`Invalid locale for ${field}`);
  }

  const normalized = normalizeLocale(value);
  if (!isSupportedLocale(normalized)) {
    return new Error(`Invalid locale for ${field}`);
  }

  return normalized;
}

function parseLocales(
  values: string[] | null | undefined
): { locales: Locale[]; error?: Error } {
  if (!values || values.length === 0) {
    return { locales: [] };
  }

  if (values.some((value) => typeof value !== "string")) {
    return { locales: [], error: new Error("Invalid locale in additional_languages") };
  }

  const normalized = values.map((value) => normalizeLocale(value));
  const invalid = normalized.find((value) => !isSupportedLocale(value));
  if (invalid) {
    return { locales: [], error: new Error("Invalid locale in additional_languages") };
  }

  const unique = Array.from(new Set(normalized));
  return { locales: unique };
}

function toResponse(data: {
  preferred_language: Locale;
  additional_languages: Locale[];
  communication_language: Locale;
  needs_interpreter: boolean;
  updated_at: string | null;
}) {
  return {
    locale: data.preferred_language,
    updatedAt: data.updated_at,
    preferred_language: data.preferred_language,
    additional_languages: data.additional_languages,
    communication_language: data.communication_language,
    needs_interpreter: data.needs_interpreter,
  };
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("preferred_language, additional_languages, communication_language, needs_interpreter, updated_at")
    .eq("id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      toResponse({
        preferred_language: DEFAULT_LOCALE,
        additional_languages: [],
        communication_language: DEFAULT_LOCALE,
        needs_interpreter: false,
        updated_at: null,
      })
    );
  }

  const preferred = parseLocale(data.preferred_language, DEFAULT_LOCALE, "preferred_language");
  if (preferred instanceof Error) {
    return NextResponse.json({ error: preferred.message }, { status: 400 });
  }

  const communication = parseLocale(
    data.communication_language,
    preferred,
    "communication_language"
  );
  if (communication instanceof Error) {
    return NextResponse.json({ error: communication.message }, { status: 400 });
  }

  const { locales, error: localesError } = parseLocales(data.additional_languages);
  if (localesError) {
    return NextResponse.json({ error: localesError.message }, { status: 400 });
  }

  return NextResponse.json(
    toResponse({
      preferred_language: preferred,
      additional_languages: locales,
      communication_language: communication,
      needs_interpreter: data.needs_interpreter ?? false,
      updated_at: data.updated_at ?? null,
    })
  );
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as LanguagePreferencePayload;

  const preferred = parseLocale(body.preferred_language, DEFAULT_LOCALE, "preferred_language");
  if (preferred instanceof Error) {
    return NextResponse.json({ error: preferred.message }, { status: 400 });
  }

  const communication = parseLocale(
    body.communication_language,
    preferred,
    "communication_language"
  );
  if (communication instanceof Error) {
    return NextResponse.json({ error: communication.message }, { status: 400 });
  }

  const { locales, error: localesError } = parseLocales(body.additional_languages);
  if (localesError) {
    return NextResponse.json({ error: localesError.message }, { status: 400 });
  }

  const updateData = {
    preferred_language: preferred,
    additional_languages: locales,
    communication_language: communication,
    needs_interpreter: body.needs_interpreter ?? false,
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id)
    .select("preferred_language, additional_languages, communication_language, needs_interpreter, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    toResponse({
      preferred_language: data.preferred_language ?? preferred,
      additional_languages: data.additional_languages ?? locales,
      communication_language: data.communication_language ?? communication,
      needs_interpreter: data.needs_interpreter ?? false,
      updated_at: data.updated_at ?? null,
    })
  );
}
