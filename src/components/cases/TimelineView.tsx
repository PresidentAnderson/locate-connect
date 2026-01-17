"use client";

import { cn } from "@/lib";

export interface TimelineEvent {
  id: string;
  date: string;
  time: string;
  event: string;
  icon: string;
  type?: "update" | "lead" | "action" | "escalation" | "other";
}

export interface TimelineViewProps {
  events: TimelineEvent[];
  className?: string;
}

export function TimelineView({ events, className }: TimelineViewProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {events.map((event) => (
        <TimelineItem key={event.id} {...event} />
      ))}
    </div>
  );
}

interface TimelineItemProps {
  date: string;
  time: string;
  event: string;
  icon: string;
  type?: string;
}

function TimelineItem({ date, time, event, icon }: TimelineItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
        <span>{icon}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">{event}</p>
        <p className="text-xs text-gray-500">
          {date} at {time}
        </p>
      </div>
    </div>
  );
}
