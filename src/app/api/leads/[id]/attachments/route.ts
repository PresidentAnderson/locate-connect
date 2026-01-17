import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createLeadAttachment,
  getLeadAttachments,
} from "@/lib/services/lead-service";
import { CreateLeadAttachmentInput } from "@/types/lead.types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/leads/[id]/attachments
 * Get all attachments for a lead
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { data, error } = await getLeadAttachments(supabase, id);

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
 * POST /api/leads/[id]/attachments
 * Create a new attachment on a lead
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    if (!profile || !["law_enforcement", "admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = (await request.json()) as Omit<
      CreateLeadAttachmentInput,
      "leadId"
    >;

    if (!body.fileName || !body.fileType || !body.url) {
      return NextResponse.json(
        { error: "Missing required fields: fileName, fileType, url" },
        { status: 400 }
      );
    }

    const input: CreateLeadAttachmentInput = {
      leadId: id,
      fileName: body.fileName,
      fileType: body.fileType,
      url: body.url,
      fileSize: body.fileSize,
      description: body.description,
      isEvidence: body.isEvidence,
    };

    const { data, error } = await createLeadAttachment(
      supabase,
      user.id,
      input
    );

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
