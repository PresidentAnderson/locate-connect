import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EvidenceItemType } from "@/types";

interface RouteParams {
  params: Promise<{ caseId: string }>;
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

function mapEvidence(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    caseId: row.case_id as string,
    uploadedBy: row.uploaded_by as string | null,
    itemType: row.item_type as EvidenceItemType,
    fileName: row.file_name as string,
    fileType: row.file_type as string | null,
    fileSize: row.file_size as number | null,
    storageBucket: row.storage_bucket as string,
    storagePath: row.storage_path as string,
    durationSeconds: row.duration_seconds as number | null,
    transcriptText: row.transcript_text as string | null,
    transcriptStatus: row.transcript_status as string,
    transcriptProvider: row.transcript_provider as string | null,
    transcriptConfidence: row.transcript_confidence as number | null,
    metadata: row.metadata as Record<string, unknown> | null,
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

  const { data, error } = await supabase
    .from("case_evidence_items")
    .select("*")
    .eq("case_id", resolvedCaseId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { items: (data ?? []).map((row) => mapEvidence(row as Record<string, unknown>)) },
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

  const { caseId } = await params;
  const resolvedCaseId = await getCaseId(supabase, caseId);

  if (!resolvedCaseId) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const durationSeconds = formData.get("durationSeconds") as string | null;

  if (!file) {
    return NextResponse.json({ error: "File required" }, { status: 400 });
  }

  if (!file.type.startsWith("audio/")) {
    return NextResponse.json({ error: "Audio files only" }, { status: 400 });
  }

  const evidenceId = crypto.randomUUID();
  const storagePath = `cases/${resolvedCaseId}/evidence/${evidenceId}/${file.name}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("case-evidence")
    .upload(storagePath, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError || !uploadData) {
    return NextResponse.json(
      { error: uploadError?.message ?? "Failed to upload evidence" },
      { status: 500 }
    );
  }

  const { data: evidence, error: evidenceError } = await supabase
    .from("case_evidence_items")
    .insert({
      id: evidenceId,
      case_id: resolvedCaseId,
      uploaded_by: user.id,
      item_type: "audio",
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_bucket: "case-evidence",
      storage_path: uploadData.path,
      duration_seconds: durationSeconds ? Number(durationSeconds) : null,
      metadata: { source: "web" },
    })
    .select("*")
    .single();

  if (evidenceError || !evidence) {
    await supabase.storage.from("case-evidence").remove([uploadData.path]);
    return NextResponse.json(
      { error: evidenceError?.message ?? "Failed to save evidence" },
      { status: 500 }
    );
  }

  const { error: custodyError } = await supabase
    .from("evidence_custody_events")
    .insert({
      evidence_item_id: evidence.id,
      case_id: resolvedCaseId,
      actor_id: user.id,
      event_type: "uploaded",
      metadata: {
        fileName: evidence.file_name,
        fileType: evidence.file_type,
      },
    });

  if (custodyError) {
    return NextResponse.json({ error: custodyError.message }, { status: 500 });
  }

  return NextResponse.json(
    { item: mapEvidence(evidence as Record<string, unknown>) },
    { status: 201 }
  );
}
