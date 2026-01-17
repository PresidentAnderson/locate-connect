import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/family/messages
 * List messages for a case or user
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

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");
    const threadId = searchParams.get("threadId");
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("family_messages")
      .select(`
        *,
        sender:profiles!family_messages_sender_id_fkey(id, first_name, last_name, avatar_url)
      `, { count: "exact" })
      .order("created_at", { ascending: false });

    // Filter by case if provided (verify access)
    if (caseId) {
      const { data: caseData } = await supabase
        .from("cases")
        .select("reporter_id")
        .eq("id", caseId)
        .single();

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const isOwner = caseData?.reporter_id === user.id;
      const isLE = profile && ["law_enforcement", "admin", "developer"].includes(profile.role);

      if (!isOwner && !isLE) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      query = query.eq("case_id", caseId);
    } else {
      // Filter by user's messages
      query = query.or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);
    }

    if (threadId) {
      query = query.or(`id.eq.${threadId},thread_id.eq.${threadId}`);
    }

    if (unreadOnly) {
      query = query.eq("is_read", false).eq("recipient_id", user.id);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: count ? offset + limit < count : false,
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/family/messages
 * Send a new message
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

    const body = await request.json();

    // Verify access to the case
    const { data: caseData } = await supabase
      .from("cases")
      .select("reporter_id")
      .eq("id", body.caseId)
      .single();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isOwner = caseData?.reporter_id === user.id;
    const isLE = profile && ["law_enforcement", "admin", "developer"].includes(profile.role);

    if (!isOwner && !isLE) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Determine sender type
    let senderType: "liaison" | "family" | "system" = "family";
    if (isLE) {
      senderType = "liaison";
    }

    const { data, error } = await supabase
      .from("family_messages")
      .insert({
        case_id: body.caseId,
        sender_id: user.id,
        sender_type: senderType,
        recipient_id: body.recipientId,
        recipient_contact_id: body.recipientContactId,
        thread_id: body.threadId,
        subject: body.subject,
        message: body.message,
        is_urgent: body.isUrgent ?? false,
        attachments: body.attachments || [],
      })
      .select(`
        *,
        sender:profiles!family_messages_sender_id_fkey(id, first_name, last_name, avatar_url)
      `)
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

/**
 * PATCH /api/family/messages
 * Update message (mark as read)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.id && !body.ids) {
      return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.isRead !== undefined) {
      updateData.is_read = body.isRead;
      if (body.isRead) {
        updateData.read_at = new Date().toISOString();
      }
    }

    let query = supabase
      .from("family_messages")
      .update(updateData)
      .eq("recipient_id", user.id); // Can only update own messages

    if (body.ids && Array.isArray(body.ids)) {
      query = query.in("id", body.ids);
    } else {
      query = query.eq("id", body.id);
    }

    const { data, error } = await query.select();

    if (error) {
      console.error("Error updating message:", error);
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
