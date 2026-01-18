/**
 * Anonymous Tips API Route
 * Secure tip submission portal
 */

import { NextRequest, NextResponse } from "next/server";
import { anonymousTipsService } from "@/lib/services/anonymous-tips-service";
import type { AnonymousTip } from "@/types/compliance.types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "check":
        const tipCode = searchParams.get("tipCode");
        if (!tipCode) {
          return NextResponse.json({ error: "Tip code required" }, { status: 400 });
        }
        const tipStatus = await anonymousTipsService.getTipByCode(tipCode);
        if (!tipStatus) {
          return NextResponse.json({ error: "Tip not found" }, { status: 404 });
        }
        return NextResponse.json(tipStatus);

      case "list":
        const status = searchParams.get("status") as AnonymousTip["status"] | undefined;
        const caseNumber = searchParams.get("caseNumber") || undefined;
        const tips = anonymousTipsService.listTips({ status, caseNumber });
        return NextResponse.json(tips);

      case "statistics":
        const stats = anonymousTipsService.getStatistics();
        return NextResponse.json(stats);

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[API] Tips error:", error);
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
        const {
          description,
          caseNumber: tipCaseNumber,
          location,
          sightingDate,
          sightingTime,
          personDescription,
          vehicleDescription,
          companionDescription,
          attachments,
          language = "en",
          source = "web",
        } = body;
        if (!description) {
          return NextResponse.json({ error: "Description required" }, { status: 400 });
        }
        const result = await anonymousTipsService.submitTip({
          description,
          caseNumber: tipCaseNumber,
          location,
          sightingDate,
          sightingTime,
          personDescription,
          vehicleDescription,
          companionDescription,
          attachments,
          language,
          source,
        });
        return NextResponse.json(result);

      case "followup":
        const { tipCode, additionalInfo } = body;
        if (!tipCode || !additionalInfo) {
          return NextResponse.json(
            { error: "Tip code and additional info required" },
            { status: 400 }
          );
        }
        const followupResult = await anonymousTipsService.addFollowUp(
          tipCode,
          additionalInfo
        );
        if (!followupResult) {
          return NextResponse.json({ error: "Tip not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true });

      case "verify":
        const { tipId: verifyId } = body;
        if (!verifyId) {
          return NextResponse.json(
            { error: "Tip ID required" },
            { status: 400 }
          );
        }
        const verifyResult = await anonymousTipsService.updateStatus(verifyId, "verified");
        return NextResponse.json(verifyResult);

      case "assignCase":
        const { tipId: assignTipId, caseNumber: assignCaseNumber } = body;
        if (!assignTipId || !assignCaseNumber) {
          return NextResponse.json(
            { error: "Tip ID and case number required" },
            { status: 400 }
          );
        }
        const assignResult = await anonymousTipsService.linkToCase(
          assignTipId,
          assignCaseNumber
        );
        return NextResponse.json({ success: assignResult });

      case "updateStatus":
        const { tipId: statusTipId, status: newStatus } = body;
        if (!statusTipId || !newStatus) {
          return NextResponse.json(
            { error: "Tip ID and status required" },
            { status: 400 }
          );
        }
        const statusResult = await anonymousTipsService.updateStatus(
          statusTipId,
          newStatus
        );
        return NextResponse.json(statusResult);

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[API] Tips error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
