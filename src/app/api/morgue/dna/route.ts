import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/morgue/dna
 * List DNA sample coordination records
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "developer", "law_enforcement"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Forbidden - Requires law enforcement authorization" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("case_id");
    const matchId = searchParams.get("match_id");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("dna_sample_coordination")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (caseId) {
      query = query.eq("case_id", caseId);
    }

    if (matchId) {
      query = query.eq("match_id", matchId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching DNA coordination records:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: count ? offset + limit < count : false,
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/morgue/dna
 * Create DNA sample coordination request (if available)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "developer", "law_enforcement"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Forbidden - Requires law enforcement authorization" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.caseId || !body.sampleType || !body.sampleSource || body.consentObtained === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: caseId, sampleType, sampleSource, consentObtained" },
        { status: 400 }
      );
    }

    // Consent must be obtained for DNA collection
    if (!body.consentObtained) {
      return NextResponse.json(
        { error: "DNA sample collection requires documented consent" },
        { status: 400 }
      );
    }

    // Consent date must be provided when consent is obtained
    if (body.consentObtained && !body.consentDate) {
      return NextResponse.json(
        { error: "Consent date is required when consent is obtained" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("dna_sample_coordination")
      .insert({
        case_id: body.caseId,
        match_id: body.matchId,
        sample_type: body.sampleType,
        sample_source: body.sampleSource,
        family_member_id: body.familyMemberId,
        family_relationship: body.familyRelationship,
        lab_name: body.labName,
        lab_case_number: body.labCaseNumber,
        submitted_date: body.submittedDate,
        expected_results_date: body.expectedResultsDate,
        status: body.status || "not_collected",
        priority: body.priority || "routine",
        consent_obtained: body.consentObtained,
        consent_date: body.consentDate,
        consent_document_url: body.consentDocumentUrl,
        collected_by: body.collectedBy,
        collected_date: body.collectedDate,
        chain_of_custody_log: body.chainOfCustodyLog || [],
        notes: body.notes,
        coordinated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating DNA coordination record:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the DNA coordination request
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "create_dna_coordination",
      resource: "dna_sample_coordination",
      resource_id: data.id,
      details: {
        case_id: body.caseId,
        match_id: body.matchId,
        sample_type: body.sampleType,
        priority: body.priority || "routine",
      },
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/morgue/dna
 * Update DNA coordination status and results
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "developer", "law_enforcement"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Forbidden - Requires law enforcement authorization" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { coordinationId, ...updates } = body;

    if (!coordinationId) {
      return NextResponse.json(
        { error: "Missing required field: coordinationId" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (updates.status) updateData.status = updates.status;
    if (updates.labName) updateData.lab_name = updates.labName;
    if (updates.labCaseNumber) updateData.lab_case_number = updates.labCaseNumber;
    if (updates.submittedDate) updateData.submitted_date = updates.submittedDate;
    if (updates.expectedResultsDate) updateData.expected_results_date = updates.expectedResultsDate;
    if (updates.resultsReceivedDate) updateData.results_received_date = updates.resultsReceivedDate;
    if (updates.resultsAvailable !== undefined) updateData.results_available = updates.resultsAvailable;
    if (updates.matchFound !== undefined) updateData.match_found = updates.matchFound;
    if (updates.matchConfidence !== undefined) updateData.match_confidence_percentage = updates.matchConfidence;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.chainOfCustodyEntry) {
      // Append to chain of custody log
      const { data: current } = await supabase
        .from("dna_sample_coordination")
        .select("chain_of_custody_log")
        .eq("id", coordinationId)
        .single();
      
      if (current) {
        const log = Array.isArray(current.chain_of_custody_log) ? current.chain_of_custody_log : [];
        log.push({
          ...updates.chainOfCustodyEntry,
          timestamp: new Date().toISOString(),
        });
        updateData.chain_of_custody_log = log;
      }
    }

    const { data, error } = await supabase
      .from("dna_sample_coordination")
      .update(updateData)
      .eq("id", coordinationId)
      .select()
      .single();

    if (error) {
      console.error("Error updating DNA coordination:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If DNA match found, update the associated match record
    if (updates.matchFound && data.match_id) {
      await supabase
        .from("morgue_registry_matches")
        .update({
          dna_comparison_status: data.status,
          dna_comparison_result: "match",
          dna_comparison_notes: `DNA match confirmed with ${updates.matchConfidence}% confidence`,
        })
        .eq("id", data.match_id);
    }

    // Log the update
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "update_dna_coordination",
      resource: "dna_sample_coordination",
      resource_id: coordinationId,
      details: { updates: updateData },
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
