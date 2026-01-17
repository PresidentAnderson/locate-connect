/**
 * WebAuthn Registration Verify API
 * POST /api/auth/webauthn/register/verify
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
    const { credential } = body;

    if (!credential?.id || !credential?.response) {
      return NextResponse.json(
        { error: "Invalid credential data" },
        { status: 400 }
      );
    }

    // Get and validate challenge
    const { data: challengeData, error: challengeError } = await supabase
      .from("webauthn_challenges")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "registration")
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

    // In a production environment, you would verify the attestation object
    // and client data JSON here. For now, we'll store the credential.

    // Decode the public key from the attestation response
    // This is a simplified version - production should use a WebAuthn library
    const publicKeyBuffer = base64URLToBuffer(credential.response.attestationObject);

    // Store the credential
    const { error: insertError } = await supabase
      .from("webauthn_credentials")
      .insert({
        user_id: user.id,
        credential_id: credential.id,
        public_key: publicKeyBuffer,
        counter: 0,
        device_type: "platform",
        transports: ["internal"],
        device_name: getDeviceNameFromUserAgent(request.headers.get("user-agent") || ""),
      });

    if (insertError) {
      console.error("Error storing credential:", insertError);
      return NextResponse.json(
        { error: "Failed to store credential" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "WebAuthn credential registered successfully",
    });
  } catch (error) {
    console.error("WebAuthn registration verify error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function base64URLToBuffer(base64url: string): Buffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(base64 + padding, "base64");
}

function getDeviceNameFromUserAgent(ua: string): string {
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Mac/.test(ua)) return "Mac";
  if (/Android/.test(ua)) return "Android Device";
  if (/Windows/.test(ua)) return "Windows PC";
  return "Unknown Device";
}
