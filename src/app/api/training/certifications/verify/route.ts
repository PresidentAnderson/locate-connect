import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/training/certifications/verify
 * Verify a certification by hash or certificate number
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const hash = searchParams.get("hash");
    const certificateNumber = searchParams.get("number");

    if (!hash && !certificateNumber) {
      return NextResponse.json(
        { error: "hash or number parameter is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("training_certifications")
      .select(
        `
        id,
        certificate_number,
        issued_at,
        expires_at,
        status,
        final_score_percentage,
        track:training_tracks(
          id,
          title,
          title_fr,
          audience
        )
      `
      )
      .eq("status", "active");

    if (hash) {
      query = query.eq("verification_hash", hash);
    } else if (certificateNumber) {
      query = query.eq("certificate_number", certificateNumber);
    }

    const { data: certification, error } = await query.single();

    if (error || !certification) {
      return NextResponse.json(
        {
          valid: false,
          error: "Certificate not found or has been revoked",
        },
        { status: 404 }
      );
    }

    // Check expiration
    const isExpired =
      certification.expires_at &&
      new Date(certification.expires_at) < new Date();

    if (isExpired) {
      return NextResponse.json({
        valid: false,
        error: "Certificate has expired",
        expiredAt: certification.expires_at,
      });
    }

    // Extract track info - handle the case where track is returned as array or object
    const trackData = Array.isArray(certification.track)
      ? certification.track[0]
      : certification.track;

    return NextResponse.json({
      valid: true,
      certification: {
        certificateNumber: certification.certificate_number,
        trackTitle: trackData?.title,
        trackTitleFr: trackData?.title_fr,
        issuedAt: certification.issued_at,
        expiresAt: certification.expires_at,
        finalScore: certification.final_score_percentage,
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
