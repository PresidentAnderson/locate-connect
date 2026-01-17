"use client";

import { useState, useEffect, ReactNode } from "react";
import type {
  FamilySupportDashboard,
  FamilyLiaison,
  FamilyContact,
  ScheduledCheckIn,
  SupportResource,
  SupportGroup,
  FamilyMessage,
  LIAISON_TYPE_LABELS,
  RESOURCE_CATEGORY_LABELS,
  CHECK_IN_FREQUENCY_LABELS,
} from "@/types/family-liaison.types";

interface FamilyLiaisonDashboardProps {
  caseId: string;
  initialData?: FamilySupportDashboard;
}

export function FamilyLiaisonDashboard({
  caseId,
  initialData,
}: FamilyLiaisonDashboardProps) {
  const [data, setData] = useState<FamilySupportDashboard | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [activeTab, setActiveTab] = useState<"overview" | "contacts" | "resources" | "messages" | "documents">("overview");

  useEffect(() => {
    if (!initialData) {
      fetchData();
    }
  }, [caseId, initialData]);

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}/family-support`);
      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
      }
    } catch (error) {
      console.error("Failed to fetch family support data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        Unable to load family support data
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: <HomeIcon className="h-4 w-4" /> },
    { id: "contacts", label: "Family Contacts", icon: <UsersIcon className="h-4 w-4" /> },
    { id: "resources", label: "Resources", icon: <BookIcon className="h-4 w-4" /> },
    { id: "messages", label: "Messages", icon: <ChatIcon className="h-4 w-4" /> },
    { id: "documents", label: "Documents", icon: <DocumentIcon className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Family Support</h1>
          <p className="text-sm text-gray-500">
            Manage family liaison, resources, and communication
          </p>
        </div>
        <button className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          Schedule Check-in
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-cyan-600 text-cyan-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab data={data} />}
      {activeTab === "contacts" && <ContactsTab contacts={data.familyContacts} />}
      {activeTab === "resources" && (
        <ResourcesTab
          resources={data.recommendedResources}
          supportGroups={data.availableSupportGroups}
        />
      )}
      {activeTab === "messages" && <MessagesTab messages={data.recentMessages} caseId={caseId} />}
      {activeTab === "documents" && <DocumentsTab documents={data.recentDocuments} />}
    </div>
  );
}

function OverviewTab({ data }: { data: FamilySupportDashboard }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Primary Liaison */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Primary Liaison</h2>
          {data.primaryLiaison?.user ? (
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-cyan-100 flex items-center justify-center">
                {data.primaryLiaison.user.avatarUrl ? (
                  <img
                    src={data.primaryLiaison.user.avatarUrl}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-cyan-600">
                    {data.primaryLiaison.user.firstName[0]}
                    {data.primaryLiaison.user.lastName[0]}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  {data.primaryLiaison.user.firstName} {data.primaryLiaison.user.lastName}
                </h3>
                <p className="text-sm text-gray-500">
                  {data.primaryLiaison.user.title || "Family Liaison"}
                </p>
                <p className="text-sm text-gray-500">
                  {data.primaryLiaison.user.organization}
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <a
                    href={`mailto:${data.primaryLiaison.user.email}`}
                    className="text-sm text-cyan-600 hover:text-cyan-700"
                  >
                    {data.primaryLiaison.user.email}
                  </a>
                  {data.primaryLiaison.user.phone && (
                    <a
                      href={`tel:${data.primaryLiaison.user.phone}`}
                      className="text-sm text-cyan-600 hover:text-cyan-700"
                    >
                      {data.primaryLiaison.user.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <UsersIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p>No liaison assigned</p>
              <button className="mt-2 text-cyan-600 hover:text-cyan-700 text-sm">
                Assign Liaison
              </button>
            </div>
          )}
        </div>

        {/* Upcoming Check-ins */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Check-ins</h2>
          <div className="space-y-3">
            {data.upcomingCheckIns.slice(0, 5).map((checkIn) => (
              <div
                key={checkIn.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-cyan-100 flex items-center justify-center">
                    <CalendarIcon className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {new Date(checkIn.scheduledDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500 capitalize">
                      {checkIn.contactMethod} check-in
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    checkIn.status === "scheduled"
                      ? "bg-blue-100 text-blue-800"
                      : checkIn.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {checkIn.status}
                </span>
              </div>
            ))}
            {data.upcomingCheckIns.length === 0 && (
              <p className="text-gray-500 text-center py-4">No upcoming check-ins scheduled</p>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Family Contacts</span>
              <span className="font-medium">{data.familyContacts.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Unread Messages</span>
              <span className="font-medium text-red-600">
                {data.recentMessages.filter((m) => !m.isRead).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Peer Matches</span>
              <span className="font-medium">{data.peerMatches.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Progress Reports</span>
              <span className="font-medium">{data.progressReports.length}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Messages</h2>
          <div className="space-y-3">
            {data.recentMessages.slice(0, 3).map((message) => (
              <div key={message.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {message.subject || "No subject"}
                  </span>
                  {!message.isRead && (
                    <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  )}
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">{message.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(message.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactsTab({ contacts }: { contacts: FamilyContact[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Family Contacts</h2>
        <button className="px-3 py-1.5 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700">
          Add Contact
        </button>
      </div>
      <div className="divide-y divide-gray-200">
        {contacts.map((contact) => (
          <div key={contact.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">
                    {contact.firstName} {contact.lastName}
                  </h3>
                  {contact.isPrimaryContact && (
                    <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 text-xs rounded">
                      Primary
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{contact.relationship}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="hover:text-cyan-600">
                      {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="hover:text-cyan-600">
                      {contact.phone}
                    </a>
                  )}
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <EllipsisIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
        {contacts.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No family contacts added yet
          </div>
        )}
      </div>
    </div>
  );
}

function ResourcesTab({
  resources,
  supportGroups,
}: {
  resources: SupportResource[];
  supportGroups: SupportGroup[];
}) {
  const [showGroups, setShowGroups] = useState(false);

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowGroups(false)}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            !showGroups
              ? "bg-cyan-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Support Resources
        </button>
        <button
          onClick={() => setShowGroups(true)}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            showGroups
              ? "bg-cyan-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Support Groups
        </button>
      </div>

      {!showGroups ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded capitalize">
                    {resource.category.replace("_", " ")}
                  </span>
                  <h3 className="font-medium text-gray-900 mt-2">{resource.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{resource.organizationName}</p>
                </div>
                {resource.isFree && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                    Free
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                {resource.description}
              </p>
              <div className="mt-4 flex items-center gap-4 text-sm">
                {resource.phone && (
                  <a href={`tel:${resource.phone}`} className="text-cyan-600 hover:text-cyan-700">
                    {resource.phone}
                  </a>
                )}
                {resource.website && (
                  <a
                    href={resource.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-600 hover:text-cyan-700"
                  >
                    Website
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {supportGroups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-xs rounded capitalize">
                    {group.groupType}
                  </span>
                  <h3 className="font-medium text-gray-900 mt-2">{group.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{group.organizationName}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-3">{group.description}</p>
              <div className="mt-4 text-sm text-gray-500">
                <p>
                  {group.meetingFrequency} - {group.meetingDay} at {group.meetingTime}
                </p>
                <p>{group.location || group.virtualPlatform}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MessagesTab({
  messages,
  caseId,
}: {
  messages: FamilyMessage[];
  caseId: string;
}) {
  const [selectedMessage, setSelectedMessage] = useState<FamilyMessage | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Message List */}
      <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <button className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
            New Message
          </button>
        </div>
        <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
          {messages.map((message) => (
            <button
              key={message.id}
              onClick={() => setSelectedMessage(message)}
              className={`w-full p-4 text-left hover:bg-gray-50 ${
                selectedMessage?.id === message.id ? "bg-cyan-50" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 truncate">
                  {message.subject || "No subject"}
                </span>
                {!message.isRead && (
                  <span className="h-2 w-2 rounded-full bg-cyan-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-gray-500 truncate mt-1">{message.message}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(message.createdAt).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Message Detail */}
      <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
        {selectedMessage ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedMessage.subject || "No subject"}
              </h2>
              {selectedMessage.isUrgent && (
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                  Urgent
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {new Date(selectedMessage.createdAt).toLocaleString()}
            </p>
            <div className="prose prose-sm max-w-none">
              <p>{selectedMessage.message}</p>
            </div>
            {selectedMessage.attachments.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-2">Attachments</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedMessage.attachments.map((attachment, idx) => (
                    <a
                      key={idx}
                      href={attachment.fileUrl}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      <DocumentIcon className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{attachment.fileName}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <textarea
                placeholder="Type your reply..."
                className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                rows={4}
              />
              <div className="mt-3 flex justify-end">
                <button className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                  Send Reply
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a message to view
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentsTab({ documents }: { documents: FamilySupportDashboard["recentDocuments"] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
        <button className="px-3 py-1.5 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700">
          Generate Document
        </button>
      </div>
      <div className="divide-y divide-gray-200">
        {documents.map((doc) => (
          <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <DocumentIcon className="h-10 w-10 text-gray-400" />
              <div>
                <h3 className="font-medium text-gray-900">{doc.fileName}</h3>
                <p className="text-sm text-gray-500">{doc.templateName}</p>
                <p className="text-xs text-gray-400">
                  Generated {new Date(doc.generatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <a
              href={doc.fileUrl}
              className="px-3 py-1.5 text-cyan-600 hover:text-cyan-700 text-sm"
            >
              Download
            </a>
          </div>
        ))}
        {documents.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No documents generated yet
          </div>
        )}
      </div>
    </div>
  );
}

// Icons
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

function EllipsisIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
    </svg>
  );
}
