import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/family/faqs
 * List FAQs and guides (public access)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const language = searchParams.get("language") || "en";
    const featuredOnly = searchParams.get("featured") === "true";
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("family_faqs")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .contains("languages", [language])
      .order("display_order", { ascending: true });

    if (category) {
      query = query.eq("category", category);
    }

    if (featuredOnly) {
      query = query.eq("is_featured", true);
    }

    if (search) {
      query = query.or(`question.ilike.%${search}%,answer.ilike.%${search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching FAQs:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unique categories for filtering
    const { data: categories } = await supabase
      .from("family_faqs")
      .select("category")
      .eq("is_active", true);

    const uniqueCategories = [...new Set(categories?.map((c) => c.category))];

    return NextResponse.json({
      data,
      categories: uniqueCategories,
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
 * POST /api/family/faqs
 * Create a new FAQ (admin only)
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

    if (!profile || !["admin", "developer"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const { data, error } = await supabase
      .from("family_faqs")
      .insert({
        question: body.question,
        question_fr: body.questionFr,
        answer: body.answer,
        answer_fr: body.answerFr,
        category: body.category,
        subcategory: body.subcategory,
        display_order: body.displayOrder || 0,
        is_featured: body.isFeatured ?? false,
        languages: body.languages || ["en", "fr"],
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating FAQ:", error);
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
