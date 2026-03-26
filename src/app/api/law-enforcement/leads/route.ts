/**
 * Leads API Route
 * CRUD operations for case leads
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { leadManagementService, type CreateLeadInput, type LeadFilters } from "@/lib/services/lead-management-service";
import { logger } from "../../../../lib/logger";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
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

    const filters: LeadFilters = {
      caseId: searchParams.get("caseId") || undefined,
      status: searchParams.get("status") as LeadFilters["status"] || undefined,
      priority: searchParams.get("priority") as LeadFilters["priority"] || undefined,
      source: searchParams.get("source") as LeadFilters["source"] || undefined,
      assignedTo: searchParams.get("assignedTo") || undefined,
      search: searchParams.get("search") || undefined,
    };

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const result = await leadManagementService.listLeads(filters, page, pageSize);

    return NextResponse.json(result);
  } catch (error) {
    logger.error("[API] Error listing leads:", { error: error });
    return NextResponse.json(
      { error: "Failed to list leads" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
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

    const body = await request.json();
    const userId = user.id;

    const input: CreateLeadInput = {
      caseId: body.caseId,
      title: body.title,
      description: body.description,
      priority: body.priority,
      source: body.source,
      sourceDetails: body.sourceDetails,
      submitter: body.submitter,
      location: body.location,
      sighting: body.sighting,
    };

    const lead = await leadManagementService.createLead(input, userId);

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    logger.error("[API] Error creating lead:", { error: error });
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}
