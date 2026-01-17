"use client";

/**
 * Emergency Contacts Quick-Dial Component
 * One-tap emergency contact access
 * LC-FEAT-031: Mobile App Companion
 */

import { useState, useEffect } from "react";

export interface EmergencyContact {
  id: string;
  name: string;
  number: string;
  type: "emergency" | "police" | "fbi" | "custom" | "tip_line";
  description?: string;
  available24x7?: boolean;
}

interface EmergencyContactsProps {
  contacts?: EmergencyContact[];
  showDefaultContacts?: boolean;
  caseId?: string;
  className?: string;
}

// Default emergency contacts
const DEFAULT_CONTACTS: EmergencyContact[] = [
  {
    id: "911",
    name: "Emergency Services",
    number: "911",
    type: "emergency",
    description: "For immediate emergencies",
    available24x7: true,
  },
  {
    id: "ncmec",
    name: "NCMEC Hotline",
    number: "1-800-843-5678",
    type: "tip_line",
    description: "National Center for Missing & Exploited Children",
    available24x7: true,
  },
  {
    id: "fbi-tips",
    name: "FBI Tips Line",
    number: "1-800-225-5324",
    type: "fbi",
    description: "Report tips to the FBI",
    available24x7: true,
  },
  {
    id: "canadian-police",
    name: "Canadian Police Non-Emergency",
    number: "1-888-310-1122",
    type: "police",
    description: "Non-emergency police line (varies by region)",
    available24x7: true,
  },
  {
    id: "mmiwg",
    name: "MMIWG Tip Line",
    number: "1-844-413-6649",
    type: "tip_line",
    description: "Missing & Murdered Indigenous Women and Girls",
    available24x7: true,
  },
];

export function EmergencyContacts({
  contacts = [],
  showDefaultContacts = true,
  caseId,
  className = "",
}: EmergencyContactsProps) {
  const [allContacts, setAllContacts] = useState<EmergencyContact[]>([]);
  const [recentCalls, setRecentCalls] = useState<string[]>([]);
  const [isDialing, setIsDialing] = useState<string | null>(null);

  // Combine default and custom contacts
  useEffect(() => {
    const combined = showDefaultContacts
      ? [...DEFAULT_CONTACTS, ...contacts]
      : contacts;

    // Remove duplicates based on number
    const unique = combined.filter(
      (contact, index, self) =>
        index === self.findIndex((c) => c.number === contact.number)
    );

    setAllContacts(unique);
  }, [contacts, showDefaultContacts]);

  // Load recent calls from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("emergency-recent-calls");
    if (stored) {
      setRecentCalls(JSON.parse(stored));
    }
  }, []);

  // Initiate phone call
  const initiateCall = (contact: EmergencyContact) => {
    setIsDialing(contact.id);

    // Track recent call
    const updatedRecent = [
      contact.id,
      ...recentCalls.filter((id) => id !== contact.id),
    ].slice(0, 3);
    setRecentCalls(updatedRecent);
    localStorage.setItem("emergency-recent-calls", JSON.stringify(updatedRecent));

    // Initiate the call
    window.location.href = `tel:${contact.number}`;

    // Reset dialing state after delay
    setTimeout(() => setIsDialing(null), 2000);
  };

  // Get contact type styling
  const getTypeStyles = (type: EmergencyContact["type"]) => {
    switch (type) {
      case "emergency":
        return {
          bg: "bg-red-500 hover:bg-red-600",
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          ),
        };
      case "police":
        return {
          bg: "bg-blue-600 hover:bg-blue-700",
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          ),
        };
      case "fbi":
        return {
          bg: "bg-slate-800 hover:bg-slate-900",
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          ),
        };
      case "tip_line":
        return {
          bg: "bg-amber-500 hover:bg-amber-600",
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          ),
        };
      default:
        return {
          bg: "bg-slate-600 hover:bg-slate-700",
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          ),
        };
    }
  };

  // Sort contacts - recent first, then emergency, then others
  const sortedContacts = [...allContacts].sort((a, b) => {
    const aRecent = recentCalls.indexOf(a.id);
    const bRecent = recentCalls.indexOf(b.id);

    // Recently called first
    if (aRecent !== -1 && bRecent === -1) return -1;
    if (bRecent !== -1 && aRecent === -1) return 1;
    if (aRecent !== -1 && bRecent !== -1) return aRecent - bRecent;

    // Emergency contacts first
    if (a.type === "emergency" && b.type !== "emergency") return -1;
    if (b.type === "emergency" && a.type !== "emergency") return 1;

    return 0;
  });

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="w-6 h-6 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          />
        </svg>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Emergency Contacts
        </h2>
      </div>

      {/* Case-specific tip line if available */}
      {caseId && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
            Have information about this case?
          </p>
          <a
            href={`/tip/submit?caseId=${caseId}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
              />
            </svg>
            Submit a Tip Online
          </a>
        </div>
      )}

      {/* Contact list */}
      <div className="space-y-3">
        {sortedContacts.map((contact) => {
          const styles = getTypeStyles(contact.type);
          const isRecent = recentCalls.includes(contact.id);

          return (
            <button
              key={contact.id}
              onClick={() => initiateCall(contact)}
              disabled={isDialing === contact.id}
              className={`w-full flex items-center gap-4 p-4 ${styles.bg} text-white rounded-xl transition-all active:scale-95 disabled:opacity-70`}
            >
              <div className="flex-shrink-0">{styles.icon}</div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{contact.name}</span>
                  {isRecent && (
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                      Recent
                    </span>
                  )}
                  {contact.available24x7 && (
                    <span className="text-xs bg-green-500/30 px-2 py-0.5 rounded-full">
                      24/7
                    </span>
                  )}
                </div>
                <div className="text-sm opacity-90">{contact.number}</div>
                {contact.description && (
                  <div className="text-xs opacity-75 mt-1">
                    {contact.description}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0">
                {isDialing === contact.id ? (
                  <svg
                    className="w-6 h-6 animate-pulse"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Important notice */}
      <div className="mt-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex items-start gap-2">
          <svg
            className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="text-xs text-amber-800 dark:text-amber-300">
            <p className="font-medium mb-1">Important</p>
            <p>
              Call 911 immediately if someone is in immediate danger. For
              non-emergency tips, you can submit information through the app.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
