"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "@/hooks/useTranslations";

interface SupportResource {
  id: string;
  name: string;
  name_fr?: string;
  category: string;
  description: string;
  organization_name?: string;
  phone?: string;
  toll_free_phone?: string;
  website?: string;
  is_free: boolean;
  is_available_24_7: boolean;
}

interface SupportGroup {
  id: string;
  name: string;
  description?: string;
  group_type: string;
  organization_name?: string;
  meeting_frequency?: string;
  meeting_day?: string;
  meeting_time?: string;
  location?: string;
  virtual_platform?: string;
  is_free: boolean;
}

interface FAQ {
  id: string;
  question: string;
  question_fr?: string;
  answer: string;
  answer_fr?: string;
  category: string;
  is_featured: boolean;
}

export default function FamilySupportPage() {
  const t = useTranslations("common");
  const [resources, setResources] = useState<SupportResource[]>([]);
  const [supportGroups, setSupportGroups] = useState<SupportGroup[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "resources" | "groups" | "faqs">("overview");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resourcesRes, groupsRes, faqsRes] = await Promise.all([
        fetch("/api/family/resources?limit=20"),
        fetch("/api/family/support-groups?limit=10"),
        fetch("/api/family/faqs?featured=true&limit=10"),
      ]);

      if (resourcesRes.ok) {
        const data = await resourcesRes.json();
        setResources(data.data || []);
      }

      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setSupportGroups(data.data || []);
      }

      if (faqsRes.ok) {
        const data = await faqsRes.json();
        setFaqs(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch family support data:", error);
    } finally {
      setLoading(false);
    }
  };

  const categoryLabels: Record<string, string> = {
    mental_health: "Mental Health",
    financial: "Financial Assistance",
    legal: "Legal Aid",
    media: "Media & Communication",
    peer_support: "Peer Support",
    grief: "Grief Counseling",
    practical: "Practical Support",
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: <HomeIcon className="h-4 w-4" /> },
    { id: "resources", label: "Resources", icon: <BookIcon className="h-4 w-4" /> },
    { id: "groups", label: "Support Groups", icon: <UsersIcon className="h-4 w-4" /> },
    { id: "faqs", label: "FAQs & Guides", icon: <QuestionIcon className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Family Support Resources</h1>
          <p className="text-sm text-gray-500">
            Comprehensive support for families of missing persons
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="rounded-lg border-gray-300 text-sm"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
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
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Links */}
          <div className="lg:col-span-2 space-y-6">
            {/* Emergency Resources */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-red-800 flex items-center gap-2">
                <PhoneIcon className="h-5 w-5" />
                Emergency & Crisis Lines
              </h2>
              <p className="text-sm text-red-700 mt-2">Available 24/7 for immediate support</p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {resources
                  .filter((r) => r.is_available_24_7 && r.toll_free_phone)
                  .slice(0, 4)
                  .map((resource) => (
                    <div key={resource.id} className="bg-white rounded-lg p-4">
                      <h3 className="font-medium text-gray-900">{resource.name}</h3>
                      <a
                        href={`tel:${resource.toll_free_phone}`}
                        className="text-lg font-bold text-red-600 hover:text-red-700"
                      >
                        {resource.toll_free_phone}
                      </a>
                    </div>
                  ))}
              </div>
            </div>

            {/* Featured Resources */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Featured Resources</h2>
                <button
                  onClick={() => setActiveTab("resources")}
                  className="text-sm text-cyan-600 hover:text-cyan-700"
                >
                  View All
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resources.slice(0, 4).map((resource) => (
                  <div key={resource.id} className="border border-gray-200 rounded-lg p-4 hover:border-cyan-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded capitalize">
                          {categoryLabels[resource.category] || resource.category}
                        </span>
                        <h3 className="font-medium text-gray-900 mt-2">{resource.name}</h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{resource.description}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-sm">
                      {resource.toll_free_phone && (
                        <a href={`tel:${resource.toll_free_phone}`} className="text-cyan-600 hover:text-cyan-700">
                          {resource.toll_free_phone}
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
            </div>

            {/* Featured FAQs */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Common Questions</h2>
                <button
                  onClick={() => setActiveTab("faqs")}
                  className="text-sm text-cyan-600 hover:text-cyan-700"
                >
                  View All
                </button>
              </div>
              <div className="space-y-4">
                {faqs.slice(0, 3).map((faq) => (
                  <div key={faq.id} className="border-b border-gray-100 pb-4 last:border-0">
                    <h3 className="font-medium text-gray-900">{faq.question}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Support Groups */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Support Groups</h2>
                <button
                  onClick={() => setActiveTab("groups")}
                  className="text-sm text-cyan-600 hover:text-cyan-700"
                >
                  View All
                </button>
              </div>
              <div className="space-y-3">
                {supportGroups.slice(0, 3).map((group) => (
                  <div key={group.id} className="p-3 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900">{group.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{group.group_type}</p>
                    {group.meeting_frequency && (
                      <p className="text-xs text-gray-400 mt-1">{group.meeting_frequency}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-cyan-50 rounded-lg border border-cyan-200 p-6">
              <h2 className="text-lg font-semibold text-cyan-800">Need Help?</h2>
              <p className="text-sm text-cyan-700 mt-2">
                Our family liaison team is here to support you through this difficult time.
              </p>
              <div className="mt-4 space-y-3">
                <Link
                  href="/family-support/request-liaison"
                  className="block w-full px-4 py-2 bg-cyan-600 text-white text-center rounded-lg hover:bg-cyan-700 transition-colors"
                >
                  Request Family Liaison
                </Link>
                <Link
                  href="/family-support/peer-support"
                  className="block w-full px-4 py-2 bg-white text-cyan-600 text-center rounded-lg border border-cyan-600 hover:bg-cyan-50 transition-colors"
                >
                  Connect with Peer Support
                </Link>
              </div>
            </div>

            {/* Resource Categories */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Browse by Category</h2>
              <div className="space-y-2">
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedCategory(key);
                      setActiveTab("resources");
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "resources" && (
        <ResourcesSection
          resources={resources}
          categoryLabels={categoryLabels}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
      )}

      {activeTab === "groups" && (
        <SupportGroupsSection supportGroups={supportGroups} />
      )}

      {activeTab === "faqs" && (
        <FAQsSection faqs={faqs} />
      )}
    </div>
  );
}

function ResourcesSection({
  resources,
  categoryLabels,
  selectedCategory,
  setSelectedCategory,
}: {
  resources: SupportResource[];
  categoryLabels: Record<string, string>;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}) {
  const filteredResources = selectedCategory
    ? resources.filter((r) => r.category === selectedCategory)
    : resources;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory("")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            !selectedCategory
              ? "bg-cyan-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        {Object.entries(categoryLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              selectedCategory === key
                ? "bg-cyan-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map((resource) => (
          <div
            key={resource.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded capitalize">
                {categoryLabels[resource.category] || resource.category}
              </span>
              <div className="flex items-center gap-2">
                {resource.is_free && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">Free</span>
                )}
                {resource.is_available_24_7 && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">24/7</span>
                )}
              </div>
            </div>
            <h3 className="font-medium text-gray-900 mt-3">{resource.name}</h3>
            {resource.organization_name && (
              <p className="text-sm text-gray-500">{resource.organization_name}</p>
            )}
            <p className="text-sm text-gray-600 mt-2 line-clamp-3">{resource.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              {resource.toll_free_phone && (
                <a
                  href={`tel:${resource.toll_free_phone}`}
                  className="text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                >
                  <PhoneIcon className="h-4 w-4" />
                  {resource.toll_free_phone}
                </a>
              )}
              {resource.phone && !resource.toll_free_phone && (
                <a
                  href={`tel:${resource.phone}`}
                  className="text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                >
                  <PhoneIcon className="h-4 w-4" />
                  {resource.phone}
                </a>
              )}
              {resource.website && (
                <a
                  href={resource.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                >
                  <GlobeIcon className="h-4 w-4" />
                  Website
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredResources.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No resources found for this category.
        </div>
      )}
    </div>
  );
}

function SupportGroupsSection({ supportGroups }: { supportGroups: SupportGroup[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {supportGroups.map((group) => (
        <div
          key={group.id}
          className="bg-white rounded-lg border border-gray-200 p-6"
        >
          <div className="flex items-start justify-between">
            <span className={`px-2 py-0.5 text-xs rounded capitalize ${
              group.group_type === "virtual"
                ? "bg-purple-100 text-purple-800"
                : group.group_type === "hybrid"
                ? "bg-blue-100 text-blue-800"
                : "bg-green-100 text-green-800"
            }`}>
              {group.group_type}
            </span>
            {group.is_free && (
              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">Free</span>
            )}
          </div>
          <h3 className="font-medium text-gray-900 mt-3 text-lg">{group.name}</h3>
          {group.organization_name && (
            <p className="text-sm text-gray-500">{group.organization_name}</p>
          )}
          {group.description && (
            <p className="text-sm text-gray-600 mt-2">{group.description}</p>
          )}
          <div className="mt-4 space-y-2 text-sm text-gray-600">
            {group.meeting_frequency && (
              <p className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
                {group.meeting_frequency}
                {group.meeting_day && ` - ${group.meeting_day}`}
                {group.meeting_time && ` at ${group.meeting_time}`}
              </p>
            )}
            {group.location && (
              <p className="flex items-center gap-2">
                <MapPinIcon className="h-4 w-4 text-gray-400" />
                {group.location}
              </p>
            )}
            {group.virtual_platform && (
              <p className="flex items-center gap-2">
                <VideoIcon className="h-4 w-4 text-gray-400" />
                {group.virtual_platform}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function FAQsSection({ faqs }: { faqs: FAQ[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group FAQs by category
  const groupedFaqs = faqs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = [];
    }
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);

  return (
    <div className="space-y-8">
      {Object.entries(groupedFaqs).map(([category, categoryFaqs]) => (
        <div key={category}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{category}</h2>
          <div className="space-y-3">
            {categoryFaqs.map((faq) => (
              <div
                key={faq.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-900">{faq.question}</span>
                  <ChevronIcon
                    className={`h-5 w-5 text-gray-400 transition-transform ${
                      expandedId === faq.id ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {expandedId === faq.id && (
                  <div className="px-6 pb-4 text-gray-600 whitespace-pre-line">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
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

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  );
}

function QuestionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
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

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
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
