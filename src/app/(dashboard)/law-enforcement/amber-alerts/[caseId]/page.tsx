import { createClient } from "@/lib/supabase/server";
import { AmberAlertRequestPanel } from "@/components/alerts/AmberAlertRequestPanel";

interface AmberAlertPageProps {
  params: { caseId: string };
}

export default async function AmberAlertCasePage({ params }: AmberAlertPageProps) {
  const supabase = await createClient();

  const { data: caseRecord, error } = await supabase
    .from("cases")
    .select(
      [
        "id",
        "case_number",
        "first_name",
        "last_name",
        "age_at_disappearance",
        "gender",
        "height_cm",
        "weight_kg",
        "hair_color",
        "eye_color",
        "distinguishing_features",
        "clothing_last_seen",
        "primary_photo_url",
        "last_seen_date",
        "last_seen_location",
        "last_seen_city",
        "last_seen_province",
        "circumstances",
      ].join(",")
    )
    .eq("id", params.caseId)
    .single();

  if (error || !caseRecord) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">AMBER Alert Request</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Unable to load case details. Verify the case ID and try again.
        </div>
      </div>
    );
  }

  const caseData = {
    id: caseRecord.id,
    caseNumber: caseRecord.case_number,
    firstName: caseRecord.first_name,
    lastName: caseRecord.last_name,
    age: caseRecord.age_at_disappearance ?? 0,
    gender: caseRecord.gender ?? "unknown",
    heightCm: caseRecord.height_cm ?? undefined,
    weightKg: caseRecord.weight_kg ?? undefined,
    hairColor: caseRecord.hair_color ?? undefined,
    eyeColor: caseRecord.eye_color ?? undefined,
    distinguishingFeatures: caseRecord.distinguishing_features ?? undefined,
    clothingLastSeen: caseRecord.clothing_last_seen ?? undefined,
    primaryPhotoUrl: caseRecord.primary_photo_url ?? undefined,
    lastSeenDate: caseRecord.last_seen_date,
    lastSeenLocation: caseRecord.last_seen_location ?? undefined,
    lastSeenCity: caseRecord.last_seen_city ?? undefined,
    lastSeenProvince: caseRecord.last_seen_province ?? undefined,
    circumstances: caseRecord.circumstances ?? undefined,
  };

  return <AmberAlertRequestPanel caseData={caseData} />;
}
