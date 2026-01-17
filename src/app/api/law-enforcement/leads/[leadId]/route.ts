/**
 * Individual Lead API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { leadManagementService, type UpdateLeadInput } from "@/lib/services/lead-management-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    const lead = await leadManagementService.getLead(leadId);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error("[API] Error getting lead:", error);
    return NextResponse.json(
      { error: "Failed to get lead" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    const body = await request.json();
    const userId = request.headers.get("x-user-id") || "system";

    const input: UpdateLeadInput = {
      title: body.title,
      description: body.description,
      priority: body.priority,
      status: body.status,
      assignedTo: body.assignedTo,
      verificationNotes: body.verificationNotes,
    };

    const lead = await leadManagementService.updateLead(leadId, input, userId);

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error("[API] Error updating lead:", error);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    const body = await request.json();
    const userId = request.headers.get("x-user-id") || "system";

    // Handle adding notes
    if (body.action === "add_note") {
      const success = await leadManagementService.addNote(leadId, body.note, userId);
      if (!success) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    // Handle adding attachments
    if (body.action === "add_attachment") {
      const attachment = await leadManagementService.addAttachment(
        leadId,
        body.attachment,
        userId
      );
      if (!attachment) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }
      return NextResponse.json(attachment);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[API] Error performing lead action:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
