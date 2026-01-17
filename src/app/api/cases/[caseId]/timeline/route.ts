/**
 * Case Timeline API (Issue #89)
 * Aggregates timeline events from multiple sources
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface TimelineEvent {
  id: string;
  type: "status_change" | "priority_change" | "update" | "tip" | "lead" | "evidence" | "assignment" | "case_created";
  title: string;
  description?: string;
  timestamp: string;
  author?: string;
  metadata?: Record<string, unknown>;
}

interface RouteContext {
  params: Promise<{ caseId: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { caseId } = await context.params;
    const supabase = await createClient();

    // Verify user has access to this case
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("id, created_at, status, priority_level, first_name, last_name")
      .eq("id", caseId)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const events: TimelineEvent[] = [];

    // Add case creation event
    events.push({
      id: `case-created-${caseData.id}`,
      type: "case_created",
      title: `Case opened for ${caseData.first_name} ${caseData.last_name}`,
      description: `Initial status: ${(caseData.status as string).replace(/_/g, " ")}`,
      timestamp: caseData.created_at as string,
    });

    // Fetch case updates
    const { data: updates } = await supabase
      .from("case_updates")
      .select(`
        id,
        update_type,
        title,
        content,
        old_status,
        new_status,
        old_priority,
        new_priority,
        created_at,
        author:profiles!author_id(full_name)
      `)
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    if (updates) {
      for (const update of updates) {
        const authorRecord = update.author as unknown as { full_name: string } | null;
        const authorName = authorRecord?.full_name || "Unknown";

        if (update.old_status && update.new_status && update.old_status !== update.new_status) {
          events.push({
            id: `status-${update.id}`,
            type: "status_change",
            title: `Status changed from ${(update.old_status as string).replace(/_/g, " ")} to ${(update.new_status as string).replace(/_/g, " ")}`,
            description: update.content || undefined,
            timestamp: update.created_at as string,
            author: authorName,
          });
        } else if (update.old_priority && update.new_priority && update.old_priority !== update.new_priority) {
          events.push({
            id: `priority-${update.id}`,
            type: "priority_change",
            title: `Priority changed from ${(update.old_priority as string).replace(/_/g, " ")} to ${(update.new_priority as string).replace(/_/g, " ")}`,
            description: update.content || undefined,
            timestamp: update.created_at as string,
            author: authorName,
          });
        } else {
          events.push({
            id: `update-${update.id}`,
            type: "update",
            title: update.title || "Case update",
            description: update.content || undefined,
            timestamp: update.created_at as string,
            author: authorName,
          });
        }
      }
    }

    // Fetch tips
    const { data: tips } = await supabase
      .from("tips")
      .select("id, subject, status, created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    if (tips) {
      for (const tip of tips) {
        events.push({
          id: `tip-${tip.id}`,
          type: "tip",
          title: tip.subject || "Anonymous tip received",
          description: `Status: ${(tip.status as string).replace(/_/g, " ")}`,
          timestamp: tip.created_at as string,
        });
      }
    }

    // Fetch leads
    const { data: leads } = await supabase
      .from("leads")
      .select(`
        id,
        title,
        source,
        status,
        created_at,
        assigned_to:profiles!assigned_to(full_name)
      `)
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    if (leads) {
      for (const lead of leads) {
        const assigneeRecord = lead.assigned_to as unknown as { full_name: string } | null;
        const assigneeName = assigneeRecord?.full_name;

        events.push({
          id: `lead-${lead.id}`,
          type: "lead",
          title: lead.title || "New lead added",
          description: `Source: ${lead.source || "Unknown"}, Status: ${(lead.status as string).replace(/_/g, " ")}`,
          timestamp: lead.created_at as string,
          author: assigneeName || undefined,
        });
      }
    }

    // Fetch case assignments
    const { data: assignments } = await supabase
      .from("case_assignments")
      .select(`
        id,
        role,
        created_at,
        user:profiles!user_id(full_name),
        assigner:profiles!assigned_by(full_name)
      `)
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    if (assignments) {
      for (const assignment of assignments) {
        const userRecord = assignment.user as unknown as { full_name: string } | null;
        const assignerRecord = assignment.assigner as unknown as { full_name: string } | null;

        events.push({
          id: `assignment-${assignment.id}`,
          type: "assignment",
          title: `${userRecord?.full_name || "User"} assigned as ${assignment.role || "team member"}`,
          timestamp: assignment.created_at as string,
          author: assignerRecord?.full_name || undefined,
        });
      }
    }

    // Fetch case attachments/evidence
    const { data: attachments } = await supabase
      .from("case_attachments")
      .select(`
        id,
        file_name,
        file_type,
        created_at,
        uploaded_by:profiles!uploaded_by(full_name)
      `)
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    if (attachments) {
      for (const attachment of attachments) {
        const uploaderRecord = attachment.uploaded_by as unknown as { full_name: string } | null;

        events.push({
          id: `evidence-${attachment.id}`,
          type: "evidence",
          title: `Evidence uploaded: ${attachment.file_name}`,
          description: `Type: ${attachment.file_type}`,
          timestamp: attachment.created_at as string,
          author: uploaderRecord?.full_name || undefined,
        });
      }
    }

    // Sort all events by timestamp (newest first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      events,
      total: events.length,
    });
  } catch (error) {
    console.error("Error fetching case timeline:", error);
    return NextResponse.json(
      { error: "Failed to fetch timeline" },
      { status: 500 }
    );
  }
}
