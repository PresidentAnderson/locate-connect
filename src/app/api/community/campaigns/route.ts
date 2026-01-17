/**
 * Community Campaigns API (Issue #97)
 * Manages awareness campaigns
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface CreateCampaignPayload {
  name: string;
  type: string;
  caseNumber: string;
}

// Mock data for initial implementation
const mockCampaigns = [
  {
    id: "camp-1",
    caseId: "case-1",
    caseName: "Jane Doe",
    caseNumber: "LC-2024-001",
    name: "Social Media Awareness - Jane Doe",
    type: "social_media" as const,
    status: "active" as const,
    startDate: new Date(Date.now() - 7 * 86400000).toISOString(),
    reach: 45000,
    engagement: 2300,
    tipsGenerated: 5,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: "camp-2",
    caseId: "case-2",
    caseName: "John Smith",
    caseNumber: "LC-2024-002",
    name: "Poster Distribution - John Smith",
    type: "poster" as const,
    status: "completed" as const,
    startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
    endDate: new Date(Date.now() - 15 * 86400000).toISOString(),
    reach: 12000,
    engagement: 150,
    tipsGenerated: 3,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
];

export async function GET(): Promise<NextResponse> {
  try {
    // In production, fetch from database
    const campaigns = mockCampaigns;

    const stats = {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter((c) => c.status === "active").length,
      totalReach: campaigns.reduce((sum, c) => sum + c.reach, 0),
      totalTips: campaigns.reduce((sum, c) => sum + c.tipsGenerated, 0),
    };

    return NextResponse.json({ campaigns, stats });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const body = (await request.json()) as CreateCampaignPayload;

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the case
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("id, first_name, last_name")
      .eq("case_number", body.caseNumber)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // In production, would insert into campaigns table
    const newCampaign = {
      id: `camp-${Date.now()}`,
      caseId: caseData.id,
      caseName: `${caseData.first_name} ${caseData.last_name}`,
      caseNumber: body.caseNumber,
      name: body.name,
      type: body.type,
      status: "draft",
      startDate: new Date().toISOString(),
      reach: 0,
      engagement: 0,
      tipsGenerated: 0,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      campaign: newCampaign,
    });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
