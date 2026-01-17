/**
 * Leads API Route
 * CRUD operations for case leads
 */

import { NextRequest, NextResponse } from "next/server";
import { leadManagementService, type CreateLeadInput, type LeadFilters } from "@/lib/services/lead-management-service";

export async function GET(request: NextRequest) {
  try {
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
    console.error("[API] Error listing leads:", error);
    return NextResponse.json(
      { error: "Failed to list leads" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = request.headers.get("x-user-id") || "system";

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
    console.error("[API] Error creating lead:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}
