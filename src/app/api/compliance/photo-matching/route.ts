/**
 * Photo Matching API Route
 * AI-powered face recognition endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import { requireComplianceVerifier } from "@/lib/api/compliance-verifier";
import { photoMatchingService } from "@/lib/services/photo-matching-service";
import { logger } from "../../../../lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "request":
        const requestId = searchParams.get("requestId");
        if (!requestId) {
          return NextResponse.json({ error: "Request ID required" }, { status: 400 });
        }
        const matchRequest = photoMatchingService.getRequest(requestId);
        if (!matchRequest) {
          return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }
        return NextResponse.json(matchRequest);

      case "list":
        const caseId = searchParams.get("caseId");
        if (!caseId) {
          return NextResponse.json({ error: "Case ID required" }, { status: 400 });
        }
        const requests = photoMatchingService.listRequests(caseId);
        return NextResponse.json(requests);

      case "statistics":
        const stats = photoMatchingService.getStatistics();
        return NextResponse.json(stats);

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("[API] Photo matching error:", { error: error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "submit":
        const { caseId, imageUrl } = body;
        if (!caseId || !imageUrl) {
          return NextResponse.json(
            { error: "caseId and imageUrl required" },
            { status: 400 }
          );
        }
        const matchRequest = await photoMatchingService.submitMatchRequest(
          caseId,
          imageUrl
        );
        return NextResponse.json(matchRequest);

      case "compare":
        const { imageUrl1, imageUrl2 } = body;
        if (!imageUrl1 || !imageUrl2) {
          return NextResponse.json(
            { error: "Both image URLs required" },
            { status: 400 }
          );
        }
        const comparison = await photoMatchingService.compareImages(
          imageUrl1,
          imageUrl2
        );
        return NextResponse.json(comparison);

      case "verify":
        const verifier = await requireComplianceVerifier();
        if (verifier.error) return verifier.error;
        const { requestId, resultId, isMatch } = body;
        if (!requestId || !resultId || typeof isMatch !== "boolean") {
          return NextResponse.json(
            { error: "requestId, resultId, and boolean isMatch required" },
            { status: 400 }
          );
        }
        const verifyResult = await photoMatchingService.verifyMatch(
          requestId,
          resultId,
          isMatch,
          verifier.userId
        );
        return NextResponse.json({ success: verifyResult });

      case "ageProgression":
        const { imageUrl: progressImageUrl, targetAge } = body;
        if (!progressImageUrl || !targetAge) {
          return NextResponse.json(
            { error: "imageUrl and targetAge required" },
            { status: 400 }
          );
        }
        const progression = await photoMatchingService.generateAgeProgression(
          progressImageUrl,
          targetAge
        );
        return NextResponse.json(progression);

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("[API] Photo matching error:", { error: error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
