/**
 * Push Notification Unsubscribe API
 * POST /api/notifications/push/unsubscribe
 * LC-FEAT-031: Mobile App Companion
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint is required" },
        { status: 400 }
      );
    }

    // Deactivate the subscription (don't delete for audit purposes)
    const { error: updateError } = await supabase
      .from("push_subscriptions")
      .update({
        is_active: false,
      })
      .eq("user_id", user.id)
      .eq("endpoint", endpoint);

    if (updateError) {
      console.error("Error deactivating subscription:", updateError);
      return NextResponse.json(
        { error: "Failed to unsubscribe" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Unsubscribed successfully",
    });
  } catch (error) {
    console.error("Push unsubscribe error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
