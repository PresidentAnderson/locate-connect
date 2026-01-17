"use client";

/**
 * Mental Health Resources Page (Issue #93)
 * Comprehensive mental health support for families of missing persons
 */

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { cn } from "@/lib";

export const dynamic = "force-dynamic";

interface SupportResource {
  id: string;
  name: string;
  name_fr?: string;
  description: string;
  description_fr?: string;
  category: string;
  organization?: string;
  toll_free_phone?: string | null;
  phone?: string | null;
  website?: string | null;
  languages: string[];
  is_available_24_7: boolean;
}

interface SupportGroup {
  id: string;
  name: string;
  description: string;
  meeting_format: string;
  category: string;
  organizer?: string;
  frequency?: string;
  contact_phone?: string;
  contact_email?: string;
  is_free: boolean;
}

type TabId = "crisis" | "services" | "groups" | "self-help";

function MentalHealthContent() {
  const [activeTab, setActiveTab] = useState<TabId>("crisis");
  const [resources, setResources] = useState<SupportResource[]>([]);
  const [groups, setGroups] = useState<SupportGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resourcesRes, groupsRes] = await Promise.all([
          fetch("/api/family/resources"),
          fetch("/api/family/support-groups"),
        ]);

        if (resourcesRes.ok) {
          const data = await resourcesRes.json();
          setResources(data.data ?? []);
        }

        if (groupsRes.ok) {
          const data = await groupsRes.json();
          setGroups(data.data ?? []);
        }
      } catch (error) {
        console.error("Error fetching mental health resources:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  const mentalHealthResources = useMemo(
    () => resources.filter((r) => r.category === "mental_health"),
    [resources]
  );

  const griefResources = useMemo(
    () => resources.filter((r) => r.category === "grief"),
    [resources]
  );

  const mentalHealthGroups = useMemo(
    () => groups.filter((g) => g.category === "grief_support" || g.category === "trauma_survivors"),
    [groups]
  );

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "crisis", label: "Crisis Lines", icon: <PhoneIcon className="h-4 w-4" /> },
    { id: "services", label: "Professional Services", icon: <UserIcon className="h-4 w-4" /> },
    { id: "groups", label: "Support Groups", icon: <UsersIcon className="h-4 w-4" /> },
    { id: "self-help", label: "Self-Help", icon: <BookIcon className="h-4 w-4" /> },
  ];

  if (loading) {
    return <LoadingFallback />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <nav className="text-sm text-gray-500 mb-2">
          <Link href="/family-support" className="hover:text-cyan-600">
            Family Support
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">Mental Health Resources</span>
        </nav>
        <h1 className="text-2xl font-semibold text-gray-900">Mental Health Resources</h1>
        <p className="text-sm text-gray-500 mt-1">
          Comprehensive mental health support for families of missing persons
        </p>
      </div>

      {/* Emergency Banner */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-2 bg-red-100 rounded-lg">
            <AlertIcon className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h2 className="font-semibold text-red-900">In Crisis?</h2>
            <p className="text-sm text-red-700 mt-1">
              If you or someone you know is in immediate danger or having thoughts of suicide,
              please call <span className="font-bold">911</span> or the{" "}
              <span className="font-bold">National Crisis Line: 1-833-456-4566</span> (available 24/7).
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="tel:911"
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                <PhoneIcon className="h-4 w-4" />
                Call 911
              </a>
              <a
                href="tel:1-833-456-4566"
                className="inline-flex items-center gap-2 rounded-lg bg-white border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                <PhoneIcon className="h-4 w-4" />
                Crisis Line
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-cyan-600 text-cyan-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "crisis" && (
          <CrisisLinesSection resources={[...mentalHealthResources, ...griefResources]} />
        )}
        {activeTab === "services" && (
          <ProfessionalServicesSection resources={mentalHealthResources} />
        )}
        {activeTab === "groups" && (
          <SupportGroupsSection groups={mentalHealthGroups} />
        )}
        {activeTab === "self-help" && <SelfHelpSection />}
      </div>
    </div>
  );
}

