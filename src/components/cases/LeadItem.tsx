"use client";

import { cn } from "@/lib";

export interface LeadItemProps {
  type: "email" | "social" | "witness" | "location" | "hospital" | "detention" | "other";
  title: string;
  description: string;
  time: string;
  status: "new" | "investigating" | "verified" | "dismissed";
  className?: string;
}

const statusConfig = {
  new: { bg: "bg-blue-100", text: "text-blue-700", label: "New" },
  investigating: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Investigating" },
  verified: { bg: "bg-green-100", text: "text-green-700", label: "Verified" },
  dismissed: { bg: "bg-gray-100", text: "text-gray-700", label: "Dismissed" },
} as const;

const typeIcons = {
  email: "📧",
  social: "📱",
  witness: "👁️",
  location: "📍",
  hospital: "🏥",
  detention: "🏛️",
  other: "ℹ️",
} as const;

export function LeadItem({
  type,
  title,
  description,
  time,
  status,
  className,
}: LeadItemProps) {
  const config = statusConfig[status];
  const icon = typeIcons[type];

  return (
    <div className={cn("rounded-lg border border-gray-200 p-4", className)}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{icon}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">{title}</h4>
            <span className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              config.bg,
              config.text
            )}>
              {config.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
          <p className="mt-1 text-xs text-gray-400">{time}</p>
        </div>
      </div>
    </div>
  );
}
