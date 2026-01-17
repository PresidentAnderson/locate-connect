import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { TranscriptStatus } from "@/types";

interface RouteParams {
  params: Promise<{ caseId: string; evidenceId: string }>;
}

interface TranscriptPayload {
  transcriptText?: string;
  status?: TranscriptStatus;
  provider?: string;
  confidence?: number;
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

export async function POST(request: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { caseId, evidenceId } = await params;
  const resolvedCaseId = await getCaseId(supabase, caseId);

  if (!resolvedCaseId) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  if (!uuidRegex.test(evidenceId)) {
    return NextResponse.json({ error: "Invalid evidence id" }, { status: 400 });
  }

  const body = (await request.json()) as TranscriptPayload;
  const defaultProvider = process.env.TRANSCRIPTION_PROVIDER ?? "openai";

  const { data: existing, error: existingError } = await supabase
    .from("case_evidence_items")
    .select("id, transcript_status")
    .eq("id", evidenceId)
    .eq("case_id", resolvedCaseId)
    .single();

  if (existingError || !existing) {
    return NextResponse.json({ error: "Evidence not found" }, { status: 404 });
  }

  const nextStatus = body.status ?? "completed";

  const { data: updated, error: updateError } = await supabase
    .from("case_evidence_items")
    .update({
      transcript_text: body.transcriptText ?? null,
      transcript_status: nextStatus,
      transcript_provider: body.provider ?? defaultProvider,
      transcript_confidence: body.confidence ?? null,
    })
    .eq("id", evidenceId)
    .select("*")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message ?? "Failed to update transcript" },
      { status: 500 }
    );
  }

  const eventType =
    existing.transcript_status === "completed" ? "transcript_edited" : "transcription_created";

  const { error: custodyError } = await supabase
    .from("evidence_custody_events")
    .insert({
      evidence_item_id: updated.id,
      case_id: resolvedCaseId,
      actor_id: user.id,
      event_type: eventType,
      metadata: {
        provider: updated.transcript_provider,
        confidence: updated.transcript_confidence,
      },
    });

  if (custodyError) {
    return NextResponse.json({ error: custodyError.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" }, { status: 200 });
}
