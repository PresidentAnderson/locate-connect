/**
 * Shift Handoff Summary API (Issue #101)
 * Returns current shift summary data for LE handoff
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getShiftBoundaries(): { start: Date; end: Date; type: "day" | "evening" | "night" } {
  const now = new Date();
  const hour = now.getHours();

  let start: Date;
  let end: Date;
  let type: "day" | "evening" | "night";

  if (hour >= 6 && hour < 14) {
    // Day shift: 06:00 - 14:00
    start = new Date(now);
    start.setHours(6, 0, 0, 0);
    end = new Date(now);
    end.setHours(14, 0, 0, 0);
    type = "day";
  } else if (hour >= 14 && hour < 22) {
    // Evening shift: 14:00 - 22:00
    start = new Date(now);
    start.setHours(14, 0, 0, 0);
    end = new Date(now);
    end.setHours(22, 0, 0, 0);
    type = "evening";
  } else {
    // Night shift: 22:00 - 06:00
    if (hour >= 22) {
      start = new Date(now);
      start.setHours(22, 0, 0, 0);
      end = new Date(now);
      end.setDate(end.getDate() + 1);
      end.setHours(6, 0, 0, 0);
    } else {
      start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(22, 0, 0, 0);
      end = new Date(now);
      end.setHours(6, 0, 0, 0);
    }
    type = "night";
  }

  return { start, end, type };
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { start, end } = getShiftBoundaries();

    // Get critical cases (P0 and P1)
    const { data: criticalCases } = await supabase
      .from("cases")
      .select("id, case_number, first_name, last_name, priority_level, status, updated_at")
      .in("priority_level", ["p0_critical", "p1_high"])
      .eq("status", "active")
      .order("priority_level")
      .limit(20);

    // Get new cases this shift
    const { data: newCases } = await supabase
      .from("cases")
      .select("id, case_number, first_name, last_name, created_at")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    // Get new leads this shift
    const { data: newLeads } = await supabase
      .from("leads")
      .select(`
        id,
        title,
        source,
        created_at,
        case:cases!case_id(case_number)
      `)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    // Get officer assignments
    const { data: assignments } = await supabase
      .from("case_assignments")
      .select(`
        user:profiles!user_id(full_name),
        case_id
      `)
      .eq("is_active", true);

    // Aggregate officer workloads
    const officerWorkloads = new Map<string, number>();
    if (assignments) {
      for (const a of assignments) {
        const userRecord = a.user as unknown as { full_name: string } | null;
        const name = userRecord?.full_name || "Unknown";
        officerWorkloads.set(name, (officerWorkloads.get(name) || 0) + 1);
      }
    }

    const officerAssignments = Array.from(officerWorkloads.entries()).map(([name, count]) => ({
      officerName: name,
      activeCases: count,
    }));

    // Format response
    const response = {
      criticalCases: (criticalCases || []).map((c) => ({
        id: c.id,
        caseNumber: c.case_number,
        name: `${c.first_name} ${c.last_name}`,
        priority: c.priority_level,
        status: c.status,
        lastUpdate: new Date(c.updated_at as string).toLocaleString(),
      })),
      newCases: (newCases || []).map((c) => ({
        id: c.id,
        caseNumber: c.case_number,
        name: `${c.first_name} ${c.last_name}`,
        reportedAt: new Date(c.created_at as string).toLocaleTimeString(),
      })),
      newLeads: (newLeads || []).map((l) => {
        const caseRecord = l.case as unknown as { case_number: string } | null;
        return {
          id: l.id,
          caseNumber: caseRecord?.case_number || "N/A",
          title: l.title,
          source: l.source || "Unknown",
          createdAt: new Date(l.created_at as string).toLocaleTimeString(),
        };
      }),
      pendingActions: [], // Would come from a pending_actions table if implemented
      officerAssignments,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching shift summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch shift summary" },
      { status: 500 }
    );
  }
}
