"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib";

interface SupportResource {
  id: string;
  name: string;
  description: string;
  category: string;
  toll_free_phone?: string | null;
  phone?: string | null;
  languages: string[];
  is_available_24_7: boolean;
}

const allowedCategories = new Set(["mental_health", "grief", "peer_support"]);

function CrisisResourcesContent() {
  const searchParams = useSearchParams();
  const province = searchParams.get("province");
  const [resources, setResources] = useState<SupportResource[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchResources = async () => {
      const params = new URLSearchParams();
      if (province) params.append("province", province);
      const response = await fetch(`/api/family/resources?${params.toString()}`);
      if (!response.ok) return;
      const payload = (await response.json()) as { data: SupportResource[] };
      setResources(payload.data ?? []);
    };

    void fetchResources();
  }, [province]);

  const crisisResources = useMemo(
    () => resources.filter((resource) => allowedCategories.has(resource.category)),
    [resources]
  );

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
    <div className="space-y-6">
      <div>
        <nav className="text-sm text-gray-500 mb-2">
          <Link href="/family-support" className="hover:text-cyan-600">
            Family Support
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">Crisis Mode</span>
        </nav>
        <h1 className="text-2xl font-semibold text-gray-900">Crisis Resources</h1>
        <p className="text-sm text-gray-500">
          Immediate support for families and responders during high-stress moments.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        If there is immediate danger, contact local emergency services.
      </div>

      <div className="space-y-4">
        {crisisResources.length === 0 ? (
          <p className="text-sm text-gray-500">
            No crisis resources available yet for this location.
          </p>
        ) : (
          crisisResources.map((resource) => {
            const phone = resource.toll_free_phone || resource.phone || "";
            return (
              <div
                key={resource.id}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{resource.name}</h2>
                    <p className="text-sm text-gray-500">{resource.description}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {resource.is_available_24_7 ? "24/7" : "Scheduled"} • Languages: {resource.languages.join(", ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold text-gray-800">
                      {phone || "No phone listed"}
                    </p>
                    {phone ? (
                      <button
                        type="button"
                        onClick={() => copyPhone(resource.id, phone)}
                        className={cn(
                          "mt-2 rounded-lg px-4 py-2 text-xs font-medium",
                          copiedId === resource.id
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        {copiedId === resource.id ? "Copied" : "Copy number"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mt-2" />
      </div>
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 h-12 animate-pulse" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 h-24 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function CrisisResourcesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CrisisResourcesContent />
    </Suspense>
  );
}
