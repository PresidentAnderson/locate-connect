/**
 * Shift Handoff Reports List API (Issue #101)
 * Returns list of generated shift reports
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ShiftReportRow {
  id: string;
  shift_date: string;
  shift_type: "day" | "evening" | "night";
  generated_at: string;
  generated_by: string;
  signed_off_by?: string;
  signed_off_at?: string;
  critical_cases: number;
  new_cases: number;
  pending_actions: number;
  status: "draft" | "pending_signoff" | "signed_off";
  outgoing_officer_id: string;
  incoming_officer_id?: string;
  notes?: string;
  profiles?: { full_name: string }[] | null;
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const shiftType = searchParams.get("shiftType");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build query
    let query = supabase
      .from("shift_reports")
      .select(
        `
        id,
        shift_date,
        shift_type,
        generated_at,
        generated_by,
        signed_off_by,
        signed_off_at,
        critical_cases,
        new_cases,
        pending_actions,
        status,
        outgoing_officer_id,
        incoming_officer_id,
        notes,
        profiles:outgoing_officer_id (full_name)
      `
      )
      .order("shift_date", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (startDate) {
      query = query.gte("shift_date", startDate);
    }
    if (endDate) {
      query = query.lte("shift_date", endDate);
    }
    if (shiftType && ["day", "evening", "night"].includes(shiftType)) {
      query = query.eq("shift_type", shiftType);
    }
    if (status && ["draft", "pending_signoff", "signed_off"].includes(status)) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching shift reports:", error);
      return NextResponse.json(
        { error: "Failed to fetch reports" },
        { status: 500 }
      );
    }

    // Transform to camelCase for frontend
    const reports = ((data as ShiftReportRow[] | null) || []).map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: row.id,
        shiftDate: row.shift_date,
        shiftType: row.shift_type,
        generatedAt: row.generated_at,
        generatedBy: profile?.full_name || row.generated_by,
        signedOffBy: row.signed_off_by,
        signedOffAt: row.signed_off_at,
        criticalCases: row.critical_cases,
        newCases: row.new_cases,
        pendingActions: row.pending_actions,
        status: row.status,
        outgoingOfficerId: row.outgoing_officer_id,
        incomingOfficerId: row.incoming_officer_id,
        notes: row.notes,
      };
    });

    return NextResponse.json({
      reports,
      pagination: {
        total: count || reports.length,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Error fetching shift reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Validate required fields
    const { shiftDate, shiftType, outgoingOfficerId, notes } = body;

    if (!shiftDate || !shiftType || !outgoingOfficerId) {
      return NextResponse.json(
        { error: "Missing required fields: shiftDate, shiftType, outgoingOfficerId" },
        { status: 400 }
      );
    }

    // Get counts for the shift
    const shiftStart = new Date(shiftDate);
    const shiftEnd = new Date(shiftStart);
    shiftEnd.setHours(shiftEnd.getHours() + 8); // 8-hour shift

    // Count critical cases (priority = 'critical')
    const { count: criticalCases } = await supabase
      .from("case_reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .eq("priority", "critical");

    // Count new cases created during this shift
    const { count: newCases } = await supabase
      .from("case_reports")
      .select("*", { count: "exact", head: true })
      .gte("created_at", shiftStart.toISOString())
      .lte("created_at", shiftEnd.toISOString());

    // Count pending actions/tasks
    const { count: pendingActions } = await supabase
      .from("case_tasks")
      .select("*", { count: "exact", head: true })
      .eq("assigned_to", outgoingOfficerId)
      .eq("status", "pending");

    // Insert the report
    const { data, error } = await supabase
      .from("shift_reports")
      .insert({
        shift_date: shiftDate,
        shift_type: shiftType,
        generated_at: new Date().toISOString(),
        generated_by: outgoingOfficerId,
        outgoing_officer_id: outgoingOfficerId,
        critical_cases: criticalCases || 0,
        new_cases: newCases || 0,
        pending_actions: pendingActions || 0,
        status: "draft",
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating shift report:", error);
      return NextResponse.json(
        { error: "Failed to create report" },
        { status: 500 }
      );
    }

    return NextResponse.json({ report: data }, { status: 201 });
  } catch (error) {
    console.error("Error creating shift report:", error);
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 }
    );
  }
}
