import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { AmberAlertRequest } from "@/components/alerts/AmberAlertForm";

function buildUpdateSummary(request: AmberAlertRequest) {
  const targetArea = request.targetProvinces.length > 0
    ? request.targetProvinces.join(", ")
    : "local jurisdiction";

  const vehicleNote = request.vehicleInvolved
    ? `Vehicle: ${request.vehicleMake || "unknown"} ${request.vehicleModel || ""}`.trim()
    : "No vehicle reported";

  return [
    `AMBER Alert requested for case ${request.caseNumber}.`,
    `Abduction at ${request.abductionLocation}, ${request.abductionCity}.`,
    `Target area: ${targetArea}.`,
    vehicleNote,
  ].join(" ");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["law_enforcement", "admin", "developer"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as AmberAlertRequest;

  if (!body.caseId || !body.caseNumber) {
    return NextResponse.json({ error: "Missing case details" }, { status: 400 });
  }

  const { data: caseRecord, error: caseError } = await supabase
    .from("cases")
    .select("id, is_amber_alert")
    .eq("id", body.caseId)
    .single();

  if (caseError || !caseRecord) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  if (caseRecord.is_amber_alert) {
    return NextResponse.json(
      { error: "AMBER Alert already active for this case" },
      { status: 409 }
    );
  }

  const { error: updateError } = await supabase
    .from("cases")
    .update({ is_amber_alert: true })
    .eq("id", body.caseId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const summary = buildUpdateSummary(body);

  const { error: updateLogError } = await supabase.from("case_updates").insert({
    case_id: body.caseId,
    author_id: user.id,
    update_type: "amber_alert",
    title: "AMBER Alert Requested",
    content: summary,
    is_public: true,
    is_law_enforcement_only: false,
  });

  if (updateLogError) {
    return NextResponse.json({ error: updateLogError.message }, { status: 500 });
  }

  return NextResponse.json({ status: "submitted" });
}
