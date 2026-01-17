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
        const caseId = searchParams.get("caseId") || undefined;
        const tips = anonymousTipsService.listTips({ status, caseId });
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
        const { description, caseId, location, mediaUrls, contactPreference } = body;
        if (!description) {
          return NextResponse.json({ error: "Description required" }, { status: 400 });
        }
        const result = await anonymousTipsService.submitTip({
          description,
          caseId,
          location,
          mediaUrls,
          contactPreference,
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
        const { tipId: verifyId, verifierId } = body;
        if (!verifyId || !verifierId) {
          return NextResponse.json(
            { error: "Tip ID and verifier ID required" },
            { status: 400 }
          );
        }
        const verifyResult = await anonymousTipsService.verifyTip(verifyId, verifierId);
        return NextResponse.json(verifyResult);

      case "assignCase":
        const { tipId: assignTipId, caseId: assignCaseId } = body;
        if (!assignTipId || !assignCaseId) {
          return NextResponse.json(
            { error: "Tip ID and case ID required" },
            { status: 400 }
          );
        }
        const assignResult = await anonymousTipsService.assignToCase(
          assignTipId,
          assignCaseId
        );
        return NextResponse.json(assignResult);

      case "updateStatus":
        const { tipId: statusTipId, status: newStatus, note } = body;
        if (!statusTipId || !newStatus) {
          return NextResponse.json(
            { error: "Tip ID and status required" },
            { status: 400 }
          );
        }
        const statusResult = await anonymousTipsService.updateStatus(
          statusTipId,
          newStatus,
          note
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
