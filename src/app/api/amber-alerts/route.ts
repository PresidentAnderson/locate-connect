// AMBER Alert API Routes
// LC-FEAT-026: AMBER Alert Integration
// GET /api/amber-alerts - List AMBER alert requests
// POST /api/amber-alerts - Create new AMBER alert request

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CreateAmberAlertRequest } from "@/types/amber-alert.types";
import {
  validateAlertRequest,
  extractCriteriaFromCase,
  AMBER_CRITERIA,
} from "@/lib/services/amber-alert-service";

/**
 * GET /api/amber-alerts
 * List AMBER alert requests (Law Enforcement only)
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !["law_enforcement", "admin", "developer"].includes(profile.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const caseId = searchParams.get("case_id");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("page_size") || "20");
  const offset = (page - 1) * pageSize;

  // Build query
  let query = supabase
    .from("amber_alert_requests")
    .select("*, cases(case_number, first_name, last_name)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  if (caseId) {
    query = query.eq("case_id", caseId);
  }

  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching AMBER alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      page_size: pageSize,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / pageSize),
    },
  });
}

/**
 * POST /api/amber-alerts
 * Create new AMBER alert request (Law Enforcement only)
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !["law_enforcement", "admin", "developer"].includes(profile.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: CreateAmberAlertRequest;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate request
  const validation = validateAlertRequest(body);
  if (!validation.valid) {
    return NextResponse.json(
      { error: "Validation failed", errors: validation.errors },
      { status: 400 }
    );
  }

  // Verify case exists and user has access
  const { data: caseData, error: caseError } = await supabase
    .from("cases")
    .select("*")
    .eq("id", body.case_id)
    .single();

  if (caseError || !caseData) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  // Extract AMBER criteria from case
  const criteria = extractCriteriaFromCase({
    age_at_disappearance: caseData.age_at_disappearance,
    suspected_abduction: caseData.suspected_abduction,
    suspected_foul_play: caseData.suspected_foul_play,
    is_minor: caseData.is_minor,
    first_name: caseData.first_name,
    last_name: caseData.last_name,
    last_seen_date: caseData.last_seen_date,
  });

  // Create alert request
  const { data: alertRequest, error: insertError } = await supabase
    .from("amber_alert_requests")
    .insert({
      case_id: body.case_id,
      requested_by: user.id,
      requesting_agency: body.requesting_agency,
      status: "draft",

      // Child information
      child_first_name: body.child_first_name,
      child_last_name: body.child_last_name,
      child_middle_name: body.child_middle_name,
      child_nickname: body.child_nickname,
      child_age: body.child_age,
      child_date_of_birth: body.child_date_of_birth,
      child_sex: body.child_sex,
      child_race: body.child_race,
      child_height_cm: body.child_height_cm,
      child_weight_kg: body.child_weight_kg,
      child_eye_color: body.child_eye_color,
      child_hair_color: body.child_hair_color,
      child_description: body.child_description,
      child_photo_url: body.child_photo_url,

      // Abduction details
      abduction_date: body.abduction_date,
      abduction_location: body.abduction_location,
      abduction_latitude: body.abduction_latitude,
      abduction_longitude: body.abduction_longitude,
      abduction_circumstances: body.abduction_circumstances,
      suspected_abductor_relationship: body.suspected_abductor_relationship,

      // Suspect information
      suspect_name: body.suspect_name,
      suspect_age: body.suspect_age,
      suspect_description: body.suspect_description,
      suspect_photo_url: body.suspect_photo_url,

      // Vehicle information
      vehicle_make: body.vehicle_make,
      vehicle_model: body.vehicle_model,
      vehicle_year: body.vehicle_year,
      vehicle_color: body.vehicle_color,
      vehicle_license_plate: body.vehicle_license_plate,
      vehicle_license_province: body.vehicle_license_province,
      vehicle_description: body.vehicle_description,

      // Criteria validation
      meets_amber_criteria: criteria.meets_amber_criteria,
      criteria_child_under_18: criteria.criteria_child_under_18,
      criteria_abduction_confirmed: criteria.criteria_abduction_confirmed,
      criteria_imminent_danger: criteria.criteria_imminent_danger,
      criteria_sufficient_info: criteria.criteria_sufficient_info,

      // Distribution settings
      geographic_scope: body.geographic_scope,
      target_radius_km: body.target_radius_km || AMBER_CRITERIA.DEFAULT_TARGET_RADIUS_KM,
      distribution_channels: body.distribution_channels,

      // Law enforcement contact
      le_contact_name: body.le_contact_name,
      le_contact_phone: body.le_contact_phone,
      le_contact_email: body.le_contact_email,
      le_badge_number: body.le_badge_number,
      le_agency_case_number: body.le_agency_case_number,
      le_verified: false,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error creating AMBER alert:", insertError);
    return NextResponse.json(
      { error: "Failed to create alert request" },
      { status: 500 }
    );
  }

  return NextResponse.json(alertRequest, { status: 201 });
}
