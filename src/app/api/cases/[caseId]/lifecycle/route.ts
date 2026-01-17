import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  canTransitionCaseLifecycle,
  type CaseLifecycleStatus,
} from "@/lib/case-lifecycle";

interface RouteParams {
  params: Promise<{ caseId: string }>;
}

interface LifecyclePayload {
  status?: CaseLifecycleStatus;
}

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveCaseId(
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

async function requireLawEnforcement(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return data?.role === "law_enforcement" || data?.role === "admin" || data?.role === "developer";
}

export async function GET(request: Request, { params }: RouteParams) {
  const { caseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await requireLawEnforcement(supabase, user.id);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolvedCaseId = await resolveCaseId(supabase, caseId);
  if (!resolvedCaseId) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("cases")
    .select("id, case_number, lifecycle_status")
    .eq("id", resolvedCaseId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to fetch case" }, { status: 500 });
  }

  return NextResponse.json({
    caseId: data.id,
    caseNumber: data.case_number,
    lifecycleStatus: data.lifecycle_status,
  });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { caseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await requireLawEnforcement(supabase, user.id);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as LifecyclePayload;
  if (!body.status) {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  const resolvedCaseId = await resolveCaseId(supabase, caseId);
  if (!resolvedCaseId) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const { data: existing, error: existingError } = await supabase
    .from("cases")
    .select("lifecycle_status")
    .eq("id", resolvedCaseId)
    .single();

  if (existingError || !existing) {
    return NextResponse.json({ error: "Failed to fetch case" }, { status: 500 });
  }

  const currentStatus = existing.lifecycle_status as CaseLifecycleStatus;
  if (!canTransitionCaseLifecycle(currentStatus, body.status)) {
    return NextResponse.json(
      { error: `Invalid lifecycle transition from ${currentStatus} to ${body.status}` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("cases")
    .update({ lifecycle_status: body.status })
    .eq("id", resolvedCaseId)
    .select("id, case_number, lifecycle_status")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Failed to update case" }, { status: 500 });
  }

  return NextResponse.json({
    caseId: data.id,
    caseNumber: data.case_number,
    lifecycleStatus: data.lifecycle_status,
  });
}
