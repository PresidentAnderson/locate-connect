"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: "api_issue", label: "API Issue" },
  { value: "feature_request", label: "Feature Request" },
  { value: "documentation", label: "Documentation" },
  { value: "billing", label: "Billing" },
  { value: "other", label: "Other" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"tickets" | "faq">("tickets");

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    try {
      const response = await fetch("/api/developer/support/tickets");
      const data = await response.json();
      if (data.success) {
        setTickets(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Developer Support</h1>
          <p className="mt-1 text-sm text-gray-500">
            Get help with the LocateConnect API
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          New Ticket
        </button>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <QuickLink
          href="/developers/docs"
          icon={<DocumentIcon className="h-5 w-5" />}
          title="API Documentation"
          description="Complete API reference guide"
        />
        <QuickLink
          href="https://status.locateconnect.ca"
          icon={<SignalIcon className="h-5 w-5" />}
          title="API Status"
          description="Check current system status"
          external
        />
        <QuickLink
          href="/developers/examples"
          icon={<CodeIcon className="h-5 w-5" />}
          title="Code Examples"
          description="Sample implementations"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("tickets")}
            className={cn(
              "border-b-2 py-4 px-1 text-sm font-medium",
              activeTab === "tickets"
                ? "border-cyan-600 text-cyan-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            )}
          >
            My Tickets
          </button>
          <button
            onClick={() => setActiveTab("faq")}
            className={cn(
              "border-b-2 py-4 px-1 text-sm font-medium",
              activeTab === "faq"
                ? "border-cyan-600 text-cyan-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            )}
          >
            FAQ
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "tickets" && (
        <div className="rounded-xl border border-gray-200 bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-600 border-t-transparent"></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <TicketIcon className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-sm font-medium text-gray-900">No support tickets</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create a ticket if you need help with the API
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
              >
                <PlusIcon className="h-4 w-4" />
                Create Ticket
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/developers/support/tickets/${ticket.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      ticket.status === "open" ? "bg-blue-100" :
                      ticket.status === "in_progress" ? "bg-yellow-100" :
                      ticket.status === "resolved" ? "bg-green-100" : "bg-gray-100"
                    )}>
                      <TicketIcon className={cn(
                        "h-5 w-5",
                        ticket.status === "open" ? "text-blue-600" :
                        ticket.status === "in_progress" ? "text-yellow-600" :
                        ticket.status === "resolved" ? "text-green-600" : "text-gray-500"
                      )} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{ticket.subject}</span>
                        <span className="text-xs text-gray-500">#{ticket.ticket_number}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          ticket.status === "open" ? "bg-blue-100 text-blue-700" :
                          ticket.status === "in_progress" ? "bg-yellow-100 text-yellow-700" :
                          ticket.status === "waiting_response" ? "bg-purple-100 text-purple-700" :
                          ticket.status === "resolved" ? "bg-green-100 text-green-700" :
                          "bg-gray-100 text-gray-700"
                        )}>
                          {ticket.status.replace("_", " ")}
                        </span>
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          ticket.priority === "urgent" ? "bg-red-100 text-red-700" :
                          ticket.priority === "high" ? "bg-orange-100 text-orange-700" :
                          "bg-gray-100 text-gray-700"
                        )}>
                          {ticket.priority}
                        </span>
                        <span className="text-xs text-gray-500">
                          {CATEGORIES.find(c => c.value === ticket.category)?.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      Updated {new Date(ticket.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "faq" && (
        <div className="space-y-4">
          <FAQItem
            question="How do I get started with the API?"
            answer="First, create an application in the Developer Portal. Then, generate an API key for your application. Use this key in the Authorization header for all API requests."
          />
          <FAQItem
            question="What are the rate limits?"
            answer="Public access allows 60 requests per minute and 10,000 per day. Partner access increases this to 120/min and 50,000/day. Law enforcement access has higher limits. Contact us to upgrade your access level."
          />
          <FAQItem
            question="How do I handle authentication errors?"
            answer="If you receive a 401 error, check that your API key is valid and properly formatted in the Authorization header. Keys should be prefixed with 'Bearer ' or sent via the X-API-Key header."
          />
          <FAQItem
            question="How do webhooks work?"
            answer="Webhooks allow you to receive real-time notifications when events occur. Configure a webhook endpoint in your application settings, select the events you want to receive, and we'll POST payloads to your URL when those events happen."
          />
          <FAQItem
            question="How can I upgrade to Partner or LE access?"
            answer="Partner access requires verification of your organization. Law Enforcement access is restricted to verified law enforcement agencies. Submit a verification request from your application settings."
          />
          <FAQItem
            question="Is there a sandbox environment?"
            answer="Yes, you can use the sandbox environment at api-sandbox.locateconnect.ca for testing. Sandbox data is simulated and reset periodically. Use your regular API keys with the sandbox base URL."
          />
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchTickets();
          }}
        />
      )}
    </div>
  );
}

function QuickLink({
  href,
  icon,
  title,
  description,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  external?: boolean;
}) {
  const Component = external ? "a" : Link;
  const props = external ? { target: "_blank", rel: "noopener noreferrer" } : {};

  return (
    <Component
      href={href}
      {...props}
      className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-cyan-300 hover:shadow-md transition-all"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <p className="mt-0.5 text-xs text-gray-500">{description}</p>
      </div>
    </Component>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <span className="text-sm font-medium text-gray-900">{question}</span>
        <ChevronIcon className={cn("h-5 w-5 text-gray-400 transition-transform", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <div className="border-t border-gray-100 px-6 py-4">
          <p className="text-sm text-gray-600">{answer}</p>
        </div>
      )}
    </div>
  );
}

function CreateTicketModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("api_issue");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/developer/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, description, category, priority }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message || "Failed to create ticket");
        return;
      }

      onCreated();
    } catch (err) {
      setError("Failed to create ticket");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Create Support Ticket</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
              Subject *
            </label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="Brief summary of the issue"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description *
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="Detailed description of the issue. Include error messages, API endpoints, and steps to reproduce if applicable."
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Icons
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function SignalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 0a3.75 3.75 0 0 1 0 5.304m-7.425 2.121a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  );
}

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
    </svg>
  );
}

function TicketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
