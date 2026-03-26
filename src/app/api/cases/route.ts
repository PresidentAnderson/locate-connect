import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { applyInternalRateLimit } from "@/lib/api/internal-rate-limiter";

const caseCreateSchema = z.object({
  reporterFirstName: z.string().max(100).optional(),
  reporterLastName: z.string().max(100).optional(),
  reporterEmail: z.string().email().max(254).optional(),
  reporterPhone: z.string().max(30).optional(),
  reporterAddress: z.string().max(500).optional(),
  reporterRelationship: z.string().max(100).optional(),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  dateOfBirth: z.string().nullable().optional(),
  gender: z.string().max(50).nullable().optional(),
  heightCm: z.number().min(0).max(300).nullable().optional(),
  weightKg: z.number().min(0).max(500).nullable().optional(),
  hairColor: z.string().max(50).optional(),
  eyeColor: z.string().max(50).optional(),
  distinguishingFeatures: z.string().max(2000).optional(),
  lastSeenDate: z.string().min(1, "Last seen date is required"),
  lastSeenLocation: z.string().max(500).optional(),
  lastSeenLocationConfidence: z.enum(["unknown", "low", "medium", "high"]).optional(),
  lastSeenWitnessType: z.enum(["unknown", "self_reported", "family", "friend", "public", "law_enforcement", "camera", "other"]).optional(),
  locationDetails: z.string().max(2000).optional(),
  outOfCharacter: z.boolean().optional(),
  circumstances: z.string().max(5000).optional(),
  unverifiedNotes: z.string().max(5000).optional(),
  medicalConditions: z.array(z.string().max(200)).max(50).optional(),
  medications: z.array(z.string().max(200)).max(50).optional(),
  mentalHealthConditions: z.array(z.string().max(200)).max(50).optional(),
  isSuicidalRisk: z.boolean().optional(),
  contactEmails: z.array(z.string().email().max(254)).max(20).optional(),
  contactPhones: z.array(z.string().max(30)).max(20).optional(),
  contactFriends: z.array(z.object({
    name: z.string().max(200),
    relationship: z.string().max(100).optional(),
    contact: z.string().max(200).optional(),
  })).max(20).optional(),
  socialMediaAccounts: z.array(z.object({
    platform: z.string().max(100),
    handle: z.string().max(200),
  })).max(20).optional(),
  threats: z.array(z.object({
    name: z.string().max(200).optional(),
    relationship: z.string().max(100).optional(),
    description: z.string().max(2000).optional(),
  })).max(20).optional(),
  reporterLanguages: z.array(z.string().max(50)).max(10).optional(),
  reporterPreferredLanguage: z.string().max(50).optional(),
  reporterNeedsInterpreter: z.boolean().optional(),
  reporterOtherLanguage: z.string().max(100).optional(),
  subjectPrimaryLanguages: z.array(z.string().max(50)).max(10).optional(),
  subjectRespondsToLanguages: z.array(z.string().max(50)).max(10).optional(),
  subjectCanCommunicateOfficial: z.boolean().optional(),
  subjectOtherLanguage: z.string().max(100).optional(),
});

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
  lastSeenDate?: string;
  lastSeenLocation?: string;
  lastSeenLocationConfidence?: string;
  lastSeenWitnessType?: string;
  locationDetails?: string;
  outOfCharacter?: boolean;
  circumstances?: string;
  unverifiedNotes?: string;
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

const LAST_SEEN_CONFIDENCE = ["unknown", "low", "medium", "high"] as const;
const LAST_SEEN_WITNESS_TYPES = [
  "unknown",
  "self_reported",
  "family",
  "friend",
  "public",
  "law_enforcement",
  "camera",
  "other",
] as const;

type LastSeenConfidence = (typeof LAST_SEEN_CONFIDENCE)[number];
type LastSeenWitnessType = (typeof LAST_SEEN_WITNESS_TYPES)[number];

function parseLastSeenConfidence(value: string | undefined): LastSeenConfidence | Error {
  if (!value) return "unknown";
  if (LAST_SEEN_CONFIDENCE.includes(value as LastSeenConfidence)) {
    return value as LastSeenConfidence;
  }
  return new Error("Invalid last seen location confidence");
}

function parseLastSeenWitnessType(value: string | undefined): LastSeenWitnessType | Error {
  if (!value) return "unknown";
  if (LAST_SEEN_WITNESS_TYPES.includes(value as LastSeenWitnessType)) {
    return value as LastSeenWitnessType;
  }
  return new Error("Invalid last seen witness type");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 case creations per minute per user
  const rateLimited = applyInternalRateLimit(`cases:create:${user.id}`, { limit: 10, windowSeconds: 60 });
  if (rateLimited) return rateLimited;

  const rawBody = await request.json();
  const parsed = caseCreateSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const body = parsed.data as CasePayload;

  const lastSeenLocationConfidence = parseLastSeenConfidence(
    body.lastSeenLocationConfidence
  );
  if (lastSeenLocationConfidence instanceof Error) {
    return NextResponse.json(
      { error: lastSeenLocationConfidence.message },
      { status: 400 }
    );
  }

  const lastSeenWitnessType = parseLastSeenWitnessType(body.lastSeenWitnessType);
  if (lastSeenWitnessType instanceof Error) {
    return NextResponse.json(
      { error: lastSeenWitnessType.message },
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

  const reportedFacts = {
    reporter: {
      relationship: body.reporterRelationship || null,
      languages: body.reporterLanguages || [],
      preferredLanguage: body.reporterPreferredLanguage || null,
      needsInterpreter: body.reporterNeedsInterpreter ?? false,
    },
    subject: {
      name: {
        first: body.firstName,
        last: body.lastName,
      },
      dateOfBirth: body.dateOfBirth || null,
      gender: body.gender || null,
      physical: {
        heightCm: body.heightCm ?? null,
        weightKg: body.weightKg ?? null,
        hairColor: body.hairColor || null,
        eyeColor: body.eyeColor || null,
        distinguishingFeatures: body.distinguishingFeatures || null,
      },
      medical: {
        conditions: body.medicalConditions || [],
        medications: body.medications || [],
        mentalHealth: body.mentalHealthConditions || [],
        isSuicidalRisk: body.isSuicidalRisk ?? false,
      },
      languages: {
        primary: body.subjectPrimaryLanguages || [],
        respondsTo: body.subjectRespondsToLanguages || [],
        canCommunicateOfficial: body.subjectCanCommunicateOfficial ?? true,
      },
    },
    lastSeen: {
      dateTime: body.lastSeenDate,
      location: body.lastSeenLocation || null,
      locationConfidence: lastSeenLocationConfidence,
      witnessType: lastSeenWitnessType,
    },
    contacts: {
      emails: body.contactEmails || [],
      phones: body.contactPhones || [],
      friends: body.contactFriends || [],
    },
  };

  const unverifiedNotes = {
    locationDetails: body.locationDetails || null,
    circumstances: body.circumstances || null,
    outOfCharacter: body.outOfCharacter ?? null,
    threats: body.threats || [],
    notes: body.unverifiedNotes || null,
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
    last_seen_location_confidence: lastSeenLocationConfidence,
    last_seen_witness_type: lastSeenWitnessType,
    intake_reported_facts: reportedFacts,
    intake_unverified_notes: unverifiedNotes,
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
