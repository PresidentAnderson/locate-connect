import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  CaseResolutionStatus,
  CaseResolutionType,
  RetentionStatus,
} from "@/types";
import {
  POSITIVE_RESOLUTION_TYPES,
  SENSITIVE_RESOLUTION_TYPES,
} from "@/types/case-resolution.types";

interface RouteParams {
  params: Promise<{ caseId: string }>;
}

interface ResolutionPayload {
  resolutionType?: CaseResolutionType;
  outcomeNotes?: string;
  action?: "save_draft" | "submit_for_signoff" | "sign_off" | "close";
  familyNotification?: {
    channel: string;
    notifiedAt?: string;
    notes?: string;
  };
  retention?: {
    status?: RetentionStatus;
    scheduledPurgeAt?: string | null;
    legalHold?: boolean;
    notes?: string;
  };
  successStoryConsent?: boolean;
  successStoryNotes?: string;
}

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getCaseId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  caseId: string
) {
  if (uuidRegex.test(caseId)) {
    return caseId;
  }

  const { data, error } = await supabase
    .from("cases")
    .select("id")
    .eq("case_number", caseId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.id as string;
}

async function getUserRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return (data?.role as string | undefined) ?? null;
}

function isLawEnforcement(role: string | null) {
  return role === "law_enforcement" || role === "admin";
}

/** Map resolution type to appropriate case status */
function getResolutionCaseStatus(resolutionType: CaseResolutionType | null): string {
  if (!resolutionType) return "closed";

  // Positive outcomes
  if (POSITIVE_RESOLUTION_TYPES.includes(resolutionType)) {
    return "resolved";
  }

  // Sensitive outcomes
  if (SENSITIVE_RESOLUTION_TYPES.includes(resolutionType)) {
    if (resolutionType === "found_deceased") {
      return "resolved_deceased";
    }
    if (resolutionType === "false_report") {
      return "false_report";
    }
  }

  // Other closures
  if (resolutionType === "closed_insufficient_info") {
    return "archived";
  }

  return "closed";
}

