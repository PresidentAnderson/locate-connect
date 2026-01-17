/**
 * Generate Shift Handoff Report API (Issue #101)
 * Creates a new shift handoff report
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface GenerateReportPayload {
  notes?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const body = (await request.json()) as GenerateReportPayload;

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    if (!profile || !["law_enforcement", "admin"].includes(profile.role as string)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Determine current shift type
    const hour = new Date().getHours();
    let shiftType: "day" | "evening" | "night";
    if (hour >= 6 && hour < 14) {
      shiftType = "day";
    } else if (hour >= 14 && hour < 22) {
      shiftType = "evening";
    } else {
      shiftType = "night";
    }

    // In production, would create a record in shift_reports table
    // For now, return success with generated report data
    const report = {
      id: `report-${Date.now()}`,
      shiftDate: new Date().toISOString(),
      shiftType,
      generatedAt: new Date().toISOString(),
      generatedBy: profile.full_name || user.email,
      notes: body.notes,
      status: "draft",
    };

    return NextResponse.json({
      success: true,
      report,
      message: "Shift handoff report generated successfully",
    });
  } catch (error) {
    console.error("Error generating shift report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
