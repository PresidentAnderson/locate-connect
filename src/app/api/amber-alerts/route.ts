import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { amberDistributionService } from "@/lib/services/amber-distribution";
import type { AmberAlertRequest } from "@/components/alerts/AmberAlertForm";
import type { AmberAlert, AmberDistributionChannel } from "@/types";

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

// Map form distribution channels to enum values
function mapDistributionChannels(formChannels: string[]): AmberDistributionChannel[] {
  const channelMap: Record<string, AmberDistributionChannel> = {
    'wea': 'wea',
    'eas': 'eas',
    'highway': 'highway_signs',
    'social': 'social_media',
    'partner': 'partner_alert',
    'email': 'email',
    'sms': 'sms',
    'push': 'push_notification',
  };

  return formChannels
    .map(c => channelMap[c])
    .filter((c): c is AmberDistributionChannel => c !== undefined);
}

/**
 * GET /api/amber-alerts
 * List AMBER alerts
 */
export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const province = searchParams.get("province");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("page_size") || "20"), 100);

  let query = supabase
    .from("amber_alerts")
    .select("*, case:cases(id, case_number, first_name, last_name, status)", { count: "exact" });

  if (status) {
    query = query.eq("alert_status", status);
  }

  if (province) {
    query = query.eq("abduction_province", province);
  }

  // Pagination
  const offset = (page - 1) * pageSize;
  query = query.range(offset, offset + pageSize - 1);
  query = query.order("issued_at", { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data as AmberAlert[],
    total: count || 0,
    page,
    page_size: pageSize,
  });
}

/**
 * POST /api/amber-alerts
 * Create a new AMBER alert and trigger distribution
 */
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
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || !["law_enforcement", "admin", "developer"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as AmberAlertRequest;

  if (!body.caseId || !body.caseNumber) {
    return NextResponse.json({ error: "Missing case details" }, { status: 400 });
  }

  // Get case details
  const { data: caseRecord, error: caseError } = await supabase
    .from("cases")
    .select("id, is_amber_alert, first_name, last_name, primary_photo_url")
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

  // Map distribution channels from form
  const distributionChannels = mapDistributionChannels(body.distributionChannels || []);

  // Create the AMBER alert record
  const { data: amberAlert, error: alertError } = await supabase
    .from("amber_alerts")
    .insert({
      case_id: body.caseId,
      child_name: `${caseRecord.first_name} ${caseRecord.last_name}`,
      child_age: body.childAge,
      child_gender: body.childGender,
      child_description: body.physicalDescription,
      child_photo_url: caseRecord.primary_photo_url,
      abduction_date: body.abductionDate,
      abduction_time: body.abductionTime,
      abduction_location: body.abductionLocation,
      abduction_city: body.abductionCity,
      abduction_province: body.abductionProvince,
      abduction_circumstances: body.circumstances,
      suspect_name: body.suspectName,
      suspect_description: body.suspectDescription,
      suspect_relationship: body.suspectRelationship,
      vehicle_involved: body.vehicleInvolved || false,
      vehicle_make: body.vehicleMake,
      vehicle_model: body.vehicleModel,
      vehicle_year: body.vehicleYear,
      vehicle_color: body.vehicleColor,
      vehicle_license_plate: body.vehicleLicensePlate,
      vehicle_license_province: body.vehicleLicenseProvince,
      target_provinces: body.targetProvinces || [],
      distribution_channels: distributionChannels,
      requesting_officer_id: user.id,
      requesting_officer_name: body.contactName || profile.full_name,
      requesting_officer_badge: body.badgeNumber,
      requesting_officer_phone: body.contactPhone,
      requesting_officer_agency: body.agency,
    })
    .select()
    .single();

  if (alertError) {
    console.error("AMBER Alert creation error:", alertError);
    return NextResponse.json({ error: alertError.message }, { status: 500 });
  }

  // Update case with AMBER alert flag
  const { error: updateError } = await supabase
    .from("cases")
    .update({ is_amber_alert: true })
    .eq("id", body.caseId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Create case update log
  const summary = buildUpdateSummary(body);
  await supabase.from("case_updates").insert({
    case_id: body.caseId,
    author_id: user.id,
    update_type: "amber_alert",
    title: "AMBER Alert Issued",
    content: summary,
    is_public: true,
    is_law_enforcement_only: false,
  });

  // Trigger distribution if channels were selected
  let distributionResult = null;
  if (distributionChannels.length > 0) {
    try {
      distributionResult = await amberDistributionService.distributeAlert({
        amber_alert_id: amberAlert.id,
        channels: distributionChannels,
        target_provinces: body.targetProvinces,
      });
    } catch (err) {
      console.error("Distribution error:", err);
      // Don't fail the request, distribution can be retried
    }
  }

  return NextResponse.json({
    status: "submitted",
    amber_alert: amberAlert,
    alert_number: amberAlert.alert_number,
    distribution: distributionResult,
  });
}
