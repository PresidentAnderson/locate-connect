import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getLeadWithDetails,
  updateLead,
  deleteLead,
  assignLead,
  verifyLead,
} from "@/lib/services/lead-service";
import { UpdateLeadInput } from "@/types/lead.types";

// Valid actions for special operations
const VALID_ACTIONS = ["assign", "verify"] as const;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/leads/[id]
 * Get a specific lead with full details
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
    const { data, error } = await getLeadWithDetails(supabase, id);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
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
 * PATCH /api/leads/[id]
 * Update a lead
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const body = (await request.json()) as UpdateLeadInput & {
      action?: string;
      assignToUserId?: string;
    };

    // Handle special actions
    if (body.action) {
      if (body.action === "assign") {
        if (!body.assignToUserId) {
          return NextResponse.json(
            { error: "assignToUserId is required for assign action" },
            { status: 400 }
          );
        }
        const { data, error } = await assignLead(
          supabase,
          id,
          body.assignToUserId
        );
        if (error) {
          return NextResponse.json({ error }, { status: 500 });
        }
        return NextResponse.json({ data });
      }

      if (body.action === "verify") {
        const { data, error } = await verifyLead(supabase, id, user.id);
        if (error) {
          return NextResponse.json({ error }, { status: 500 });
        }
        return NextResponse.json({ data });
      }

      // Invalid action
      return NextResponse.json(
        { error: `Invalid action: ${body.action}. Valid actions are: ${VALID_ACTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Remove action fields from body before updating
    const { action, assignToUserId, ...updateData } = body;

    const { data, error } = await updateLead(supabase, id, updateData);

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
 * DELETE /api/leads/[id]
 * Delete a lead
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    const { error } = await deleteLead(supabase, id);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
