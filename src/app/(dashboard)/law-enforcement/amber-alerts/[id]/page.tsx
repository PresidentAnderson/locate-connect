// AMBER Alert Detail Page
// LC-FEAT-026: AMBER Alert Integration
// View and manage individual AMBER alert

import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { AlertDetailView } from "./AlertDetailView";

export default async function AmberAlertDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is law enforcement
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !["law_enforcement", "admin", "developer"].includes(profile.role)
  ) {
    redirect("/");
  }

  // Fetch alert details
  const { data: alert, error } = await supabase
    .from("amber_alert_requests")
    .select("*, cases(case_number, first_name, last_name, status)")
    .eq("id", params.id)
    .single();

  if (error || !alert) {
    notFound();
  }

  return <AlertDetailView alert={alert} userId={user.id} />;
}
