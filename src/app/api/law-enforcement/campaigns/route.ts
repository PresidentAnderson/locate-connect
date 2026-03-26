/**
 * Community Awareness Campaigns API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { campaignService, type CreateCampaignInput } from "@/lib/services/campaign-service";
import { logger } from "../../../../lib/logger";

async function verifyLEAccess() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { authorized: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["law_enforcement", "admin", "developer"].includes(profile.role))
    return { authorized: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { authorized: true as const, user };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyLEAccess();
    if (!auth.authorized) return auth.response;

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
    logger.error("[API] Error listing campaigns:", { error: error });
    return NextResponse.json(
      { error: "Failed to list campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyLEAccess();
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const userId = auth.user.id;

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
    logger.error("[API] Error creating campaign:", { error: error });
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
