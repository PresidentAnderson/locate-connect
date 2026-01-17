"use client";

import { cn } from "@/lib";

export interface Resource {
  id: string;
  icon: string;
  title: string;
  count: number;
  status: string;
  type: "hospital" | "shelter" | "police" | "transit" | "other";
}

export interface ResourceGridProps {
  resources: Resource[];
  location?: string;
  className?: string;
}

export function ResourceGrid({ resources, location, className }: ResourceGridProps) {
  return (
    <div className={className}>
      {location && (
        <p className="text-sm text-gray-500 mb-4">
          Based on last known location: {location}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {resources.map((resource) => (
          <ResourceCard key={resource.id} {...resource} />
        ))}
      </div>
    </div>
  );
}

interface ResourceCardProps {
  icon: string;
  title: string;
  count: number;
  status: string;
}

function ResourceCard({ icon, title, count, status }: ResourceCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="font-medium text-gray-900">{title}</p>
          <p className="text-sm text-gray-500">{count} nearby</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-400">{status}</p>
    </div>
  );
}
