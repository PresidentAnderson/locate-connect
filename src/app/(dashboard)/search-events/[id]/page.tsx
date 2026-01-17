"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { SearchPartyCoordinator } from "@/components/volunteer";
import type { SearchEventDashboard } from "@/types/volunteer.types";

export default function SearchEventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [data, setData] = useState<SearchEventDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) {
      fetchEventData();
    }
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/search-events/${eventId}/dashboard`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch event data");
      }

      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err) {
      console.error("Error fetching event data:", err);
      setError(err instanceof Error ? err.message : "Failed to load event");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Event</h2>
          <p className="text-gray-600">{error || "Event not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SearchPartyCoordinator eventId={eventId} initialData={data} />
      </div>
    </div>
  );
}