function mapResolution(row: Record<string, unknown> | null) {
  if (!row) return null;
  return {
    id: row.id as string,
    caseId: row.case_id as string,
    resolutionType: row.resolution_type as CaseResolutionType | null,
    outcomeNotes: row.outcome_notes as string | null,
    status: row.status as CaseResolutionStatus,
    submittedForSignoffBy: row.submitted_for_signoff_by as string | null,
    submittedForSignoffAt: row.submitted_for_signoff_at as string | null,
    leSignedOffBy: row.le_signed_off_by as string | null,
    leSignedOffAt: row.le_signed_off_at as string | null,
    closedBy: row.closed_by as string | null,
    closedAt: row.closed_at as string | null,
    successStoryConsent: row.success_story_consent as boolean,
    successStoryNotes: row.success_story_notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapDocument(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    caseId: row.case_id as string,
    resolutionId: row.resolution_id as string | null,
    uploadedBy: row.uploaded_by as string | null,
    fileName: row.file_name as string,
    fileType: row.file_type as string | null,
    fileSize: row.file_size as number | null,
    storageBucket: row.storage_bucket as string,
    storagePath: row.storage_path as string,
    metadata: row.metadata as Record<string, unknown> | null,
    createdAt: row.created_at as string,
  };
}

function mapRetention(row: Record<string, unknown> | null) {
  if (!row) return null;
  return {
    id: row.id as string,
    caseId: row.case_id as string,
    retentionStatus: row.retention_status as RetentionStatus,
    scheduledPurgeAt: row.scheduled_purge_at as string | null,
    legalHold: row.legal_hold as boolean,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function GET(_: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { caseId } = await params;
  const resolvedCaseId = await getCaseId(supabase, caseId);

  if (!resolvedCaseId) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const { data: resolution } = await supabase
    .from("case_resolutions")
    .select("*")
    .eq("case_id", resolvedCaseId)
    .single();

  const { data: documents } = await supabase
    .from("case_resolution_documents")
    .select("*")
    .eq("case_id", resolvedCaseId)
    .order("created_at", { ascending: false });

  const { data: retention } = await supabase
    .from("case_retention_flags")
    .select("*")
    .eq("case_id", resolvedCaseId)
    .single();

  return NextResponse.json(
    {
      resolution: mapResolution(resolution as Record<string, unknown> | null),
      documents: (documents as Record<string, unknown>[] | null)?.map(
        mapDocument
      ),
      retention: mapRetention(retention as Record<string, unknown> | null),
    },
    { status: 200 }
  );
}

export async function POST(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ResolutionPayload;
  const { caseId } = await params;
  const resolvedCaseId = await getCaseId(supabase, caseId);

  if (!resolvedCaseId) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const role = await getUserRole(supabase, user.id);

  const { data: caseRecord, error: caseError } = await supabase
    .from("cases")
    .select("id, is_locked")
    .eq("id", resolvedCaseId)
    .single();

  if (caseError || !caseRecord) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  if (caseRecord.is_locked && role !== "admin") {
    return NextResponse.json(
      { error: "Case is locked" },
      { status: 403 }
    );
  }

  const { data: existingResolution } = await supabase
    .from("case_resolutions")
    .select(
      "id, status, resolution_type, outcome_notes, success_story_consent, success_story_notes, submitted_for_signoff_by, submitted_for_signoff_at, le_signed_off_by, le_signed_off_at, closed_by, closed_at"
    )
    .eq("case_id", resolvedCaseId)
    .single();

  let nextStatus: CaseResolutionStatus =
    (existingResolution?.status as CaseResolutionStatus | undefined) ?? "draft";

  if (body.action === "submit_for_signoff") {
    nextStatus = "pending_le_signoff";
  }

  if (body.action === "sign_off") {
    if (!isLawEnforcement(role)) {
      return NextResponse.json(
        { error: "Law enforcement sign-off required" },
        { status: 403 }
      );
    }
    nextStatus = "signed_off";
  }

  if (body.action === "close") {
    if (!isLawEnforcement(role)) {
      return NextResponse.json(
        { error: "Law enforcement sign-off required" },
        { status: 403 }
      );
    }
    if (nextStatus !== "signed_off") {
      return NextResponse.json(
        { error: "Case must be signed off before closure" },
        { status: 400 }
      );
    }
    nextStatus = "closed";
  }

  const now = new Date().toISOString();

  const { data: resolution, error: resolutionError } = await supabase
    .from("case_resolutions")
    .upsert(
      {
        case_id: resolvedCaseId,
        resolution_type:
          body.resolutionType ?? existingResolution?.resolution_type ?? null,
        outcome_notes: body.outcomeNotes ?? existingResolution?.outcome_notes ?? null,
        status: nextStatus,
        submitted_for_signoff_by:
          body.action === "submit_for_signoff"
            ? user.id
            : existingResolution?.submitted_for_signoff_by ?? null,
        submitted_for_signoff_at:
          body.action === "submit_for_signoff"
            ? now
            : existingResolution?.submitted_for_signoff_at ?? null,
        le_signed_off_by:
          body.action === "sign_off"
            ? user.id
            : existingResolution?.le_signed_off_by ?? null,
        le_signed_off_at:
          body.action === "sign_off"
            ? now
            : existingResolution?.le_signed_off_at ?? null,
        closed_by:
          body.action === "close"
            ? user.id
            : existingResolution?.closed_by ?? null,
        closed_at:
          body.action === "close"
            ? now
            : existingResolution?.closed_at ?? null,
        success_story_consent:
          body.successStoryConsent ?? existingResolution?.success_story_consent ?? false,
        success_story_notes:
          body.successStoryNotes ?? existingResolution?.success_story_notes ?? null,
      },
      { onConflict: "case_id" }
    )
    .select("*")
    .single();

  if (resolutionError || !resolution) {
    return NextResponse.json(
      { error: resolutionError?.message ?? "Failed to update resolution" },
      { status: 500 }
    );
  }

  const events = [] as Array<{
    case_id: string;
    resolution_id: string;
    event_type: string;
    actor_id: string;
    metadata: Record<string, unknown>;
  }>;

  if (body.action === "submit_for_signoff") {
    events.push({
      case_id: resolvedCaseId,
      resolution_id: resolution.id as string,
      event_type: "signoff_requested",
      actor_id: user.id,
      metadata: {},
    });
  }

  if (body.action === "sign_off") {
    events.push({
      case_id: resolvedCaseId,
      resolution_id: resolution.id as string,
      event_type: "signoff_completed",
      actor_id: user.id,
      metadata: {},
    });
  }

  if (body.action === "close") {
    const resolutionType = resolution.resolution_type as CaseResolutionType | null;
    const isPositive = resolutionType && POSITIVE_RESOLUTION_TYPES.includes(resolutionType);
    const isSensitive = resolutionType && SENSITIVE_RESOLUTION_TYPES.includes(resolutionType);

    events.push({
      case_id: resolvedCaseId,
      resolution_id: resolution.id as string,
      event_type: "case_closed",
      actor_id: user.id,
      metadata: {
        resolutionType: resolution.resolution_type,
        outcomeCategory: isPositive ? "positive" : isSensitive ? "sensitive" : "neutral",
        successStoryConsent: resolution.success_story_consent,
      },
    });

    // Log statistics compilation event
    events.push({
      case_id: resolvedCaseId,
      resolution_id: resolution.id as string,
      event_type: "statistics_compiled",
      actor_id: user.id,
      metadata: {
        resolutionType: resolution.resolution_type,
        closedAt: now,
      },
    });

    // Log resource deactivation event
    events.push({
      case_id: resolvedCaseId,
      resolution_id: resolution.id as string,
      event_type: "resources_deactivated",
      actor_id: user.id,
      metadata: {
        deactivatedAt: now,
      },
    });

    // Log lead archival event
    events.push({
      case_id: resolvedCaseId,
      resolution_id: resolution.id as string,
      event_type: "leads_archived",
      actor_id: user.id,
      metadata: {
        archivedAt: now,
      },
    });
  }

  if (body.familyNotification) {
    events.push({
      case_id: resolvedCaseId,
      resolution_id: resolution.id as string,
      event_type: "family_notified",
      actor_id: user.id,
      metadata: {
        channel: body.familyNotification.channel,
        notifiedAt: body.familyNotification.notifiedAt ?? now,
        notes: body.familyNotification.notes ?? null,
      },
    });
  }

  // Log success story consent if provided
  if (body.action === "close" && body.successStoryConsent) {
    events.push({
      case_id: resolvedCaseId,
      resolution_id: resolution.id as string,
      event_type: "success_story_consent_given",
      actor_id: user.id,
      metadata: {
        notes: body.successStoryNotes ?? null,
        consentedAt: now,
      },
    });
  }

  if (events.length > 0) {
    const { error: eventError } = await supabase
      .from("case_resolution_events")
      .insert(events);

    if (eventError) {
      return NextResponse.json(
        { error: eventError.message },
        { status: 500 }
      );
    }
  }

  if (body.action === "close") {
    const resolutionType = resolution.resolution_type as CaseResolutionType | null;
    const caseStatus = getResolutionCaseStatus(resolutionType);

    const { error: caseUpdateError } = await supabase
      .from("cases")
      .update({
        status: caseStatus,
        resolution_date: now,
        is_locked: true,
        locked_at: now,
        locked_by: user.id,
      })
      .eq("id", resolvedCaseId);

    if (caseUpdateError) {
      return NextResponse.json(
        { error: caseUpdateError.message },
        { status: 500 }
      );
    }
  }

  if (body.retention) {
    const { error: retentionError } = await supabase
      .from("case_retention_flags")
      .upsert(
        {
          case_id: resolvedCaseId,
          retention_status: body.retention.status ?? "active",
          scheduled_purge_at: body.retention.scheduledPurgeAt ?? null,
          legal_hold: body.retention.legalHold ?? false,
          notes: body.retention.notes ?? null,
        },
        { onConflict: "case_id" }
      );

    if (retentionError) {
      return NextResponse.json(
        { error: retentionError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { resolution: mapResolution(resolution as Record<string, unknown>) },
    { status: 200 }
  );
}
