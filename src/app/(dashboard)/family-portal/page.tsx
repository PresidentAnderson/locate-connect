"use client";

import { useState, useEffect } from "react";

export const dynamic = "force-dynamic";

// Types
type FamilyMemberRole = "primary_reporter" | "family_member" | "extended_family" | "friend";
type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
type TaskPriority = "low" | "medium" | "high" | "urgent";

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  role: FamilyMemberRole;
  relationship: string;
  isOnline: boolean;
  lastActiveAt?: string;
  avatarUrl?: string;
}

interface CoordinationTask {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo?: string;
  dueDate?: string;
  category: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: string;
}

const ROLE_LABELS: Record<FamilyMemberRole, string> = {
  primary_reporter: "Primary Reporter",
  family_member: "Family Member",
  extended_family: "Extended Family",
  friend: "Friend",
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  urgent: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-gray-100 text-gray-800 border-gray-200",
};

const STATUS_STYLES: Record<TaskStatus, string> = {
  pending: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-600",
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

export default function FamilyPortalPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "chat" | "tasks" | "documents" | "timeline">("dashboard");
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [tasks, setTasks] = useState<CoordinationTask[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    // Load mock data
    setMembers([
      { id: "1", name: "Sarah Johnson", email: "sarah@example.com", role: "primary_reporter", relationship: "Mother", isOnline: true },
      { id: "2", name: "Michael Johnson", email: "michael@example.com", role: "family_member", relationship: "Father", isOnline: false, lastActiveAt: new Date(Date.now() - 3600000).toISOString() },
      { id: "3", name: "Emily Johnson", email: "emily@example.com", role: "family_member", relationship: "Sister", isOnline: true },
      { id: "4", name: "Robert Williams", email: "robert@example.com", role: "extended_family", relationship: "Uncle", isOnline: false, lastActiveAt: new Date(Date.now() - 86400000).toISOString() },
    ]);

    setTasks([
      { id: "1", title: "Distribute flyers downtown", priority: "high", status: "in_progress", assignedTo: "2", dueDate: new Date().toISOString(), category: "outreach" },
      { id: "2", title: "Contact local shelters", priority: "urgent", status: "pending", category: "outreach" },
      { id: "3", title: "Update social media posts", priority: "medium", status: "completed", assignedTo: "3", category: "media" },
      { id: "4", title: "Coordinate with volunteer group", priority: "high", status: "pending", dueDate: new Date(Date.now() + 86400000).toISOString(), category: "coordination" },
    ]);

    setMessages([
      { id: "1", senderId: "1", senderName: "Sarah Johnson", message: "The police just called with an update. They're expanding the search to the east side.", createdAt: new Date(Date.now() - 1800000).toISOString() },
      { id: "2", senderId: "3", senderName: "Emily Johnson", message: "I'll head over there after work. Can someone share the flyer files?", createdAt: new Date(Date.now() - 1200000).toISOString() },
      { id: "3", senderId: "2", senderName: "Michael Johnson", message: "Just uploaded them to the documents section.", createdAt: new Date(Date.now() - 600000).toISOString() },
    ]);

    setLoading(false);
  }, []);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      senderId: "current-user",
      senderName: "You",
      message: newMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages([...messages, msg]);
    setNewMessage("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Family Coordination Portal</h1>
        <p className="text-gray-600 mt-2">Coordinate search efforts and share information with family members</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "chat", label: "Chat" },
            { id: "tasks", label: "Tasks" },
            { id: "documents", label: "Documents" },
            { id: "timeline", label: "Timeline" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Members */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Family Members</h2>
              <button className="text-sm text-blue-600 hover:text-blue-800">+ Invite</button>
            </div>
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium">
                      {member.name.charAt(0)}
                    </div>
                    {member.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.relationship} · {ROLE_LABELS[member.role]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Urgent Tasks */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Active Tasks</h2>
              <button className="text-sm text-blue-600 hover:text-blue-800">View all</button>
            </div>
            <div className="space-y-3">
              {tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").slice(0, 4).map((task) => (
                <div key={task.id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <span className={`px-2 py-0.5 text-xs rounded border ${PRIORITY_STYLES[task.priority]}`}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 text-xs rounded ${STATUS_STYLES[task.status]}`}>
                      {task.status.replace("_", " ")}
                    </span>
                    {task.dueDate && (
                      <span className="text-xs text-gray-500">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Messages</h2>
              <button className="text-sm text-blue-600 hover:text-blue-800" onClick={() => setActiveTab("chat")}>
                Open chat
              </button>
            </div>
            <div className="space-y-3">
              {messages.slice(-3).map((msg) => (
                <div key={msg.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">{msg.senderName}</span>
                    <span className="text-xs text-gray-500">{formatTimeAgo(msg.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{msg.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <div className="bg-white rounded-lg border border-gray-200 h-[600px] flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.senderId === "current-user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-lg p-3 ${
                  msg.senderId === "current-user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                }`}>
                  {msg.senderId !== "current-user" && (
                    <p className="text-xs font-medium mb-1 opacity-75">{msg.senderName}</p>
                  )}
                  <p className="text-sm">{msg.message}</p>
                  <p className={`text-xs mt-1 ${msg.senderId === "current-user" ? "text-blue-200" : "text-gray-500"}`}>
                    {formatTimeAgo(msg.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === "tasks" && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Coordination Tasks</h2>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              + New Task
            </button>
          </div>
          <div className="divide-y divide-gray-200">
            {tasks.map((task) => (
              <div key={task.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{task.title}</p>
                    {task.description && <p className="text-sm text-gray-600 mt-1">{task.description}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`px-2 py-0.5 text-xs rounded border ${PRIORITY_STYLES[task.priority]}`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded ${STATUS_STYLES[task.status]}`}>
                        {task.status.replace("_", " ")}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">{task.category}</span>
                    </div>
                  </div>
                  {task.dueDate && (
                    <span className="text-sm text-gray-500">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === "documents" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Shared Documents</h2>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              + Upload
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Missing Person Flyer.pdf", type: "PDF", size: "2.4 MB", uploadedBy: "Sarah Johnson" },
              { name: "Recent Photos.zip", type: "ZIP", size: "15.8 MB", uploadedBy: "Emily Johnson" },
              { name: "Search Area Map.png", type: "Image", size: "1.2 MB", uploadedBy: "Michael Johnson" },
              { name: "Contact List.docx", type: "Document", size: "45 KB", uploadedBy: "Sarah Johnson" },
            ].map((doc, i) => (
              <div key={i} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center text-blue-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                    <p className="text-xs text-gray-500">{doc.type} · {doc.size}</p>
                    <p className="text-xs text-gray-400 mt-1">by {doc.uploadedBy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === "timeline" && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Collaborative Timeline</h2>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              + Add Entry
            </button>
          </div>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-6">
              {[
                { time: "2 hours ago", title: "Sighting Reported", description: "Possible sighting near downtown transit station", type: "sighting", author: "Sarah Johnson" },
                { time: "5 hours ago", title: "Flyers Distributed", description: "500 flyers distributed in east side neighborhoods", type: "activity", author: "Michael Johnson" },
                { time: "Yesterday", title: "Police Update", description: "Search area expanded to include river valley parks", type: "update", author: "Emily Johnson" },
                { time: "2 days ago", title: "Volunteer Meeting", description: "Coordinated with 20 volunteers for weekend search", type: "meeting", author: "Robert Williams" },
              ].map((entry, i) => (
                <div key={i} className="relative pl-10">
                  <div className="absolute left-2.5 w-3 h-3 bg-blue-600 rounded-full border-2 border-white" />
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{entry.title}</span>
                      <span className="text-xs text-gray-500">{entry.time}</span>
                    </div>
                    <p className="text-sm text-gray-600">{entry.description}</p>
                    <p className="text-xs text-gray-400 mt-2">Added by {entry.author}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
