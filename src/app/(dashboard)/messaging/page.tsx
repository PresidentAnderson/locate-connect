"use client";

import { useState, useEffect, useRef } from "react";

export const dynamic = "force-dynamic";

type ChannelType = "case_discussion" | "family_chat" | "le_internal" | "tip_line";
type MessageStatus = "sending" | "sent" | "delivered" | "read";
type ParticipantRole = "reporter" | "law_enforcement" | "case_worker" | "family_member" | "moderator";

interface Participant {
  id: string;
  name: string;
  role: ParticipantRole;
  isOnline: boolean;
  avatarUrl?: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: ParticipantRole;
  content: string;
  status: MessageStatus;
  isEncrypted: boolean;
  createdAt: string;
  replyTo?: { id: string; content: string; senderName: string };
}

interface Thread {
  id: string;
  channelType: ChannelType;
  title: string;
  caseNumber?: string;
  participants: Participant[];
  lastMessage?: { content: string; senderName: string; createdAt: string };
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
}

const CHANNEL_LABELS: Record<ChannelType, { name: string; icon: string; color: string }> = {
  case_discussion: { name: "Case Discussion", icon: "📋", color: "bg-blue-100 text-blue-800" },
  family_chat: { name: "Family Chat", icon: "👨‍👩‍👧", color: "bg-green-100 text-green-800" },
  le_internal: { name: "LE Internal", icon: "🛡️", color: "bg-purple-100 text-purple-800" },
  tip_line: { name: "Tip Line", icon: "💡", color: "bg-yellow-100 text-yellow-800" },
};

