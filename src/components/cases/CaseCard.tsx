"use client";

import { cn } from "@/lib";
import Link from "next/link";
import type { CaseStatus, PriorityLevel } from "@/types";

export interface CaseCardProps {
  id: string;
  caseNumber: string;
  firstName: string;
  lastName: string;
  priorityLevel: PriorityLevel;
  status: CaseStatus;
  age?: number;
  lastSeenLocation?: string;
  lastSeenDate: string;
  photoUrl?: string;
  riskFactors?: string[];
  className?: string;
}

const priorityConfig = {
  p0_critical: { 
    bg: "bg-red-100", 
    text: "text-red-700", 
    label: "PRIORITY 0",
    border: "border-red-200"
  },
  p1_high: { 
    bg: "bg-orange-100", 
    text: "text-orange-700", 
    label: "PRIORITY 1",
    border: "border-orange-200"
  },
  p2_medium: { 
    bg: "bg-yellow-100", 
    text: "text-yellow-700", 
    label: "PRIORITY 2",
    border: "border-yellow-200"
  },
  p3_low: { 
    bg: "bg-blue-100", 
    text: "text-blue-700", 
    label: "PRIORITY 3",
    border: "border-blue-200"
  },
  p4_routine: { 
    bg: "bg-gray-100", 
    text: "text-gray-700", 
    label: "PRIORITY 4",
    border: "border-gray-200"
  },
} as const;

const riskFactorConfig = {
  medical: { bg: "bg-red-100", text: "text-red-700" },
  mental: { bg: "bg-orange-100", text: "text-orange-700" },
  financial: { bg: "bg-yellow-100", text: "text-yellow-700" },
  default: { bg: "bg-gray-100", text: "text-gray-700" },
};

export function CaseCard({
  id,
  caseNumber,
  firstName,
  lastName,
  priorityLevel,
  status,
  age,
  lastSeenLocation,
  lastSeenDate,
  photoUrl,
  riskFactors = [],
  className,
}: CaseCardProps) {
  const priority = priorityConfig[priorityLevel];
  
  const displayName = `${firstName} ${lastName.charAt(0)}.`;
  
  const getTimeSinceLastSeen = (dateStr: string) => {
    const lastSeen = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return `Missing ${diffHours}+ hours`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `Missing ${diffDays}+ days`;
  };

  const getRiskFactorStyle = (factor: string) => {
    const lowerFactor = factor.toLowerCase();
    if (lowerFactor.includes("medical") || lowerFactor.includes("medication")) {
      return riskFactorConfig.medical;
    }
    if (lowerFactor.includes("mental") || lowerFactor.includes("health")) {
      return riskFactorConfig.mental;
    }
    if (lowerFactor.includes("financial") || lowerFactor.includes("resources")) {
      return riskFactorConfig.financial;
    }
    return riskFactorConfig.default;
  };

  return (
    <div className={cn(
      "rounded-xl border-2 bg-cyan-50 p-6",
      priority.border,
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {photoUrl ? (
            <img 
              src={photoUrl} 
              alt={displayName}
              className="h-20 w-20 rounded-lg object-cover bg-gray-300" 
            />
          ) : (
            <div className="h-20 w-20 rounded-lg bg-gray-300" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-xs font-bold",
                priority.bg,
                priority.text
              )}>
                {priority.label}
              </span>
            </div>
            <p className="text-sm text-gray-600">Case #{caseNumber}</p>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
              {age && <span>Age: {age}</span>}
              {age && lastSeenLocation && <span>•</span>}
              {lastSeenLocation && <span>Last seen: {lastSeenLocation}</span>}
              {(age || lastSeenLocation) && <span>•</span>}
              <span className="font-medium text-red-600">
                {getTimeSinceLastSeen(lastSeenDate)}
              </span>
            </div>
          </div>
        </div>
        <Link
          href={`/cases/${id}`}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          View Details
        </Link>
      </div>

      {/* Risk Factors */}
      {riskFactors.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {riskFactors.map((factor, index) => {
            const style = getRiskFactorStyle(factor);
            return (
              <span 
                key={index}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  style.bg,
                  style.text
                )}
              >
                {factor}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
