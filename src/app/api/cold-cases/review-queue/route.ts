/**
 * Cold Case Review Queue API
 * GET - List pending/in-progress reviews for admin queue
 */

import { createClient } from "@/lib/supabase/server";
import {
  apiForbidden,
  apiPaginated,
  apiServerError,
  apiUnauthorized,
} from "@/lib/api/response";

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
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = Math.min(parseInt(url.searchParams.get("pageSize") || "20", 10), 100);
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("cold_case_reviews")
    .select(
      `
      *,
      cold_case_profile:cold_case_profiles(
        id,
        case_id,
        classification,
        revival_priority_score
      ),
      case:cases(
        id,
        case_number,
        first_name,
        last_name,
        last_seen_date,
        primary_photo_url
      ),
      reviewer:profiles!cold_case_reviews_reviewer_id_fkey(
        id,
        first_name,
        last_name,
        email
      )
    `,
      { count: "exact" }
    )
    .in("status", ["pending", "in_progress"])
    .order("due_date", { ascending: true, nullsFirst: false })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching review queue:", error);
    return apiServerError(error.message);
  }

  return apiPaginated(data || [], count || 0, page, pageSize);
}
