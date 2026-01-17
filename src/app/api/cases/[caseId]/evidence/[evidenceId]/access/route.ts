import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ caseId: string; evidenceId: string }>;
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

export async function GET(request: Request, { params }: RouteParams) {
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

  const { data: evidence, error } = await supabase
    .from("case_evidence_items")
    .select("id, storage_bucket, storage_path")
    .eq("id", evidenceId)
    .eq("case_id", resolvedCaseId)
    .single();

  if (error || !evidence) {
    return NextResponse.json({ error: "Evidence not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action") === "download" ? "downloaded" : "accessed";

  const { data: signedUrl, error: signedError } = await supabase.storage
    .from(evidence.storage_bucket)
    .createSignedUrl(evidence.storage_path, 60 * 60);

  if (signedError || !signedUrl) {
    return NextResponse.json(
      { error: signedError?.message ?? "Failed to create signed URL" },
      { status: 500 }
    );
  }

  const { error: custodyError } = await supabase
    .from("evidence_custody_events")
    .insert({
      evidence_item_id: evidence.id,
      case_id: resolvedCaseId,
      actor_id: user.id,
      event_type: action,
      metadata: {
        expiresInSeconds: 3600,
      },
    });

  if (custodyError) {
    return NextResponse.json({ error: custodyError.message }, { status: 500 });
  }

  return NextResponse.json({ url: signedUrl.signedUrl }, { status: 200 });
}
