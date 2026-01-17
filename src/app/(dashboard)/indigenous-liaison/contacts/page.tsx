"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib";

interface LiaisonContact {
  id: string;
  name: string;
  title: string;
  organization: string | null;
  community_id: string | null;
  email: string | null;
  phone: string | null;
  cell_phone: string | null;
  languages_spoken: string[];
  areas_of_expertise: string[];
  is_available_24_7: boolean;
  preferred_contact_method: string | null;
  notes: string | null;
  is_active: boolean;
  community?: {
    id: string;
    name: string;
    province: string;
  };
}

const CONTACT_METHOD_LABELS: Record<string, string> = {
  phone: "Phone",
  cell: "Cell Phone",
  email: "Email",
  in_person: "In Person",
};

const EXPERTISE_LABELS: Record<string, string> = {
  missing_persons: "Missing Persons",
  mmiwg: "MMIWG Cases",
  victim_services: "Victim Services",
  cultural_protocol: "Cultural Protocol",
  language_interpretation: "Language Interpretation",
  community_outreach: "Community Outreach",
  youth_services: "Youth Services",
  elder_services: "Elder Services",
  crisis_intervention: "Crisis Intervention",
  family_liaison: "Family Liaison",
};

const LANGUAGE_LABELS: Record<string, string> = {
  cree: "Cree",
  ojibwe: "Ojibwe",
  inuktitut: "Inuktitut",
  dene: "Dene",
  blackfoot: "Blackfoot",
  michif: "Michif",
  mohawk: "Mohawk",
  mikmaq: "Mi'kmaq",
  salish: "Salish",
  haida: "Haida",
  english: "English",
  french: "French",
  other: "Other",
};

export default function LiaisonContactsPage() {
  const [contacts, setContacts] = useState<LiaisonContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    expertise: "",
    language: "",
    available24_7: false,
    search: "",
  });

  useEffect(() => {
    async function fetchContacts() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters.expertise) params.set("expertise", filters.expertise);
        if (filters.language) params.set("language", filters.language);
        if (filters.available24_7) params.set("available24_7", "true");
        if (filters.search) params.set("search", filters.search);

        const res = await fetch(`/api/indigenous/liaisons?${params}`);
        if (res.status === 403) {
          setError("You do not have permission to view liaison contacts. This section is restricted to verified law enforcement personnel.");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setContacts(data.data || []);
        }
      } catch (err) {
        console.error("Error fetching contacts:", err);
        setError("Failed to load liaison contacts. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchContacts();
  }, [filters]);

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Indigenous Liaison Contacts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Community liaisons and cultural advisors for case support
          </p>
        </div>
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-8 text-center">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Indigenous Liaison Contacts</h1>
        <p className="mt-1 text-sm text-gray-500">
          Community liaisons and cultural advisors for case support
        </p>
      </div>

      {/* 24/7 Emergency Contacts Banner */}
      <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-red-900">24/7 Emergency Liaisons Available</h3>
            <p className="text-sm text-red-700">
              For urgent cases, contact liaisons marked with "24/7 Available"
            </p>
          </div>
          <button
            onClick={() => setFilters({ ...filters, available24_7: true })}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Show 24/7 Contacts
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search by name or organization..."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Expertise</label>
            <select
              value={filters.expertise}
              onChange={(e) => setFilters({ ...filters, expertise: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All Areas</option>
              {Object.entries(EXPERTISE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Language</label>
            <select
              value={filters.language}
              onChange={(e) => setFilters({ ...filters, language: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All Languages</option>
              {Object.entries(LANGUAGE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.available24_7}
                onChange={(e) => setFilters({ ...filters, available24_7: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-cyan-600"
              />
              <span className="text-sm text-gray-700">24/7 Available Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Contacts List */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : contacts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {contacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">No liaison contacts found matching your criteria.</p>
        </div>
      )}

      {/* Cultural Protocol Reminder */}
      <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6">
        <h3 className="font-semibold text-amber-900">Working with Community Liaisons</h3>
        <ul className="mt-2 space-y-1 text-sm text-amber-800">
          <li>- Always introduce yourself and your role clearly</li>
          <li>- Respect the liaison's guidance on cultural protocols</li>
          <li>- Allow adequate time for community consultation processes</li>
          <li>- Maintain confidentiality of community-sensitive information</li>
          <li>- Follow up appropriately and keep liaisons informed of case progress</li>
        </ul>
      </div>
    </div>
  );
}

function ContactCard({ contact }: { contact: LiaisonContact }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-100">
            <span className="text-lg font-bold text-cyan-700">
              {contact.name.split(" ").map((n) => n[0]).join("")}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">{contact.name}</h3>
              {contact.is_available_24_7 && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  24/7 Available
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">{contact.title}</p>
            {contact.organization && (
              <p className="text-sm text-gray-500">{contact.organization}</p>
            )}
            {contact.community && (
              <p className="text-xs text-gray-500">
                {contact.community.name}, {contact.community.province}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Languages */}
      {contact.languages_spoken && contact.languages_spoken.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-500">Languages</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {contact.languages_spoken.map((lang) => (
              <span
                key={lang}
                className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700"
              >
                {LANGUAGE_LABELS[lang] || lang}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expertise */}
      {contact.areas_of_expertise && contact.areas_of_expertise.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-500">Areas of Expertise</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {contact.areas_of_expertise.map((area) => (
              <span
                key={area}
                className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700"
              >
                {EXPERTISE_LABELS[area] || area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Contact Methods */}
      <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-100 pt-4">
        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            className="flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700"
          >
            <PhoneIcon className="h-4 w-4" />
            {contact.phone}
          </a>
        )}
        {contact.cell_phone && (
          <a
            href={`tel:${contact.cell_phone}`}
            className="flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700"
          >
            <CellPhoneIcon className="h-4 w-4" />
            {contact.cell_phone}
          </a>
        )}
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700"
          >
            <EmailIcon className="h-4 w-4" />
            Email
          </a>
        )}
      </div>

      {contact.preferred_contact_method && (
        <p className="mt-2 text-xs text-gray-500">
          Preferred: {CONTACT_METHOD_LABELS[contact.preferred_contact_method] || contact.preferred_contact_method}
        </p>
      )}

      {contact.notes && (
        <p className="mt-3 text-xs text-gray-500 italic">{contact.notes}</p>
      )}
    </div>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
    </svg>
  );
}

function CellPhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  );
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  );
}
