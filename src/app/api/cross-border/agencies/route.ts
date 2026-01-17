import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getInternationalAgencies } from "@/lib/services/cross-border-service";

/**
 * GET /api/cross-border/agencies
 * List international agencies
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
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
    const country = searchParams.get("country") || undefined;
    const agencyType = searchParams.get("agencyType") || undefined;
    const isActive = searchParams.get("isActive") === "true" ? true : undefined;

    const { data, error } = await getInternationalAgencies(supabase, {
      country,
      agencyType,
      isActive,
    });

    if (error) {
      console.error("Error fetching agencies:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
