/**
 * Cold Case Revival Trigger Log API
 * GET - List triggers by case/profile
 * POST - Append a new trigger entry
 */

import { createClient } from "@/lib/supabase/server";
import {
  apiBadRequest,
  apiCreated,
  apiForbidden,
  apiPaginated,
  apiServerError,
  apiUnauthorized,
} from "@/lib/api/response";

type RevivalTriggerPayload = {
  caseId?: string;
  coldCaseProfileId?: string | null;
  triggerType?: string;
  triggerSource?: string;
  summary?: string;
  details?: Record<string, unknown> | null;
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiUnauthorized();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["law_enforcement", "admin", "developer"].includes(profile.role)) {
    return apiForbidden("Access restricted to law enforcement and administrators");
  }

  const url = new URL(request.url);
  const caseId = url.searchParams.get("caseId");
  const coldCaseProfileId = url.searchParams.get("coldCaseProfileId");
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = Math.min(parseInt(url.searchParams.get("pageSize") || "20", 10), 100);
  const offset = (page - 1) * pageSize;

  if (!caseId && !coldCaseProfileId) {
    return apiBadRequest("caseId or coldCaseProfileId is required", "missing_filter");
  }

  let query = supabase
    .from("cold_case_revival_triggers")
    .select(
      `
      *,
      case:cases(
        id,
        case_number,
        first_name,
        last_name
      ),
      created_by_user:profiles!cold_case_revival_triggers_created_by_fkey(
        id,
        first_name,
        last_name,
        email
      )
    `,
      { count: "exact" }
    );

  if (caseId) {
    query = query.eq("case_id", caseId);
  }
  if (coldCaseProfileId) {
    query = query.eq("cold_case_profile_id", coldCaseProfileId);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.error("Error fetching revival triggers:", error);
    return apiServerError(error.message);
  }

  return apiPaginated(data || [], count || 0, page, pageSize);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return apiUnauthorized();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["law_enforcement", "admin", "developer"].includes(profile.role)) {
    return apiForbidden("Access restricted to law enforcement and administrators");
  }

  const body = (await request.json()) as RevivalTriggerPayload;

  if (!body.caseId) {
    return apiBadRequest("caseId is required", "missing_case_id");
  }
  if (!body.triggerType) {
    return apiBadRequest("triggerType is required", "missing_trigger_type");
  }
  if (!body.summary) {
    return apiBadRequest("summary is required", "missing_summary");
  }

  const insertPayload = {
    case_id: body.caseId,
    cold_case_profile_id: body.coldCaseProfileId ?? null,
    trigger_type: body.triggerType,
    trigger_source: body.triggerSource ?? "system",
    summary: body.summary,
    details: body.details ?? {},
    created_by: user.id,
  };

  const { data, error } = await supabase
    .from("cold_case_revival_triggers")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    console.error("Error creating revival trigger:", error);
    return apiServerError(error.message);
  }

  return apiCreated(data);
}
