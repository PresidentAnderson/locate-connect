/**
 * Shift Handoff Reports List API (Issue #101)
 * Returns list of generated shift reports
 */

import { NextResponse } from "next/server";

// Mock data for now - would be stored in database in production
const mockReports = [
  {
    id: "report-1",
    shiftDate: new Date().toISOString(),
    shiftType: "day" as const,
    generatedAt: new Date().toISOString(),
    generatedBy: "Sgt. Johnson",
    signedOffBy: "Lt. Smith",
    signedOffAt: new Date().toISOString(),
    criticalCases: 3,
    newCases: 2,
    pendingActions: 5,
    status: "signed_off" as const,
  },
  {
    id: "report-2",
    shiftDate: new Date(Date.now() - 86400000).toISOString(),
    shiftType: "evening" as const,
    generatedAt: new Date(Date.now() - 86400000).toISOString(),
    generatedBy: "Sgt. Williams",
    criticalCases: 2,
    newCases: 1,
    pendingActions: 3,
    status: "pending_signoff" as const,
  },
];

export async function GET(): Promise<NextResponse> {
  try {
    // In production, this would fetch from a shift_reports table
    return NextResponse.json({ reports: mockReports });
  } catch (error) {
    console.error("Error fetching shift reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
