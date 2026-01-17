"use client";

import { cn } from "@/lib";
import type { TrainingBadge } from "@/types/training.types";

interface BadgeDisplayProps {
  badge: TrainingBadge;
  earned?: boolean;
  earnedAt?: string;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
  className?: string;
}

export function BadgeDisplay({
  badge,
  earned = false,
  earnedAt,
  size = "md",
  showDetails = false,
  className,
}: BadgeDisplayProps) {
  const sizes = {
    sm: {
      container: "w-12 h-12",
      icon: "h-6 w-6",
      text: "text-xs",
    },
    md: {
      container: "w-16 h-16",
      icon: "h-8 w-8",
      text: "text-sm",
    },
    lg: {
      container: "w-24 h-24",
      icon: "h-12 w-12",
      text: "text-base",
    },
  };

  const { container, icon, text } = sizes[size];

  const badgeColors = {
    completion: {
      bg: earned ? "bg-green-100" : "bg-gray-100",
      icon: earned ? "text-green-600" : "text-gray-400",
      ring: earned ? "ring-green-300" : "ring-gray-200",
    },
    achievement: {
      bg: earned ? "bg-purple-100" : "bg-gray-100",
      icon: earned ? "text-purple-600" : "text-gray-400",
      ring: earned ? "ring-purple-300" : "ring-gray-200",
    },
    milestone: {
      bg: earned ? "bg-yellow-100" : "bg-gray-100",
      icon: earned ? "text-yellow-600" : "text-gray-400",
      ring: earned ? "ring-yellow-300" : "ring-gray-200",
    },
  };

  const colors = badgeColors[badge.badgeType] || badgeColors.completion;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        className={cn(
          "rounded-full flex items-center justify-center ring-4 transition-all",
          container,
          colors.bg,
          colors.ring,
          !earned && "opacity-50"
        )}
        title={badge.description}
      >
        {badge.iconUrl ? (
          <img src={badge.iconUrl} alt={badge.name} className={cn(icon, !earned && "grayscale")} />
        ) : (
          <BadgeIcon className={cn(icon, colors.icon)} type={badge.badgeType} />
        )}
      </div>

      {showDetails && (
        <div className="mt-2 text-center">
          <p className={cn("font-medium text-gray-900", text)}>{badge.name}</p>
          {earnedAt && (
            <p className="text-xs text-gray-500">
              {new Date(earnedAt).toLocaleDateString()}
            </p>
          )}
          {badge.points > 0 && earned && (
            <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">
              <StarIcon className="h-3 w-3" />
              {badge.points}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function BadgeIcon({ className, type }: { className?: string; type: string }) {
  if (type === "achievement") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
      </svg>
    );
  }

  if (type === "milestone") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
      </svg>
    );
  }

  // Default: completion
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
