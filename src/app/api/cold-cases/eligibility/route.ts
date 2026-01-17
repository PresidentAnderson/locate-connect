import { createClient } from "@/lib/supabase/server";
import {
  apiBadRequest,
  apiForbidden,
  apiServerError,
  apiSuccess,
  apiUnauthorized,
} from "@/lib/api/response";
import { evaluateColdCaseEligibility } from "@/lib/services/cold-case-eligibility";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveCaseId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  caseId: string
) {
  if (uuidRegex.test(caseId)) {
    return caseId;
  }

  const { data, error } = await supabase
    .from("cases")
    .select("id")
    .eq("case_number", caseId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.id as string;
}

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
  const caseIdParam = url.searchParams.get("caseId");
  if (!caseIdParam) {
    return apiBadRequest("caseId is required", "missing_case_id");
  }

  const resolvedCaseId = await resolveCaseId(supabase, caseIdParam);
  if (!resolvedCaseId) {
    return apiBadRequest("Case not found", "case_not_found");
  }

  const { data: caseData, error: caseError } = await supabase
    .from("cases")
    .select("id, last_seen_date, updated_at")
    .eq("id", resolvedCaseId)
    .single();

  if (caseError || !caseData) {
    return apiServerError(caseError?.message || "Failed to fetch case");
  }

  const now = new Date();
  const tipsSince = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const leadsSince = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: tipsCount, error: tipsError }, { count: leadsCount, error: leadsError }] =
    await Promise.all([
      supabase
        .from("tips")
        .select("id", { count: "exact", head: true })
        .eq("case_id", caseData.id)
        .gte("created_at", tipsSince),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("case_id", caseData.id)
        .gte("created_at", leadsSince),
    ]);

  if (tipsError || leadsError) {
    return apiServerError(tipsError?.message || leadsError?.message || "Failed to fetch signals");
  }

  const eligibility = evaluateColdCaseEligibility({
    lastSeenAt: caseData.last_seen_date,
    lastActivityAt: caseData.updated_at,
    tipsLast60Days: tipsCount ?? null,
    leadsLast90Days: leadsCount ?? null,
  });

  return apiSuccess({
    caseId: caseData.id,
    eligibility,
  });
}
