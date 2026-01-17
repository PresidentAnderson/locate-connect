/**
 * Community Awareness Campaigns API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { campaignService, type CreateCampaignInput } from "@/lib/services/campaign-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");
    const active = searchParams.get("active");

    if (active === "true") {
      const campaigns = await campaignService.getActiveCampaigns();
      return NextResponse.json({ campaigns });
    }

    if (caseId) {
      const campaigns = await campaignService.listCampaigns(caseId);
      return NextResponse.json({ campaigns });
    }

    return NextResponse.json(
      { error: "caseId required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[API] Error listing campaigns:", error);
    return NextResponse.json(
      { error: "Failed to list campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = request.headers.get("x-user-id") || "system";

    const input: CreateCampaignInput = {
      caseId: body.caseId,
      name: body.name,
      type: body.type,
      headline: body.headline,
      description: body.description,
      imageUrls: body.imageUrls,
      channels: body.channels,
      targetArea: body.targetArea,
      startDate: body.startDate,
      endDate: body.endDate,
    };

    const campaign = await campaignService.createCampaign(input, userId);

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("[API] Error creating campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
