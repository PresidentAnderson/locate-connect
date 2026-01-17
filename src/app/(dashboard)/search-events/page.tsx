"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SEARCH_EVENT_STATUSES } from "@/types/volunteer.types";

interface SearchEvent {
  id: string;
  case_id: string;
  name: string;
  description?: string;
  status: string;
  event_date: string;
  start_time: string;
  meeting_point_address: string;
  current_volunteers: number;
  max_volunteers?: number;
  difficulty_level: string;
  terrain_type: string[];
}

export default function SearchEventsPage() {
  const [events, setEvents] = useState<SearchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "active">("all");

  useEffect(() => {
    fetchEvents();
  }, [filter]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      let url = "/api/search-events?limit=50";
      
      if (filter === "active") {
        url += `&status=${SEARCH_EVENT_STATUSES.IN_PROGRESS}`;
      } else if (filter === "upcoming") {
        url += `&status=${SEARCH_EVENT_STATUSES.REGISTRATION_OPEN}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        setEvents(result.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch search events:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      planning: "bg-gray-100 text-gray-800",
      registration_open: "bg-blue-100 text-blue-800",
      in_progress: "bg-green-100 text-green-800",
      completed: "bg-cyan-100 text-cyan-800",
      cancelled: "bg-red-100 text-red-800",
    };

    const labels: Record<string, string> = {
      planning: "Planning",
      registration_open: "Registration Open",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status] || colors.planning}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Volunteer Search Events</h1>
            <p className="text-gray-600 mt-1">
              Coordinate and manage volunteer search parties
            </p>
          </div>
          <Link
            href="/search-events/new"
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium"
          >
            Create Event
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          {["all", "upcoming", "active"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as typeof filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === f
                  ? "bg-cyan-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
              }`}
            >
              {f === "all" ? "All Events" : f === "upcoming" ? "Upcoming" : "Active"}
            </button>
          ))}
        </div>

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-16 w-16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No search events found
            </h3>
            <p className="text-gray-500">
              Create a search event to coordinate volunteer search parties
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/search-events/${event.id}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {event.name}
                    </h3>
                    {getStatusBadge(event.status)}
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>
                        {new Date(event.event_date).toLocaleDateString()} at {event.start_time}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="line-clamp-1">{event.meeting_point_address}</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span>
                        {event.current_volunteers}
                        {event.max_volunteers ? `/${event.max_volunteers}` : ""} volunteers
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      <span className="capitalize">
                        {event.difficulty_level} • {event.terrain_type.join(", ")}
                      </span>
                    </div>
                  </div>

                  {event.description && (
                    <p className="mt-4 text-sm text-gray-500 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
