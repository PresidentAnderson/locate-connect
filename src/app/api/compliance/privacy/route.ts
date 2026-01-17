/**
 * Privacy Compliance API Route
 * Quebec Law 25 / PIPEDA compliance
 */

import { NextRequest, NextResponse } from "next/server";
import { privacyComplianceService } from "@/lib/services/privacy-compliance-service";
import type { PrivacyRequest } from "@/types/compliance.types";

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
        const privacyRequest = privacyComplianceService.getRequest(requestId);
        if (!privacyRequest) {
          return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }
        return NextResponse.json(privacyRequest);

      case "list":
        const status = searchParams.get("status") as PrivacyRequest["status"] | undefined;
        const requests = privacyComplianceService.listRequests(status);
        return NextResponse.json(requests);

      case "checklist":
        const checklist = privacyComplianceService.getLaw25Checklist();
        return NextResponse.json(checklist);

      case "config":
        const config = privacyComplianceService.getPrivacyConfig();
        return NextResponse.json(config);

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[API] Privacy error:", error);
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
      case "create":
        const { type, requesterId, email, description } = body;
        if (!type || !requesterId || !email || !description) {
          return NextResponse.json(
            { error: "type, requesterId, email, and description required" },
            { status: 400 }
          );
        }
        const newRequest = await privacyComplianceService.createRequest(
          type,
          requesterId,
          email,
          description
        );
        return NextResponse.json(newRequest);

      case "processAccess":
        const { requestId: accessId } = body;
        if (!accessId) {
          return NextResponse.json({ error: "Request ID required" }, { status: 400 });
        }
        const accessData = await privacyComplianceService.processAccessRequest(accessId);
        return NextResponse.json(accessData);

      case "processDeletion":
        const { requestId: deleteId } = body;
        if (!deleteId) {
          return NextResponse.json({ error: "Request ID required" }, { status: 400 });
        }
        const deleteResult = await privacyComplianceService.processDeletionRequest(deleteId);
        return NextResponse.json(deleteResult);

      case "processCorrection":
        const { requestId: correctId, corrections } = body;
        if (!correctId || !corrections) {
          return NextResponse.json(
            { error: "Request ID and corrections required" },
            { status: 400 }
          );
        }
        const correctResult = await privacyComplianceService.processCorrectionRequest(
          correctId,
          corrections
        );
        return NextResponse.json(correctResult);

      case "pia":
        const { projectName, dataProcessing } = body;
        if (!projectName || !dataProcessing) {
          return NextResponse.json(
            { error: "projectName and dataProcessing required" },
            { status: 400 }
          );
        }
        const pia = privacyComplianceService.generatePIA(projectName, dataProcessing);
        return NextResponse.json(pia);

      case "recordConsent":
        const { userId, purpose, granted } = body;
        if (!userId || !purpose || granted === undefined) {
          return NextResponse.json(
            { error: "userId, purpose, and granted required" },
            { status: 400 }
          );
        }
        const consent = await privacyComplianceService.recordConsent(
          userId,
          purpose,
          granted
        );
        return NextResponse.json(consent);

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[API] Privacy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
