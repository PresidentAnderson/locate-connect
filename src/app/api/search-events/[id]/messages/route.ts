import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/search-events/[id]/messages
 * Get messages for an event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get("limit") || "50");
    const since = searchParams.get("since");

    let query = supabase
      .from("search_event_messages")
      .select("*")
      .eq("event_id", id)
      .order("sent_at", { ascending: false })
      .limit(limit);

    if (since) {
      query = query.gt("sent_at", since);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching messages:", error);
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
 * POST /api/search-events/[id]/messages
 * Send a message
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

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Get sender name
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();

    const senderName = profile
      ? `${profile.first_name} ${profile.last_name}`
      : "Coordinator";

    const { data, error } = await supabase
      .from("search_event_messages")
      .insert({
        event_id: id,
        sender_id: user.id,
        sender_name: senderName,
        message: body.message,
        is_broadcast: body.isBroadcast ?? true,
        target_team_id: body.targetTeamId,
        target_volunteer_id: body.targetVolunteerId,
        priority: body.priority || "normal",
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
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
