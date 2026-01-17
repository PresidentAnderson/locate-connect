/**
 * Voice Memos API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { voiceMemoService, type CreateVoiceMemoInput, type VoiceMemoFilters } from "@/lib/services/voice-memo-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters: VoiceMemoFilters = {
      caseId: searchParams.get("caseId") || undefined,
      leadId: searchParams.get("leadId") || undefined,
      isEvidence: searchParams.get("isEvidence") === "true" ? true : undefined,
      tags: searchParams.get("tags")?.split(",") || undefined,
    };

    const memos = await voiceMemoService.listVoiceMemos(filters);

    return NextResponse.json({ memos });
  } catch (error) {
    console.error("[API] Error listing voice memos:", error);
    return NextResponse.json(
      { error: "Failed to list voice memos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = request.headers.get("x-user-id") || "system";

    const input: CreateVoiceMemoInput = {
      caseId: body.caseId,
      leadId: body.leadId,
      title: body.title,
      audioUrl: body.audioUrl,
      duration: body.duration,
      tags: body.tags,
      isEvidence: body.isEvidence,
    };

    const memo = await voiceMemoService.createVoiceMemo(input, userId);

    return NextResponse.json(memo, { status: 201 });
  } catch (error) {
    console.error("[API] Error creating voice memo:", error);
    return NextResponse.json(
      { error: "Failed to create voice memo" },
      { status: 500 }
    );
  }
}
