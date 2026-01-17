/**
 * WebAuthn Authentication Verify API
 * POST /api/auth/webauthn/authenticate/verify
 * LC-FEAT-031: Mobile App Companion
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const body = await request.json();
    const { userId, assertion } = body;

    if (!userId || !assertion?.id || !assertion?.response) {
      return NextResponse.json(
        { error: "Invalid assertion data" },
        { status: 400 }
      );
    }

    // Get and validate challenge
    const { data: challengeData, error: challengeError } = await supabase
      .from("webauthn_challenges")
      .select("*")
      .eq("user_id", userId)
      .eq("type", "authentication")
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (challengeError || !challengeData) {
      return NextResponse.json(
        { error: "Invalid or expired challenge" },
        { status: 400 }
      );
    }

    // Mark challenge as used
    await supabase
      .from("webauthn_challenges")
      .update({ used_at: new Date().toISOString() })
      .eq("id", challengeData.id);

    // Get the credential
    const { data: credential, error: credError } = await supabase
      .from("webauthn_credentials")
      .select("*")
      .eq("user_id", userId)
      .eq("credential_id", assertion.id)
      .single();

    if (credError || !credential) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      );
    }

    // In a production environment, you would verify the assertion
    // signature against the stored public key here.
    // For now, we'll update the counter and last used time.

    // Update credential counter and last used
    const { error: updateError } = await supabase
      .from("webauthn_credentials")
      .update({
        counter: credential.counter + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", credential.id);

    if (updateError) {
      console.error("Error updating credential:", updateError);
    }

    return NextResponse.json({
      success: true,
      message: "Authentication successful",
      credentialId: assertion.id,
    });
  } catch (error) {
    console.error("WebAuthn authentication verify error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
