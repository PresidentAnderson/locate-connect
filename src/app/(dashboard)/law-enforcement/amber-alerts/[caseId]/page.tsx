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

  const record = caseRecord as unknown as Record<string, unknown>;
  const caseData = {
    id: record.id as string,
    caseNumber: record.case_number as string,
    firstName: record.first_name as string,
    lastName: record.last_name as string,
    age: (record.age_at_disappearance as number) ?? 0,
    gender: (record.gender as string) ?? "unknown",
    heightCm: record.height_cm as number | undefined,
    weightKg: record.weight_kg as number | undefined,
    hairColor: record.hair_color as string | undefined,
    eyeColor: record.eye_color as string | undefined,
    distinguishingFeatures: record.distinguishing_features as string | undefined,
    clothingLastSeen: record.clothing_last_seen as string | undefined,
    primaryPhotoUrl: record.primary_photo_url as string | undefined,
    lastSeenDate: record.last_seen_date as string,
    lastSeenLocation: record.last_seen_location as string | undefined,
    lastSeenCity: record.last_seen_city as string | undefined,
    lastSeenProvince: record.last_seen_province as string | undefined,
    circumstances: record.circumstances as string | undefined,
  };

  return <AmberAlertRequestPanel caseData={caseData} />;
}
