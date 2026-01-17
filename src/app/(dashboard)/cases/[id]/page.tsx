import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CaseResolutionPanel from "@/components/cases/CaseResolutionPanel";
import CaseEvidencePanel from "@/components/cases/CaseEvidencePanel";
import CaseWeatherPanel from "@/components/cases/CaseWeatherPanel";
import CaseResourcesPanel from "@/components/cases/CaseResourcesPanel";
import CaseTimelinePanel from "@/components/cases/CaseTimelinePanel";
import { cn } from "@/lib";

interface CasePageProps {
  params: Promise<{ id: string }>;
}

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function fetchCase(caseId: string) {
  const supabase = await createClient();
  const query = supabase
    .from("cases")
    .select(
      "id, case_number, first_name, last_name, status, priority_level, last_seen_date, last_seen_city, last_seen_province, is_locked"
    );

  const { data, error } = uuidRegex.test(caseId)
    ? await query.eq("id", caseId).single()
    : await query.eq("case_number", caseId).single();

  if (error || !data) {
    return null;
  }

  return data as {
    id: string;
    case_number: string;
    first_name: string;
    last_name: string;
    status: string;
    priority_level: string;
    last_seen_date: string;
    last_seen_city: string | null;
    last_seen_province: string | null;
    is_locked: boolean;
  };
}

export default async function CaseDetailPage({ params }: CasePageProps) {
  const { id } = await params;
  const caseRecord = await fetchCase(id);

  if (!caseRecord) {
    notFound();
  }

  const lastSeen = [caseRecord.last_seen_city, caseRecord.last_seen_province]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">Case {caseRecord.case_number}</p>
            <h1 className="text-2xl font-semibold text-gray-900">
              {caseRecord.first_name} {caseRecord.last_name}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Last seen {lastSeen || "Unknown location"} on{" "}
              {new Date(caseRecord.last_seen_date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              {caseRecord.status.replace(/_/g, " ")}
            </span>
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">
              {caseRecord.priority_level.replace(/_/g, " ")}
            </span>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                caseRecord.is_locked
                  ? "bg-rose-100 text-rose-700"
                  : "bg-emerald-100 text-emerald-700"
              )}
            >
              {caseRecord.is_locked ? "Locked" : "Open"}
            </span>
          </div>
        </div>
      </div>

      <CaseResolutionPanel caseId={caseRecord.id} />

      <CaseTimelinePanel caseId={caseRecord.id} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CaseEvidencePanel caseId={caseRecord.id} />
        <CaseWeatherPanel caseId={caseRecord.id} />
      </div>

      <CaseResourcesPanel province={caseRecord.last_seen_province} />
    </div>
  );
}
