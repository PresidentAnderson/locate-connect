import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  createCrossBorderCase,
  getCrossBorderCases,
} from "@/lib/services/cross-border-service";

/**
 * GET /api/cross-border/cases
 * List cross-border cases
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

    // Check if user is law enforcement
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, jurisdiction_id")
      .eq("id", user.id)
      .single();

    if (!profile || !["law_enforcement", "admin", "developer"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const coordinatorId = searchParams.get("coordinatorId") || undefined;

    const { data, error } = await getCrossBorderCases(supabase, {
      jurisdictionId: profile.jurisdiction_id,
      status,
      coordinatorId,
    });

    if (error) {
      console.error("Error fetching cross-border cases:", error);
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

/**
 * POST /api/cross-border/cases
 * Create a new cross-border case
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is law enforcement
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, jurisdiction_id")
      .eq("id", user.id)
      .single();

    if (!profile || !["law_enforcement", "admin", "developer"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const { data, error } = await createCrossBorderCase(supabase, {
      primaryCaseId: body.primaryCaseId,
      leadJurisdictionId: body.leadJurisdictionId || profile.jurisdiction_id,
      coordinatorId: user.id,
      notes: body.notes,
    });

    if (error) {
      console.error("Error creating cross-border case:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
