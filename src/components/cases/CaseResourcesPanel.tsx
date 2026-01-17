"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib";

interface CaseResourcesPanelProps {
  province?: string | null;
}

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

export default function CaseResourcesPanel({ province }: CaseResourcesPanelProps) {
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

  const crisisLink = province
    ? `/family-support/crisis?province=${province}`
    : "/family-support/crisis";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Crisis resources</h2>
          <p className="text-sm text-gray-500">
            Crisis lines and counseling support tailored to the case location.
          </p>
        </div>
        <Link
          href={crisisLink}
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Open crisis mode
        </Link>
      </div>

      <div className="mt-4 space-y-3">
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
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{resource.name}</p>
                  <p className="text-xs text-gray-500">{resource.description}</p>
                  <p className="text-xs text-gray-500">
                    {resource.is_available_24_7 ? "24/7" : "Scheduled"} • Languages: {resource.languages.join(", ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">
                    {phone || "No phone listed"}
                  </p>
                  {phone ? (
                    <button
                      type="button"
                      onClick={() => copyPhone(resource.id, phone)}
                      className={cn(
                        "mt-1 rounded-lg px-3 py-1 text-xs font-medium",
                        copiedId === resource.id
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      {copiedId === resource.id ? "Copied" : "Copy"}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
