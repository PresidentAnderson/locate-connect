/**
 * Push Notification Subscribe API
 * POST /api/notifications/push/subscribe
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
    const { subscription, deviceInfo } = body;

    if (!subscription?.endpoint || !subscription?.p256dhKey || !subscription?.authKey) {
      return NextResponse.json(
        { error: "Invalid subscription data" },
        { status: 400 }
      );
    }

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("endpoint", subscription.endpoint)
      .single();

    if (existing) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from("push_subscriptions")
        .update({
          p256dh_key: subscription.p256dhKey,
          auth_key: subscription.authKey,
          expiration_time: subscription.expirationTime
            ? new Date(subscription.expirationTime).toISOString()
            : null,
          device_name: deviceInfo?.deviceType || null,
          device_type: deviceInfo?.deviceType || null,
          browser: deviceInfo?.browser || null,
          platform: deviceInfo?.platform || null,
          is_active: true,
          last_used_at: new Date().toISOString(),
          failed_count: 0,
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Error updating subscription:", updateError);
        return NextResponse.json(
          { error: "Failed to update subscription" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        subscriptionId: existing.id,
        message: "Subscription updated",
      });
    }

    // Create new subscription
    const { data: newSubscription, error: insertError } = await supabase
      .from("push_subscriptions")
      .insert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.p256dhKey,
        auth_key: subscription.authKey,
        expiration_time: subscription.expirationTime
          ? new Date(subscription.expirationTime).toISOString()
          : null,
        device_name: deviceInfo?.deviceType || null,
        device_type: deviceInfo?.deviceType || null,
        browser: deviceInfo?.browser || null,
        platform: deviceInfo?.platform || null,
        is_active: true,
        last_used_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error creating subscription:", insertError);
      return NextResponse.json(
        { error: "Failed to create subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subscriptionId: newSubscription.id,
      message: "Subscription created",
    });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
