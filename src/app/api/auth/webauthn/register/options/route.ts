/**
 * WebAuthn Registration Options API
 * POST /api/auth/webauthn/register/options
 * LC-FEAT-031: Mobile App Companion
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

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
    const { username } = body;

    // Generate random challenge
    const challenge = randomBytes(32).toString("base64url");

    // Store challenge for verification
    const { error: challengeError } = await supabase
      .from("webauthn_challenges")
      .insert({
        user_id: user.id,
        challenge,
        type: "registration",
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      });

    if (challengeError) {
      console.error("Error storing challenge:", challengeError);
      return NextResponse.json(
        { error: "Failed to create registration challenge" },
        { status: 500 }
      );
    }

    // Get existing credentials to exclude
    const { data: existingCredentials } = await supabase
      .from("webauthn_credentials")
      .select("credential_id")
      .eq("user_id", user.id);

    const excludeCredentials = existingCredentials?.map((cred) => ({
      id: cred.credential_id,
      type: "public-key",
    })) || [];

    return NextResponse.json({
      challenge,
      rp: {
        name: "LocateConnect",
        id: process.env.NEXT_PUBLIC_APP_DOMAIN || "localhost",
      },
      user: {
        id: user.id,
        name: username || user.email,
        displayName: username || user.email?.split("@")[0],
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60000,
      attestation: "none",
      excludeCredentials,
    });
  } catch (error) {
    console.error("WebAuthn registration options error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
