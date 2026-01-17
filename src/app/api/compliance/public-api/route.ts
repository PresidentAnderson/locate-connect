/**
 * Public API Management Route
 * Third-party API access control
 */

import { NextRequest, NextResponse } from "next/server";
import { publicAPIService } from "@/lib/services/public-api-service";
import type { PublicAPIRequest } from "@/types/compliance.types";

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
        const apiRequest = publicAPIService.getRequest(requestId);
        if (!apiRequest) {
          return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }
        return NextResponse.json(apiRequest);

      case "requests":
        const status = searchParams.get("status") as PublicAPIRequest["status"] | undefined;
        const requests = publicAPIService.listRequests(status);
        return NextResponse.json(requests);

      case "key":
        const keyId = searchParams.get("keyId");
        if (!keyId) {
          return NextResponse.json({ error: "Key ID required" }, { status: 400 });
        }
        const key = publicAPIService.getKey(keyId);
        if (!key) {
          return NextResponse.json({ error: "Key not found" }, { status: 404 });
        }
        return NextResponse.json(key);

      case "keys":
        const orgId = searchParams.get("organizationId") || undefined;
        const keys = publicAPIService.listKeys(orgId);
        return NextResponse.json(keys);

      case "scopes":
        const scopes = publicAPIService.getAvailableScopes();
        return NextResponse.json(scopes);

      case "usage":
        const usageKeyId = searchParams.get("keyId");
        if (!usageKeyId) {
          return NextResponse.json({ error: "Key ID required" }, { status: 400 });
        }
        const usage = publicAPIService.getUsageStats(usageKeyId);
        return NextResponse.json(usage);

      case "validate":
        const apiKey = searchParams.get("key");
        if (!apiKey) {
          return NextResponse.json({ error: "API key required" }, { status: 400 });
        }
        const validation = publicAPIService.validateKey(apiKey);
        return NextResponse.json(validation);

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[API] Public API error:", error);
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
        const { organizationName, contactName, contactEmail, purpose, requestedScopes } = body;
        if (!organizationName || !contactName || !contactEmail || !purpose || !requestedScopes) {
          return NextResponse.json(
            { error: "All fields required" },
            { status: 400 }
          );
        }
        const newRequest = await publicAPIService.submitRequest({
          organizationName,
          contactName,
          contactEmail,
          purpose,
          requestedScopes,
        });
        return NextResponse.json(newRequest);

      case "approve":
        const { requestId, approvedScopes, rateLimit, reviewerId } = body;
        if (!requestId || !approvedScopes || !rateLimit || !reviewerId) {
          return NextResponse.json(
            { error: "requestId, approvedScopes, rateLimit, and reviewerId required" },
            { status: 400 }
          );
        }
        const approveResult = await publicAPIService.approveRequest(
          requestId,
          approvedScopes,
          rateLimit,
          reviewerId
        );
        if (!approveResult) {
          return NextResponse.json({ error: "Request not found or not pending" }, { status: 404 });
        }
        return NextResponse.json(approveResult);

      case "deny":
        const { requestId: denyId, reviewerId: denyReviewerId } = body;
        if (!denyId || !denyReviewerId) {
          return NextResponse.json(
            { error: "requestId and reviewerId required" },
            { status: 400 }
          );
        }
        const denyResult = await publicAPIService.denyRequest(denyId, denyReviewerId);
        return NextResponse.json({ success: denyResult });

      case "suspend":
        const { keyId: suspendKeyId } = body;
        if (!suspendKeyId) {
          return NextResponse.json({ error: "Key ID required" }, { status: 400 });
        }
        const suspendResult = publicAPIService.suspendKey(suspendKeyId);
        return NextResponse.json({ success: suspendResult });

      case "revoke":
        const { keyId: revokeKeyId } = body;
        if (!revokeKeyId) {
          return NextResponse.json({ error: "Key ID required" }, { status: 400 });
        }
        const revokeResult = publicAPIService.revokeKey(revokeKeyId);
        return NextResponse.json({ success: revokeResult });

      case "reactivate":
        const { keyId: reactivateKeyId } = body;
        if (!reactivateKeyId) {
          return NextResponse.json({ error: "Key ID required" }, { status: 400 });
        }
        const reactivateResult = publicAPIService.reactivateKey(reactivateKeyId);
        return NextResponse.json({ success: reactivateResult });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[API] Public API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
