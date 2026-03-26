import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  ScheduledReport,
  GeneratedReport,
  ReportGenerationRequest,
  ReportGenerationResponse,
  ReportFrequency,
  ReportFormat,
} from "@/types/dashboard.types";
import { logger } from "../../../../lib/logger";

// GET - Fetch scheduled and generated reports
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "all"; // 'scheduled', 'generated', 'all'
    const limit = parseInt(searchParams.get("limit") || "20");

    const results: {
      scheduledReports?: ScheduledReport[];
      generatedReports?: GeneratedReport[];
    } = {};

    if (type === "scheduled" || type === "all") {
      const { data: scheduled, error: scheduledError } = await supabase
        .from("scheduled_reports")
        .select("*")
        .order("next_run_at", { ascending: true })
        .limit(limit);

      if (scheduledError) throw scheduledError;

      results.scheduledReports = (scheduled || []).map(formatScheduledReport);
    }

    if (type === "generated" || type === "all") {
      const { data: generated, error: generatedError } = await supabase
        .from("generated_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (generatedError) throw generatedError;

      results.generatedReports = (generated || []).map(formatGeneratedReport);
    }

    return NextResponse.json(results);
  } catch (error) {
    logger.error("Error fetching reports:", { error: error });
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

// POST - Generate a new report
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body: ReportGenerationRequest = await request.json();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate request
    if (!body.reportType || !body.dateFrom || !body.dateTo || !body.format) {
      return NextResponse.json(
        { error: "Missing required fields: reportType, dateFrom, dateTo, format" },
        { status: 400 }
      );
    }

    // Create the generated report record
    const { data: report, error: insertError } = await supabase
      .from("generated_reports")
      .insert({
        name: `${body.reportType} - ${body.dateFrom} to ${body.dateTo}`,
        report_type: body.reportType,
        format: body.format,
        date_from: body.dateFrom,
        date_to: body.dateTo,
        jurisdiction_id: body.jurisdictionId,
        organization_id: body.organizationId,
        filters_applied: body.customFilters || {},
        generated_by: user.id,
        generation_started_at: new Date().toISOString(),
        delivery_status: "pending",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // In a real implementation, you would queue this for background processing
    // For now, we'll simulate immediate completion with a placeholder URL
    const { error: updateError } = await supabase
      .from("generated_reports")
      .update({
        generation_completed_at: new Date().toISOString(),
        file_url: `/api/dashboard/reports/${report.id}/download`,
        file_size_bytes: 0, // Would be calculated after generation
      })
      .eq("id", report.id);

    if (updateError) {
      logger.error("Error updating report status:", { error: updateError });
    }

    const response: ReportGenerationResponse = {
      reportId: report.id,
      status: "completed",
      fileUrl: `/api/dashboard/reports/${report.id}/download`,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    logger.error("Error generating report:", { error: error });
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

// Helper types for DB row shapes
interface ScheduledReportDbRow {
  id: string;
  name: string;
  description?: string;
  report_type: string;
  frequency: ReportFrequency;
  next_run_at: string;
  last_run_at?: string;
  timezone: string;
  jurisdiction_id?: string;
  organization_id?: string;
  date_range_days: number;
  custom_filters?: Record<string, unknown>;
  format: ReportFormat;
  include_charts: boolean;
  include_branding: boolean;
  recipients?: { email: string; name: string }[];
  cc_recipients?: { email: string; name: string }[];
  subject_template?: string;
  body_template?: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface GeneratedReportDbRow {
  id: string;
  scheduled_report_id?: string;
  name: string;
  report_type: string;
  format: ReportFormat;
  date_from: string;
  date_to: string;
  jurisdiction_id?: string;
  organization_id?: string;
  filters_applied?: Record<string, unknown>;
  file_url?: string;
  file_size_bytes?: number;
  generated_by?: string;
  generation_started_at?: string;
  generation_completed_at?: string;
  generation_error?: string;
  delivery_status: "sent" | "failed" | "pending";
  delivered_at?: string;
  delivery_error?: string;
  created_at: string;
}

// Helper functions
function formatScheduledReport(data: ScheduledReportDbRow): ScheduledReport {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    reportType: data.report_type,
    frequency: data.frequency,
    nextRunAt: data.next_run_at,
    lastRunAt: data.last_run_at,
    timezone: data.timezone,
    jurisdictionId: data.jurisdiction_id,
    organizationId: data.organization_id,
    dateRangeDays: data.date_range_days,
    customFilters: data.custom_filters || {},
    format: data.format,
    includeCharts: data.include_charts,
    includeBranding: data.include_branding,
    recipients: data.recipients || [],
    ccRecipients: data.cc_recipients || [],
    subjectTemplate: data.subject_template,
    bodyTemplate: data.body_template,
    createdBy: data.created_by,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function formatGeneratedReport(data: GeneratedReportDbRow): GeneratedReport {
  return {
    id: data.id,
    scheduledReportId: data.scheduled_report_id,
    name: data.name,
    reportType: data.report_type,
    format: data.format,
    dateFrom: data.date_from,
    dateTo: data.date_to,
    jurisdictionId: data.jurisdiction_id,
    organizationId: data.organization_id,
    filtersApplied: data.filters_applied || {},
    fileUrl: data.file_url,
    fileSizeBytes: data.file_size_bytes,
    generatedBy: data.generated_by,
    generationStartedAt: data.generation_started_at,
    generationCompletedAt: data.generation_completed_at,
    generationError: data.generation_error,
    deliveryStatus: data.delivery_status,
    deliveredAt: data.delivered_at,
    deliveryError: data.delivery_error,
    createdAt: data.created_at,
  };
}
