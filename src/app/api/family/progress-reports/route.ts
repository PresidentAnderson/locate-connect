import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/family/progress-reports
 * List progress reports for a case
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");
    const reportType = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!caseId) {
      return NextResponse.json({ error: "Case ID is required" }, { status: 400 });
    }

    // Verify access
    const { data: caseData } = await supabase
      .from("cases")
      .select("reporter_id")
      .eq("id", caseId)
      .single();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isOwner = caseData?.reporter_id === user.id;
    const isLE = profile && ["law_enforcement", "admin", "developer"].includes(profile.role);

    if (!isOwner && !isLE) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let query = supabase
      .from("case_progress_reports")
      .select(`
        *,
        generator:profiles!case_progress_reports_generated_by_fkey(id, first_name, last_name)
      `, { count: "exact" })
      .eq("case_id", caseId)
      .order("period_end", { ascending: false });

    if (reportType) {
      query = query.eq("report_type", reportType);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching progress reports:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: count ? offset + limit < count : false,
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/family/progress-reports
 * Create a progress report (LE only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["law_enforcement", "admin", "developer"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const { data, error } = await supabase
      .from("case_progress_reports")
      .insert({
        case_id: body.caseId,
        report_type: body.reportType || "weekly",
        period_start: body.periodStart,
        period_end: body.periodEnd,
        summary: body.summary,
        activities_completed: body.activitiesCompleted || [],
        leads_followed: body.leadsFollowed || 0,
        tips_received: body.tipsReceived || 0,
        media_outreach: body.mediaOutreach,
        upcoming_activities: body.upcomingActivities || [],
        family_questions: body.familyQuestions || [],
        questions_answered: body.questionsAnswered || [],
        generated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating progress report:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/family/progress-reports
 * Update a progress report (e.g., mark as sent)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["law_enforcement", "admin", "developer"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.sentToFamily !== undefined) {
      updateData.sent_to_family = body.sentToFamily;
      if (body.sentToFamily) {
        updateData.sent_at = new Date().toISOString();
      }
    }

    if (body.familyFeedback !== undefined) updateData.family_feedback = body.familyFeedback;
    if (body.summary !== undefined) updateData.summary = body.summary;
    if (body.activitiesCompleted !== undefined) updateData.activities_completed = body.activitiesCompleted;
    if (body.upcomingActivities !== undefined) updateData.upcoming_activities = body.upcomingActivities;

    const { data, error } = await supabase
      .from("case_progress_reports")
      .update(updateData)
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating progress report:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
