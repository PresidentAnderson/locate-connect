"use client";

import { useEffect, useState } from "react";

type NotificationPriority = "low" | "normal" | "high" | "urgent";

interface Community {
  id: string;
  name: string;
  province: string;
}

interface Organization {
  id: string;
  name: string;
  acronym: string | null;
}

interface LiaisonContact {
  id: string;
  first_name: string;
  last_name: string;
}

interface CommunityNotification {
  id: string;
  case_id: string;
  notification_type: string;
  priority: NotificationPriority;
  subject: string | null;
  message: string | null;
  sent_via: string[];
  sent_at: string | null;
  acknowledged: boolean;
  community?: Community | null;
  organization?: Organization | null;
  liaison_contact?: LiaisonContact | null;
}

const NOTIFICATION_TYPES = [
  { value: "case_update", label: "Case Update" },
  { value: "search_update", label: "Search Update" },
  { value: "community_alert", label: "Community Alert" },
  { value: "liaison_request", label: "Liaison Request" },
  { value: "resource_request", label: "Resource Request" },
  { value: "public_notice", label: "Public Notice" },
  { value: "other", label: "Other" },
];

const PRIORITY_OPTIONS: NotificationPriority[] = ["low", "normal", "high", "urgent"];

const CHANNEL_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "phone", label: "Phone" },
  { value: "in_person", label: "In Person" },
];

