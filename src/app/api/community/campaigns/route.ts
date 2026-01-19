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
  headline?: string;
  description?: string;
  channels?: string[];
  targetArea?: string;
  startDate?: string;
  endDate?: string;
}

interface CampaignRow {
  id: string;
  case_id: string;
  name: string;
  type: string;
  status: string;
  headline?: string;
  description?: string;
  channels?: string[];
  target_area?: string;
  start_date?: string;
  end_date?: string;
  reach: number;
  engagement: number;
  tips_generated: number;
  created_at: string;
  created_by?: string;
  case_reports?: {
    id: string;
    case_number: string;
    first_name: string;
    last_name: string;
  }[] | null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const caseId = searchParams.get("caseId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build query with case info join
    let query = supabase
      .from("campaigns")
      .select(
        `
        id,
        case_id,
        name,
        type,
        status,
        headline,
        description,
        channels,
        target_area,
        start_date,
        end_date,
        reach,
        engagement,
        tips_generated,
        created_at,
        created_by,
        case_reports:case_id (id, case_number, first_name, last_name)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }
    if (type) {
      query = query.eq("type", type);
    }
    if (caseId) {
      query = query.eq("case_id", caseId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching campaigns:", error);
      return NextResponse.json(
        { error: "Failed to fetch campaigns" },
        { status: 500 }
      );
    }

    // Transform to camelCase for frontend
    const campaigns = ((data as CampaignRow[] | null) || []).map((row) => {
      const caseReport = Array.isArray(row.case_reports) ? row.case_reports[0] : row.case_reports;
      return {
        id: row.id,
        caseId: row.case_id,
        caseName: caseReport
          ? `${caseReport.first_name} ${caseReport.last_name}`
          : "Unknown",
        caseNumber: caseReport?.case_number || "",
        name: row.name,
        type: row.type,
        status: row.status,
        headline: row.headline,
        description: row.description,
        channels: row.channels,
        targetArea: row.target_area,
        startDate: row.start_date,
        endDate: row.end_date,
        reach: row.reach || 0,
        engagement: row.engagement || 0,
        tipsGenerated: row.tips_generated || 0,
        createdAt: row.created_at,
      };
    });

    // Calculate stats
    const stats = {
      totalCampaigns: count || campaigns.length,
      activeCampaigns: campaigns.filter((c) => c.status === "active").length,
      totalReach: campaigns.reduce((sum, c) => sum + c.reach, 0),
      totalTips: campaigns.reduce((sum, c) => sum + c.tipsGenerated, 0),
    };

    return NextResponse.json({
      campaigns,
      stats,
      pagination: {
        total: count || campaigns.length,
        limit,
        offset,
      },
    });
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

    // Find the case by case_number
    const { data: caseData, error: caseError } = await supabase
      .from("case_reports")
      .select("id, first_name, last_name, case_number")
      .eq("case_number", body.caseNumber)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Insert into campaigns table
    const { data: campaign, error: insertError } = await supabase
      .from("campaigns")
      .insert({
        case_id: caseData.id,
        name: body.name,
        type: body.type,
        status: "draft",
        headline: body.headline || null,
        description: body.description || null,
        channels: body.channels || [],
        target_area: body.targetArea || null,
        start_date: body.startDate || new Date().toISOString(),
        end_date: body.endDate || null,
        reach: 0,
        engagement: 0,
        tips_generated: 0,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting campaign:", insertError);
      return NextResponse.json(
        { error: "Failed to create campaign" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from("case_activity").insert({
      case_id: caseData.id,
      user_id: user.id,
      action: "campaign_created",
      details: {
        campaign_id: campaign.id,
        campaign_name: body.name,
        campaign_type: body.type,
      },
    });

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        caseId: campaign.case_id,
        caseName: `${caseData.first_name} ${caseData.last_name}`,
        caseNumber: caseData.case_number,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        startDate: campaign.start_date,
        reach: 0,
        engagement: 0,
        tipsGenerated: 0,
        createdAt: campaign.created_at,
      },
    });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
