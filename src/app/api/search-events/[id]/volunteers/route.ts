import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/search-events/[id]/volunteers
 * List volunteers for an event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get("status");

    let query = supabase
      .from("search_volunteers")
      .select("*")
      .eq("event_id", id)
      .order("registered_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching volunteers:", error);
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
 * POST /api/search-events/[id]/volunteers
 * Register a volunteer for an event
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();

    const { data, error } = await supabase
      .from("search_volunteers")
      .insert({
        event_id: id,
        user_id: user?.id,
        first_name: body.firstName,
        last_name: body.lastName,
        email: body.email,
        phone: body.phone,
        emergency_contact_name: body.emergencyContactName,
        emergency_contact_phone: body.emergencyContactPhone,
        special_skills: body.specialSkills || [],
        has_first_aid_training: body.hasFirstAidTraining || false,
        has_sar_training: body.hasSARTraining || false,
        physical_limitations: body.physicalLimitations,
        equipment_brought: body.equipmentBrought || [],
      })
      .select()
      .single();

    if (error) {
      console.error("Error registering volunteer:", error);
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

/**
 * PATCH /api/search-events/[id]/volunteers
 * Bulk update volunteer statuses (e.g., check-in)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { volunteerIds, status, updates } = body;

    if (volunteerIds && volunteerIds.length > 0) {
      const updateData: Record<string, unknown> = { status };
      
      if (status === "checked_in") {
        updateData.checked_in_at = new Date().toISOString();
        updateData.checked_in_by = user.id;
      } else if (status === "checked_out") {
        updateData.checked_out_at = new Date().toISOString();
      }

      if (updates) {
        Object.assign(updateData, updates);
      }

      const { data, error } = await supabase
        .from("search_volunteers")
        .update(updateData)
        .in("id", volunteerIds)
        .eq("event_id", id)
        .select();

      if (error) {
        console.error("Error updating volunteers:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: "No volunteer IDs provided" }, { status: 400 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