export default function CommunityNotificationsPage() {
  const [notifications, setNotifications] = useState<CommunityNotification[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [liaisons, setLiaisons] = useState<LiaisonContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formState, setFormState] = useState({
    caseId: "",
    communityId: "",
    organizationId: "",
    liaisonContactId: "",
    notificationType: "case_update",
    priority: "normal" as NotificationPriority,
    subject: "",
    subjectFr: "",
    message: "",
    messageFr: "",
    messageIndigenous: "",
    sentVia: ["email"],
  });

  useEffect(() => {
    void fetchAll();
  }, []);

  async function fetchAll() {
    try {
      setLoading(true);
      setError(null);

      const [notificationsRes, communitiesRes, organizationsRes, liaisonsRes] =
        await Promise.all([
          fetch("/api/indigenous/notifications"),
          fetch("/api/indigenous/communities?limit=200"),
          fetch("/api/indigenous/organizations?limit=200"),
          fetch("/api/indigenous/liaisons?limit=200"),
        ]);

      if (notificationsRes.ok) {
        const data = await notificationsRes.json();
        setNotifications(data.data || []);
      }

      if (communitiesRes.ok) {
        const data = await communitiesRes.json();
        setCommunities(data.data || []);
      }

      if (organizationsRes.ok) {
        const data = await organizationsRes.json();
        setOrganizations(data.data || []);
      }

      if (liaisonsRes.ok) {
        const data = await liaisonsRes.json();
        setLiaisons(data.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  function updateForm<K extends keyof typeof formState>(
    key: K,
    value: (typeof formState)[K]
  ) {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/indigenous/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: formState.caseId,
          communityId: formState.communityId || null,
          organizationId: formState.organizationId || null,
          liaisonContactId: formState.liaisonContactId || null,
          notificationType: formState.notificationType,
          priority: formState.priority,
          subject: formState.subject || null,
          subjectFr: formState.subjectFr || null,
          message: formState.message || null,
          messageFr: formState.messageFr || null,
          messageIndigenous: formState.messageIndigenous || null,
          sentVia: formState.sentVia,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send notification");
      }

      setSuccess("Community notification sent.");
      setFormState({
        caseId: "",
        communityId: "",
        organizationId: "",
        liaisonContactId: "",
        notificationType: "case_update",
        priority: "normal",
        subject: "",
        subjectFr: "",
        message: "",
        messageFr: "",
        messageIndigenous: "",
        sentVia: ["email"],
      });
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send notification");
    } finally {
      setSaving(false);
    }
  }

  function toggleChannel(channel: string) {
    setFormState((prev) => {
      if (prev.sentVia.includes(channel)) {
        return { ...prev, sentVia: prev.sentVia.filter((c) => c !== channel) };
      }
      return { ...prev, sentVia: [...prev.sentVia, channel] };
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Community Outreach</h1>
        <p className="mt-1 text-sm text-gray-500">
          Send and track Indigenous community notifications and outreach updates.
        </p>
      </div>

      {(error || success) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {error || success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg border border-gray-200 p-5 space-y-4"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Send Notification</h2>
            <p className="text-sm text-gray-500">
              Use case ID and community contacts to coordinate outreach.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Case ID
            </label>
            <input
              type="text"
              value={formState.caseId}
              onChange={(e) => updateForm("caseId", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              placeholder="Case UUID"
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Community
              </label>
              <select
                value={formState.communityId}
                onChange={(e) => updateForm("communityId", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select community</option>
                {communities.map((community) => (
                  <option key={community.id} value={community.id}>
                    {community.name} ({community.province})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Organization
              </label>
              <select
                value={formState.organizationId}
                onChange={(e) => updateForm("organizationId", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select organization</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.acronym ? `${org.name} (${org.acronym})` : org.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Liaison Contact
            </label>
            <select
              value={formState.liaisonContactId}
              onChange={(e) => updateForm("liaisonContactId", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select liaison contact</option>
              {liaisons.map((liaison) => (
                <option key={liaison.id} value={liaison.id}>
                  {liaison.first_name} {liaison.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Notification Type
              </label>
              <select
                value={formState.notificationType}
                onChange={(e) => updateForm("notificationType", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {NOTIFICATION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Priority
              </label>
              <select
                value={formState.priority}
                onChange={(e) =>
                  updateForm("priority", e.target.value as NotificationPriority)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={formState.subject}
              onChange={(e) => updateForm("subject", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Notification subject"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Subject (French)
            </label>
            <input
              type="text"
              value={formState.subjectFr}
              onChange={(e) => updateForm("subjectFr", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Sujet en francais"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Message
            </label>
            <textarea
              value={formState.message}
              onChange={(e) => updateForm("message", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[100px]"
              placeholder="Message details"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Message (French)
            </label>
            <textarea
              value={formState.messageFr}
              onChange={(e) => updateForm("messageFr", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[90px]"
              placeholder="Message en francais"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Message (Indigenous Language)
            </label>
            <textarea
              value={formState.messageIndigenous}
              onChange={(e) => updateForm("messageIndigenous", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[90px]"
              placeholder="Optional community language message"
            />
          </div>

          <div>
            <p className="block text-xs font-medium text-gray-600 mb-2">
              Delivery Channels
            </p>
            <div className="flex flex-wrap gap-3">
              {CHANNEL_OPTIONS.map((channel) => (
                <label
                  key={channel.value}
                  className="inline-flex items-center gap-2 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={formState.sentVia.includes(channel.value)}
                    onChange={() => toggleChannel(channel.value)}
                    className="h-4 w-4 text-cyan-600 border-gray-300 rounded"
                  />
                  {channel.label}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || formState.sentVia.length === 0}
            className="w-full rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
          >
            {saving ? "Sending..." : "Send Notification"}
          </button>
        </form>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Notifications
            </h2>
            <button
              type="button"
              onClick={fetchAll}
              className="text-sm text-cyan-600 hover:text-cyan-700"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-sm text-gray-500">
              No community notifications found.
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {notification.subject || "Community Notification"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Case {notification.case_id}
                      </p>
                      <p className="text-xs text-gray-500">
                        {notification.community?.name ||
                          notification.organization?.name ||
                          "General outreach"}
                      </p>
                    </div>
                    <span className="text-xs uppercase tracking-wide text-gray-500">
                      {notification.priority}
                    </span>
                  </div>
                  {notification.message && (
                    <p className="text-sm text-gray-600 mt-3">
                      {notification.message}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-3">
                    <span>
                      {notification.notification_type.replace(/_/g, " ")}
                    </span>
                    <span>•</span>
                    <span>
                      {notification.sent_at
                        ? new Date(notification.sent_at).toLocaleString()
                        : "Draft"}
                    </span>
                    <span>•</span>
                    <span>
                      Channels: {notification.sent_via?.join(", ") || "N/A"}
                    </span>
                    {notification.acknowledged && (
                      <>
                        <span>•</span>
                        <span className="text-green-600">Acknowledged</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
