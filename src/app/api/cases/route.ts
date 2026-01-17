import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface CasePayload {
  reporterRelationship?: string;
  firstName?: string;
  lastName?: string;
  lastSeenDate?: string;
  lastSeenLocation?: string;
  circumstances?: string;
  reporterLanguages?: string[];
  reporterPreferredLanguage?: string;
  reporterNeedsInterpreter?: boolean;
  reporterOtherLanguage?: string;
  subjectPrimaryLanguages?: string[];
  subjectRespondsToLanguages?: string[];
  subjectCanCommunicateOfficial?: boolean;
  subjectOtherLanguage?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CasePayload;

  if (!body.firstName || !body.lastName || !body.lastSeenDate) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const insertPayload = {
    reporter_id: user.id,
    reporter_relationship: body.reporterRelationship || null,
    first_name: body.firstName,
    last_name: body.lastName,
    last_seen_date: body.lastSeenDate,
    last_seen_location: body.lastSeenLocation || null,
    circumstances: body.circumstances || null,
    reporter_languages: body.reporterLanguages || [],
    reporter_preferred_language: body.reporterPreferredLanguage || null,
    reporter_needs_interpreter: body.reporterNeedsInterpreter ?? false,
    reporter_other_language: body.reporterOtherLanguage || null,
    subject_primary_languages: body.subjectPrimaryLanguages || [],
    subject_responds_to_languages: body.subjectRespondsToLanguages || [],
    subject_can_communicate_official: body.subjectCanCommunicateOfficial ?? true,
    subject_other_language: body.subjectOtherLanguage || null,
  };

  const { data, error } = await supabase
    .from("cases")
    .insert(insertPayload)
    .select("id, case_number")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