const ROLE_LABELS: Record<ParticipantRole, string> = {
  reporter: "Reporter",
  law_enforcement: "Law Enforcement",
  case_worker: "Case Worker",
  family_member: "Family Member",
  moderator: "Moderator",
};

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function MessagingPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterChannel, setFilterChannel] = useState<ChannelType | "all">("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load mock threads
    setThreads([
      {
        id: "1",
        channelType: "case_discussion",
        title: "Jane Doe Case - LC-2026-0042",
        caseNumber: "LC-2026-0042",
        participants: [
          { id: "1", name: "Sarah Johnson", role: "reporter", isOnline: true },
          { id: "2", name: "Det. Michael Brown", role: "law_enforcement", isOnline: true },
          { id: "3", name: "Officer Emily White", role: "law_enforcement", isOnline: false },
        ],
        lastMessage: { content: "We have a new lead to discuss", senderName: "Det. Michael Brown", createdAt: new Date(Date.now() - 300000).toISOString() },
        unreadCount: 3,
        isPinned: true,
        isArchived: false,
      },
      {
        id: "2",
        channelType: "family_chat",
        title: "Johnson Family",
        participants: [
          { id: "1", name: "Sarah Johnson", role: "family_member", isOnline: true },
          { id: "4", name: "Tom Johnson", role: "family_member", isOnline: false },
          { id: "5", name: "Lisa Johnson", role: "family_member", isOnline: true },
        ],
        lastMessage: { content: "I'll check the east side today", senderName: "Tom Johnson", createdAt: new Date(Date.now() - 1800000).toISOString() },
        unreadCount: 0,
        isPinned: false,
        isArchived: false,
      },
      {
        id: "3",
        channelType: "le_internal",
        title: "LC-2026-0042 Investigation",
        caseNumber: "LC-2026-0042",
        participants: [
          { id: "2", name: "Det. Michael Brown", role: "law_enforcement", isOnline: true },
          { id: "3", name: "Officer Emily White", role: "law_enforcement", isOnline: false },
          { id: "6", name: "Sgt. Robert Davis", role: "law_enforcement", isOnline: true },
        ],
        lastMessage: { content: "Verified the sighting from yesterday", senderName: "Officer Emily White", createdAt: new Date(Date.now() - 3600000).toISOString() },
        unreadCount: 1,
        isPinned: false,
        isArchived: false,
      },
      {
        id: "4",
        channelType: "tip_line",
        title: "Anonymous Tips - LC-2026-0042",
        caseNumber: "LC-2026-0042",
        participants: [
          { id: "7", name: "Moderator", role: "moderator", isOnline: true },
        ],
        lastMessage: { content: "New tip received: Possible sighting near mall", senderName: "Anonymous", createdAt: new Date(Date.now() - 7200000).toISOString() },
        unreadCount: 5,
        isPinned: false,
        isArchived: false,
      },
    ]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedThread) {
      // Load mock messages for selected thread
      setMessages([
        {
          id: "1",
          senderId: "2",
          senderName: "Det. Michael Brown",
          senderRole: "law_enforcement",
          content: "Good morning everyone. I wanted to update you on the investigation progress.",
          status: "read",
          isEncrypted: true,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: "2",
          senderId: "1",
          senderName: "Sarah Johnson",
          senderRole: "reporter",
          content: "Thank you for the update. Is there anything new we should know?",
          status: "read",
          isEncrypted: true,
          createdAt: new Date(Date.now() - 3000000).toISOString(),
        },
        {
          id: "3",
          senderId: "2",
          senderName: "Det. Michael Brown",
          senderRole: "law_enforcement",
          content: "We received a verified sighting yesterday near the downtown transit station. We're following up on it today.",
          status: "read",
          isEncrypted: true,
          createdAt: new Date(Date.now() - 2400000).toISOString(),
        },
        {
          id: "4",
          senderId: "3",
          senderName: "Officer Emily White",
          senderRole: "law_enforcement",
          content: "I'll be canvassing the area this afternoon with the K-9 unit.",
          status: "delivered",
          isEncrypted: true,
          createdAt: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: "5",
          senderId: "1",
          senderName: "Sarah Johnson",
          senderRole: "reporter",
          content: "That's great news! Please keep us updated. We've also distributed more flyers in that area.",
          status: "sent",
          isEncrypted: true,
          createdAt: new Date(Date.now() - 600000).toISOString(),
        },
      ]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [selectedThread]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedThread) return;

    const msg: Message = {
      id: Date.now().toString(),
      senderId: "current-user",
      senderName: "You",
      senderRole: "reporter",
      content: newMessage,
      status: "sending",
      isEncrypted: true,
      createdAt: new Date().toISOString(),
    };
    setMessages([...messages, msg]);
    setNewMessage("");

    // Simulate message send
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, status: "sent" as MessageStatus } : m))
      );
    }, 500);
  };

  const filteredThreads = threads.filter((t) => {
    if (filterChannel !== "all" && t.channelType !== filterChannel) return false;
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex">
      {/* Thread List */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 mb-3">Messages</h1>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-1 mt-3 overflow-x-auto">
            <button
              onClick={() => setFilterChannel("all")}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
                filterChannel === "all" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
              }`}
            >
              All
            </button>
            {(Object.keys(CHANNEL_LABELS) as ChannelType[]).map((ch) => (
              <button
                key={ch}
                onClick={() => setFilterChannel(ch)}
                className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
                  filterChannel === ch ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                }`}
              >
                {CHANNEL_LABELS[ch].icon}
              </button>
            ))}
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto">
          {filteredThreads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => setSelectedThread(thread)}
              className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                selectedThread?.id === thread.id ? "bg-blue-50" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${CHANNEL_LABELS[thread.channelType].color}`}>
                    {CHANNEL_LABELS[thread.channelType].icon}
                  </div>
                  {thread.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {thread.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 truncate text-sm">{thread.title}</p>
                    {thread.lastMessage && (
                      <span className="text-xs text-gray-500">{formatTime(thread.lastMessage.createdAt)}</span>
                    )}
                  </div>
                  {thread.lastMessage && (
                    <p className="text-sm text-gray-500 truncate mt-0.5">
                      <span className="font-medium">{thread.lastMessage.senderName}:</span> {thread.lastMessage.content}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 text-xs rounded ${CHANNEL_LABELS[thread.channelType].color}`}>
                      {CHANNEL_LABELS[thread.channelType].name}
                    </span>
                    {thread.isPinned && <span className="text-xs text-gray-400">📌</span>}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* New Conversation */}
        <div className="p-4 border-t border-gray-200">
          <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            + New Conversation
          </button>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedThread ? (
          <>
            {/* Thread Header */}
            <div className="px-6 py-4 bg-white border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedThread.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 text-xs rounded ${CHANNEL_LABELS[selectedThread.channelType].color}`}>
                      {CHANNEL_LABELS[selectedThread.channelType].name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {selectedThread.participants.length} participants
                    </span>
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      End-to-end encrypted
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === "current-user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[70%] ${msg.senderId === "current-user" ? "order-2" : ""}`}>
                    {msg.senderId !== "current-user" && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">{msg.senderName}</span>
                        <span className="text-xs text-gray-500">{ROLE_LABELS[msg.senderRole]}</span>
                      </div>
                    )}
                    <div
                      className={`rounded-lg p-3 ${
                        msg.senderId === "current-user"
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-gray-200"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    <div className={`flex items-center gap-2 mt-1 ${msg.senderId === "current-user" ? "justify-end" : ""}`}>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {msg.isEncrypted && <span className="text-xs text-gray-400">🔒</span>}
                      {msg.senderId === "current-user" && (
                        <span className="text-xs text-gray-400">
                          {msg.status === "sending" && "○"}
                          {msg.status === "sent" && "✓"}
                          {msg.status === "delivered" && "✓✓"}
                          {msg.status === "read" && <span className="text-blue-500">✓✓</span>}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center gap-3">
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type a message... (encrypted)"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
