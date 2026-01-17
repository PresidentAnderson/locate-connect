import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface CasePayload {
  reporterFirstName?: string;
  reporterLastName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  reporterAddress?: string;
  reporterRelationship?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  hairColor?: string;
  eyeColor?: string;
  distinguishingFeatures?: string;
  photoUrl?: string | null;
  lastSeenDate?: string;
  lastSeenLocation?: string;
  locationDetails?: string;
  outOfCharacter?: boolean;
  circumstances?: string;
  medicalConditions?: string[];
  medications?: string[];
  mentalHealthConditions?: string[];
  isSuicidalRisk?: boolean;
  contactEmails?: string[];
  contactPhones?: string[];
  contactFriends?: { name: string; relationship?: string; contact?: string }[];
  socialMediaAccounts?: { platform: string; handle: string }[];
  threats?: { name?: string; relationship?: string; description?: string }[];
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

  const intakeMetadata = {
    reporter: {
      firstName: body.reporterFirstName || null,
      lastName: body.reporterLastName || null,
      email: body.reporterEmail || null,
      phone: body.reporterPhone || null,
      address: body.reporterAddress || null,
    },
    circumstances: {
      locationDetails: body.locationDetails || null,
      outOfCharacter: body.outOfCharacter ?? null,
    },
    contacts: {
      emails: body.contactEmails || [],
      phones: body.contactPhones || [],
      friends: body.contactFriends || [],
    },
    threats: body.threats || [],
  };

  const hasIntakeMetadata =
    intakeMetadata.reporter.firstName ||
    intakeMetadata.reporter.lastName ||
    intakeMetadata.reporter.email ||
    intakeMetadata.reporter.phone ||
    intakeMetadata.reporter.address ||
    intakeMetadata.circumstances.locationDetails ||
    intakeMetadata.circumstances.outOfCharacter !== null ||
    intakeMetadata.contacts.emails.length > 0 ||
    intakeMetadata.contacts.phones.length > 0 ||
    intakeMetadata.contacts.friends.length > 0 ||
    intakeMetadata.threats.length > 0;

  const insertPayload = {
    reporter_id: user.id,
    reporter_relationship: body.reporterRelationship || null,
    first_name: body.firstName,
    last_name: body.lastName,
    date_of_birth: body.dateOfBirth || null,
    gender: body.gender || null,
    height_cm: body.heightCm ?? null,
    weight_kg: body.weightKg ?? null,
    hair_color: body.hairColor || null,
    eye_color: body.eyeColor || null,
    distinguishing_features: body.distinguishingFeatures || null,
    primary_photo_url: body.photoUrl || null,
    last_seen_date: body.lastSeenDate,
    last_seen_location: body.lastSeenLocation || null,
    circumstances: body.circumstances || null,
    medical_conditions: body.medicalConditions || [],
    medications: body.medications || [],
    mental_health_conditions: body.mentalHealthConditions || [],
    is_suicidal_risk: body.isSuicidalRisk ?? false,
    suspected_foul_play: (body.threats?.length ?? 0) > 0,
    social_media_accounts: body.socialMediaAccounts || [],
    intake_metadata: hasIntakeMetadata ? intakeMetadata : null,
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
