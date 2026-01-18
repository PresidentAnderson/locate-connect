/**
 * Phase 2 Gating API Route
 * Launch criteria and jurisdiction expansion endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import { phase2GatingService } from "@/lib/services/phase2-gating-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "criteria":
        const criteria = phase2GatingService.getCriteria();
        return NextResponse.json(criteria);

      case "criterion":
        const criterionId = searchParams.get("criterionId");
        if (!criterionId) {
          return NextResponse.json({ error: "Criterion ID required" }, { status: 400 });
        }
        const criterion = phase2GatingService.getCriterion(criterionId);
        if (!criterion) {
          return NextResponse.json({ error: "Criterion not found" }, { status: 404 });
        }
        return NextResponse.json(criterion);

      case "readiness":
        const readiness = phase2GatingService.getReadiness();
        return NextResponse.json(readiness);

      case "launchReady":
        const launchStatus = phase2GatingService.isReadyForLaunch();
        return NextResponse.json(launchStatus);

      case "jurisdictions":
        const jurisdictions = phase2GatingService.getJurisdictions();
        return NextResponse.json(jurisdictions);

      case "jurisdiction":
        const jurisdictionId = searchParams.get("jurisdictionId");
        if (!jurisdictionId) {
          return NextResponse.json({ error: "Jurisdiction ID required" }, { status: 400 });
        }
        const jurisdiction = phase2GatingService.getJurisdiction(jurisdictionId);
        if (!jurisdiction) {
          return NextResponse.json({ error: "Jurisdiction not found" }, { status: 404 });
        }
        return NextResponse.json(jurisdiction);

      case "roadmap":
        const roadmap = phase2GatingService.getExpansionRoadmap();
        return NextResponse.json(roadmap);

      case "dashboard":
        return NextResponse.json({
          readiness: phase2GatingService.getReadiness(),
          launchStatus: phase2GatingService.isReadyForLaunch(),
          criteria: phase2GatingService.getCriteria(),
          jurisdictions: phase2GatingService.getEnabledJurisdictions(),
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[API] Phase 2 error:", error);
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
      case "updateCriterion":
        const { criterionId, status, progress } = body;
        if (!criterionId) {
          return NextResponse.json({ error: "Criterion ID required" }, { status: 400 });
        }
        const updated = phase2GatingService.updateCriterionProgress(
          criterionId,
          progress ?? 0,
          status
        );
        if (!updated) {
          return NextResponse.json({ error: "Criterion not found" }, { status: 404 });
        }
        return NextResponse.json(updated);

      case "enableJurisdiction":
        const { jurisdictionId: enableId } = body;
        if (!enableId) {
          return NextResponse.json({ error: "Jurisdiction ID required" }, { status: 400 });
        }
        const enableResult = phase2GatingService.enableJurisdiction(enableId);
        return NextResponse.json({ success: enableResult });

      case "disableJurisdiction":
        const { jurisdictionId: disableId } = body;
        if (!disableId) {
          return NextResponse.json({ error: "Jurisdiction ID required" }, { status: 400 });
        }
        const disableResult = phase2GatingService.disableJurisdiction(disableId);
        return NextResponse.json({ success: disableResult });

      case "addJurisdiction":
        const {
          code,
          name,
          type: jurisdictionType,
          parentId,
          country,
          timezone,
          languages,
          privacyRegulation,
          primaryContact,
          enabled,
        } = body;
        if (!code || !name || !jurisdictionType || !country || !timezone || !languages || !privacyRegulation) {
          return NextResponse.json(
            { error: "Required jurisdiction fields missing" },
            { status: 400 }
          );
        }
        const newJurisdiction = phase2GatingService.addJurisdiction({
          code,
          name,
          type: jurisdictionType,
          parentId,
          country,
          timezone,
          languages,
          privacyRegulation,
          primaryContact,
          enabled: enabled || false,
        });
        return NextResponse.json(newJurisdiction);

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[API] Phase 2 error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
