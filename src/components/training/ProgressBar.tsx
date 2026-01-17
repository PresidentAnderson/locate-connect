"use client";

import { cn } from "@/lib";

interface ProgressBarProps {
  percentage: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  color?: string;
  className?: string;
}

export function ProgressBar({
  percentage,
  size = "md",
  showLabel = false,
  color = "cyan",
  className,
}: ProgressBarProps) {
  const heights = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  const colorClasses = {
    cyan: "bg-cyan-600",
    green: "bg-green-600",
    blue: "bg-blue-600",
    purple: "bg-purple-600",
    red: "bg-red-600",
    yellow: "bg-yellow-500",
  };

  const bgColor = colorClasses[color as keyof typeof colorClasses] || "bg-cyan-600";

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={cn("bg-gray-200 rounded-full overflow-hidden", heights[size])}>
        <div
          className={cn("h-full transition-all duration-300", bgColor)}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
}
