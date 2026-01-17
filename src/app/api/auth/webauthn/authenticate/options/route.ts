/**
 * WebAuthn Authentication Options API
 * POST /api/auth/webauthn/authenticate/options
 * LC-FEAT-031: Mobile App Companion
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get user's registered credentials
    const { data: credentials, error: credError } = await supabase
      .from("webauthn_credentials")
      .select("credential_id, transports")
      .eq("user_id", userId);

    if (credError) {
      console.error("Error fetching credentials:", credError);
      return NextResponse.json(
        { error: "Failed to fetch credentials" },
        { status: 500 }
      );
    }

    if (!credentials || credentials.length === 0) {
      return NextResponse.json(
        { error: "No registered credentials found" },
        { status: 404 }
      );
    }

    // Generate random challenge
    const challenge = randomBytes(32).toString("base64url");

    // Store challenge for verification
    const { error: challengeError } = await supabase
      .from("webauthn_challenges")
      .insert({
        user_id: userId,
        challenge,
        type: "authentication",
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      });

    if (challengeError) {
      console.error("Error storing challenge:", challengeError);
      return NextResponse.json(
        { error: "Failed to create authentication challenge" },
        { status: 500 }
      );
    }

    const allowCredentials = credentials.map((cred) => ({
      id: cred.credential_id,
      type: "public-key",
      transports: cred.transports || ["internal"],
    }));

    return NextResponse.json({
      challenge,
      rpId: process.env.NEXT_PUBLIC_APP_DOMAIN || "localhost",
      allowCredentials,
      userVerification: "required",
      timeout: 60000,
    });
  } catch (error) {
    console.error("WebAuthn authentication options error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