function CrisisLinesSection({ resources }: { resources: SupportResource[] }) {
  const crisisLines = resources.filter((r) => r.is_available_24_7);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyPhone = async (id: string, phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setCopiedId(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        These crisis lines are available 24/7 and staffed by trained counselors who understand the
        unique challenges faced by families of missing persons.
      </p>

      {crisisLines.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-500">Loading crisis resources...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {crisisLines.map((resource) => {
            const phone = resource.toll_free_phone || resource.phone || "";
            return (
              <div
                key={resource.id}
                className="rounded-xl border border-gray-200 bg-white p-5 hover:border-cyan-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{resource.name}</h3>
                    {resource.organization && (
                      <p className="text-xs text-gray-500">{resource.organization}</p>
                    )}
                    <p className="text-sm text-gray-600 mt-2">{resource.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        24/7 Available
                      </span>
                      {resource.languages.map((lang) => (
                        <span
                          key={lang}
                          className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
                        >
                          {lang.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {phone && (
                    <>
                      <a
                        href={`tel:${phone.replace(/\D/g, "")}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
                      >
                        <PhoneIcon className="h-4 w-4" />
                        {phone}
                      </a>
                      <button
                        onClick={() => copyPhone(resource.id, phone)}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {copiedId === resource.id ? "Copied!" : "Copy"}
                      </button>
                    </>
                  )}
                  {resource.website && (
                    <a
                      href={resource.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <GlobeIcon className="h-4 w-4" />
                      Website
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProfessionalServicesSection({ resources }: { resources: SupportResource[] }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Professional mental health services specializing in trauma, grief, and family support.
        Many offer sliding scale fees or accept insurance.
      </p>

      <div className="grid grid-cols-1 gap-4">
        {resources.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
            <h3 className="font-medium text-gray-900">Finding Professional Help</h3>
            <p className="text-sm text-gray-600 mt-2">
              When searching for a mental health professional, consider:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                Look for therapists specializing in trauma, grief, or family therapy
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                Ask about experience with ambiguous loss (uncertainty about a loved one)
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                Consider virtual therapy options for flexibility
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                Check if they offer sliding scale fees or accept your insurance
              </li>
            </ul>
          </div>
        ) : (
          resources.map((resource) => (
            <div
              key={resource.id}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{resource.name}</h3>
                  {resource.organization && (
                    <p className="text-sm text-gray-500">{resource.organization}</p>
                  )}
                </div>
                {resource.is_available_24_7 && (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    24/7
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-2">{resource.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(resource.toll_free_phone || resource.phone) && (
                  <a
                    href={`tel:${(resource.toll_free_phone || resource.phone || "").replace(/\D/g, "")}`}
                    className="inline-flex items-center gap-2 text-sm text-cyan-600 hover:text-cyan-700"
                  >
                    <PhoneIcon className="h-4 w-4" />
                    {resource.toll_free_phone || resource.phone}
                  </a>
                )}
                {resource.website && (
                  <a
                    href={resource.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-cyan-600 hover:text-cyan-700"
                  >
                    <GlobeIcon className="h-4 w-4" />
                    Visit Website
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* External Resources */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h3 className="font-medium text-gray-900 mb-3">Find a Therapist</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <a
            href="https://www.psychologytoday.com/ca/therapists"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-cyan-300 transition-colors"
          >
            <GlobeIcon className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Psychology Today</span>
          </a>
          <a
            href="https://cmha.ca/find-help/find-cmha-in-your-area/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-cyan-300 transition-colors"
          >
            <GlobeIcon className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">CMHA Directory</span>
          </a>
          <a
            href="https://www.cpa.ca/public/findapsychologist/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-cyan-300 transition-colors"
          >
            <GlobeIcon className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">CPA Find a Psychologist</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function SupportGroupsSection({ groups }: { groups: SupportGroup[] }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Connect with others who understand what you are going through. Support groups provide a safe
        space to share experiences and find comfort in community.
      </p>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-medium text-gray-900">Support Groups Coming Soon</h3>
          <p className="text-sm text-gray-500 mt-1">
            We are working to connect you with local and virtual support groups.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-gray-900">{group.name}</h3>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    group.meeting_format === "virtual"
                      ? "bg-purple-100 text-purple-800"
                      : group.meeting_format === "in_person"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  )}
                >
                  {group.meeting_format === "virtual"
                    ? "Virtual"
                    : group.meeting_format === "in_person"
                    ? "In-Person"
                    : "Hybrid"}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">{group.description}</p>
              {group.organizer && (
                <p className="text-xs text-gray-500 mt-2">Organized by: {group.organizer}</p>
              )}
              {group.frequency && (
                <p className="text-xs text-gray-500">Meets: {group.frequency}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                {group.contact_phone && (
                  <a
                    href={`tel:${group.contact_phone}`}
                    className="text-sm text-cyan-600 hover:text-cyan-700"
                  >
                    {group.contact_phone}
                  </a>
                )}
                {group.contact_email && (
                  <a
                    href={`mailto:${group.contact_email}`}
                    className="text-sm text-cyan-600 hover:text-cyan-700"
                  >
                    {group.contact_email}
                  </a>
                )}
              </div>
              {group.is_free && (
                <span className="inline-flex items-center mt-3 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  Free
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SelfHelpSection() {
  const selfHelpResources = [
    {
      title: "Coping with Uncertainty",
      description: "Strategies for managing anxiety when a loved one is missing",
      icon: <BrainIcon className="h-6 w-6" />,
      tips: [
        "Practice grounding techniques when feeling overwhelmed",
        "Establish a daily routine to maintain stability",
        "Limit news and social media exposure when needed",
        "Connect with others who understand your experience",
      ],
    },
    {
      title: "Self-Care During Crisis",
      description: "Taking care of yourself helps you stay strong",
      icon: <HeartIcon className="h-6 w-6" />,
      tips: [
        "Ensure you are eating and staying hydrated",
        "Try to get rest, even if sleep is difficult",
        "Accept help from friends and family",
        "Take breaks from the search when needed",
      ],
    },
    {
      title: "Managing Grief and Loss",
      description: "Resources for ambiguous loss and complicated grief",
      icon: <CloudIcon className="h-6 w-6" />,
      tips: [
        "Acknowledge that your feelings are valid",
        "Allow yourself to experience the full range of emotions",
        "Consider joining a support group",
        "Seek professional help if grief becomes overwhelming",
      ],
    },
    {
      title: "Supporting Children",
      description: "Age-appropriate ways to help children cope",
      icon: <ChildIcon className="h-6 w-6" />,
      tips: [
        "Be honest but age-appropriate about the situation",
        "Maintain routines as much as possible",
        "Encourage children to express their feelings",
        "Consider professional support for children showing distress",
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-800">
          These self-help resources complement but do not replace professional support. If you are
          struggling, please reach out to a mental health professional or crisis line.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {selfHelpResources.map((resource, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-3 bg-cyan-50 rounded-lg text-cyan-600">
                {resource.icon}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{resource.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{resource.description}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {resource.tips.map((tip, tipIndex) => (
                <li key={tipIndex} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* External Resources */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Additional Resources</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="https://cmha.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-white rounded-lg border border-gray-200 hover:border-cyan-300 transition-colors"
          >
            <h4 className="font-medium text-gray-900">CMHA</h4>
            <p className="text-sm text-gray-500">Canadian Mental Health Association</p>
          </a>
          <a
            href="https://kidshelpphone.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-white rounded-lg border border-gray-200 hover:border-cyan-300 transition-colors"
          >
            <h4 className="font-medium text-gray-900">Kids Help Phone</h4>
            <p className="text-sm text-gray-500">Support for young people</p>
          </a>
          <a
            href="https://talksuicide.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-white rounded-lg border border-gray-200 hover:border-cyan-300 transition-colors"
          >
            <h4 className="font-medium text-gray-900">Talk Suicide Canada</h4>
            <p className="text-sm text-gray-500">Suicide prevention service</p>
          </a>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mt-2" />
      </div>
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 h-32 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-5 h-48 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function MentalHealthResourcesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MentalHealthContent />
    </Suspense>
  );
}

// Icons
function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
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

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function CloudIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z" />
    </svg>
  );
}

function ChildIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
    </svg>
  );
}
