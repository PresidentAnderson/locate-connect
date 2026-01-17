/**
 * Case Dispositions API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { dispositionService, type CreateDispositionInput } from "@/lib/services/disposition-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");
    const analytics = searchParams.get("analytics");
    const period = searchParams.get("period") as "week" | "month" | "quarter" | "year" || "month";

    if (analytics === "true") {
      const data = await dispositionService.getAnalytics(period);
      return NextResponse.json(data);
    }

    if (caseId) {
      const disposition = await dispositionService.getDisposition(caseId);
      return NextResponse.json({ disposition });
    }

    const recent = await dispositionService.getRecentDispositions(20);
    return NextResponse.json({ dispositions: recent });
  } catch (error) {
    console.error("[API] Error getting dispositions:", error);
    return NextResponse.json(
      { error: "Failed to get dispositions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = request.headers.get("x-user-id") || "system";

    const input: CreateDispositionInput = {
      caseId: body.caseId,
      caseNumber: body.caseNumber,
      disposition: body.disposition,
      circumstances: body.circumstances,
      locationFound: body.locationFound,
      contributingFactors: body.contributingFactors,
      keyLeadId: body.keyLeadId,
      finalReport: body.finalReport,
      attachments: body.attachments,
    };

    // Case opened date would be fetched from case record
    const caseOpenedAt = body.caseOpenedAt || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const disposition = await dispositionService.createDisposition(
      input,
      userId,
      caseOpenedAt
    );

    return NextResponse.json(disposition, { status: 201 });
  } catch (error) {
    console.error("[API] Error creating disposition:", error);
    return NextResponse.json(
      { error: "Failed to create disposition" },
      { status: 500 }
    );
  }
}
