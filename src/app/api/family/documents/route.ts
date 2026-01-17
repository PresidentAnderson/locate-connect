import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/family/documents
 * List document templates or generated documents
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");
    const templateType = searchParams.get("type");
    const templatesOnly = searchParams.get("templates") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // If fetching templates, public access
    if (templatesOnly) {
      let query = supabase
        .from("document_templates")
        .select("*", { count: "exact" })
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });

      if (templateType) {
        query = query.eq("template_type", templateType);
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching templates:", error);
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
    }

    // For generated documents, require authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!caseId) {
      return NextResponse.json({ error: "Case ID is required for generated documents" }, { status: 400 });
    }

    // Verify access to case
    const { data: caseData } = await supabase
      .from("cases")
      .select("reporter_id")
      .eq("id", caseId)
      .single();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isOwner = caseData?.reporter_id === user.id;
    const isLE = profile && ["law_enforcement", "admin", "developer"].includes(profile.role);

    if (!isOwner && !isLE) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let query = supabase
      .from("generated_documents")
      .select("*", { count: "exact" })
      .eq("case_id", caseId)
      .order("generated_at", { ascending: false });

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching documents:", error);
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
 * POST /api/family/documents
 * Generate a document from a template
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

    const body = await request.json();

    // Verify access to case
    const { data: caseData } = await supabase
      .from("cases")
      .select("reporter_id")
      .eq("id", body.caseId)
      .single();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isOwner = caseData?.reporter_id === user.id;
    const isLE = profile && ["law_enforcement", "admin", "developer"].includes(profile.role);

    if (!isOwner && !isLE) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get template
    const { data: template } = await supabase
      .from("document_templates")
      .select("*")
      .eq("id", body.templateId)
      .single();

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Generate document (in production, this would actually render the template)
    // For now, just save the record
    const { data, error } = await supabase
      .from("generated_documents")
      .insert({
        case_id: body.caseId,
        template_id: body.templateId,
        template_name: template.name,
        file_name: body.fileName || `${template.name}_${new Date().toISOString().split("T")[0]}.${template.file_format}`,
        file_url: body.fileUrl, // In production, would be generated
        placeholder_values: body.placeholderValues || {},
        generated_by: user.id,
        notes: body.notes,
      })
      .select()
      .single();

    if (error) {
      console.error("Error generating document:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
