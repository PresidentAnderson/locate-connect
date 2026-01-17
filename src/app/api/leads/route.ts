import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createLead, listLeads } from "@/lib/services/lead-service";
import { CreateLeadInput, LeadFilters } from "@/types/lead.types";

/**
 * GET /api/leads
 * List leads with optional filters
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters: LeadFilters = {};

    if (searchParams.get("caseId")) {
      filters.caseId = searchParams.get("caseId")!;
    }
    if (searchParams.get("status")) {
      const status = searchParams.get("status")!;
      if (["new", "investigating", "verified", "dismissed", "acted_upon"].includes(status)) {
        filters.status = status as LeadFilters["status"];
      }
    }
    if (searchParams.get("leadType")) {
      const leadType = searchParams.get("leadType")!;
      if (["social_media", "email_opened", "location", "witness", "hospital", "detention", "other"].includes(leadType)) {
        filters.leadType = leadType as LeadFilters["leadType"];
      }
    }
    if (searchParams.get("priorityLevel")) {
      const priority = searchParams.get("priorityLevel")!;
      if (["p0_critical", "p1_high", "p2_medium", "p3_low", "p4_routine"].includes(priority)) {
        filters.priorityLevel = priority as LeadFilters["priorityLevel"];
      }
    }
    if (searchParams.get("assignedTo")) {
      filters.assignedTo = searchParams.get("assignedTo")!;
    }
    if (searchParams.get("isVerified")) {
      filters.isVerified = searchParams.get("isVerified") === "true";
    }
    if (searchParams.get("search")) {
      filters.search = searchParams.get("search")!;
    }

    const { data, error } = await listLeads(supabase, filters);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads
 * Create a new lead
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

    // Check if user has permission (law enforcement or admin)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      !["law_enforcement", "admin"].includes(profile.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as CreateLeadInput;

    // Validate required fields
    if (!body.caseId || !body.title || !body.leadType) {
      return NextResponse.json(
        { error: "Missing required fields: caseId, title, leadType" },
        { status: 400 }
      );
    }

    const { data, error } = await createLead(supabase, user.id, body);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
