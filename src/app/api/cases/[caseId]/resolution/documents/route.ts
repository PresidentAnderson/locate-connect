import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  const resolutionId = formData.get("resolutionId") as string | null;
  const documentType = formData.get("documentType") as string | null;

  if (!file) {
    return NextResponse.json({ error: "File required" }, { status: 400 });
  }

  const documentId = crypto.randomUUID();
  const storagePath = `cases/${resolvedCaseId}/resolution/${documentId}/${file.name}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("case-evidence")
    .upload(storagePath, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError || !uploadData) {
    return NextResponse.json(
      { error: uploadError?.message ?? "Failed to upload document" },
      { status: 500 }
    );
  }

  const { data: document, error: documentError } = await supabase
    .from("case_resolution_documents")
    .insert({
      id: documentId,
      case_id: resolvedCaseId,
      resolution_id: resolutionId,
      uploaded_by: user.id,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_bucket: "case-evidence",
      storage_path: uploadData.path,
      metadata: documentType ? { documentType } : {},
    })
    .select("*")
    .single();

  if (documentError || !document) {
    await supabase.storage.from("case-evidence").remove([uploadData.path]);
    return NextResponse.json(
      { error: documentError?.message ?? "Failed to save document" },
      { status: 500 }
    );
  }

  const { error: eventError } = await supabase
    .from("case_resolution_events")
    .insert({
      case_id: resolvedCaseId,
      resolution_id: document.resolution_id,
      event_type: "document_uploaded",
      actor_id: user.id,
      metadata: {
        fileName: document.file_name,
        fileType: document.file_type,
        storagePath: document.storage_path,
        documentType,
      },
    });

  if (eventError) {
    return NextResponse.json(
      { error: eventError.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      document: {
        id: document.id as string,
        caseId: document.case_id as string,
        resolutionId: document.resolution_id as string | null,
        uploadedBy: document.uploaded_by as string | null,
        fileName: document.file_name as string,
        fileType: document.file_type as string | null,
        fileSize: document.file_size as number | null,
        storageBucket: document.storage_bucket as string,
        storagePath: document.storage_path as string,
        metadata: document.metadata as Record<string, unknown> | null,
        createdAt: document.created_at as string,
      },
    },
    { status: 201 }
  );
}
