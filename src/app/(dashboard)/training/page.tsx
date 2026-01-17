"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "@/hooks/useTranslations";
import type {
  TrainingTrackWithProgress,
  TrainingCertification,
  UserBadge,
  TrainingStats,
} from "@/types/training.types";

interface DashboardData {
  tracks: TrainingTrackWithProgress[];
  recentActivity: { track?: TrainingTrackWithProgress; last_activity_at: string }[];
  certifications: TrainingCertification[];
  badges: UserBadge[];
  stats: TrainingStats;
  recommendations: {
    type: string;
    priority: string;
    message: string;
    track?: TrainingTrackWithProgress;
  }[];
}

export default function TrainingPage() {
  const t = useTranslations("common");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "tracks" | "certifications" | "badges">("overview");

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await fetch("/api/training/dashboard");
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch training dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: <HomeIcon className="h-4 w-4" /> },
    { id: "tracks", label: "Training Tracks", icon: <AcademicCapIcon className="h-4 w-4" /> },
    { id: "certifications", label: "Certifications", icon: <CertificateIcon className="h-4 w-4" /> },
    { id: "badges", label: "Badges", icon: <BadgeIcon className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training & Onboarding</h1>
          <p className="text-sm text-gray-500">
            Learn how to use LocateConnect effectively
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Tracks Completed"
            value={data.stats.totalTracksCompleted}
            icon={<CheckCircleIcon className="h-6 w-6 text-green-500" />}
          />
          <StatCard
            label="Active Certifications"
            value={data.stats.activeCertifications}
            icon={<CertificateIcon className="h-6 w-6 text-blue-500" />}
          />
          <StatCard
            label="Badges Earned"
            value={data.stats.totalBadgesEarned}
            icon={<BadgeIcon className="h-6 w-6 text-purple-500" />}
          />
          <StatCard
            label="Time Spent"
            value={`${data.stats.totalTimeSpentMinutes}m`}
            icon={<ClockIcon className="h-6 w-6 text-cyan-500" />}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-cyan-600 text-cyan-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && data && (
        <OverviewTab data={data} />
      )}

      {activeTab === "tracks" && data && (
        <TracksTab tracks={data.tracks} />
      )}

      {activeTab === "certifications" && data && (
        <CertificationsTab certifications={data.certifications} />
      )}

      {activeTab === "badges" && data && (
        <BadgesTab badges={data.badges} />
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        {icon}
      </div>
    </div>
  );
}

function OverviewTab({ data }: { data: DashboardData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Recommendations */}
        {data.recommendations.length > 0 && (
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-800 mb-4">Recommended Next Steps</h2>
            <div className="space-y-3">
              {data.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    rec.priority === "high" ? "bg-white border border-cyan-300" : "bg-cyan-100/50"
                  }`}
                >
                  <p className="text-gray-900">{rec.message}</p>
                  {rec.track && (
                    <Link
                      href={`/training/tracks/${rec.track.id}`}
                      className="mt-2 inline-flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700"
                    >
                      Start Now
                      <ArrowRightIcon className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* In Progress Tracks */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Continue Learning</h2>
          <div className="space-y-4">
            {data.tracks
              .filter((t) => t.progress?.status === "in_progress")
              .map((track) => (
                <TrackProgressCard key={track.id} track={track} />
              ))}
            {data.tracks.filter((t) => t.progress?.status === "in_progress").length === 0 && (
              <p className="text-gray-500 text-sm">No tracks in progress. Start a new track below!</p>
            )}
          </div>
        </div>

        {/* Available Tracks */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Training</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.tracks
              .filter((t) => !t.progress || t.progress.status === "not_started")
              .slice(0, 4)
              .map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {data.recentActivity?.slice(0, 5).map((activity, index) => (
              <div key={index} className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-cyan-500" />
                <div>
                  <p className="text-gray-900">{activity.track?.title}</p>
                  <p className="text-gray-500 text-xs">
                    {new Date(activity.last_activity_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {(!data.recentActivity || data.recentActivity.length === 0) && (
              <p className="text-gray-500 text-sm">No recent activity</p>
            )}
          </div>
        </div>

        {/* Recent Badges */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Badges</h2>
          <div className="flex flex-wrap gap-2">
            {data.badges?.slice(0, 4).map((userBadge) => (
              <div
                key={userBadge.id}
                className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg"
                title={userBadge.badge?.description}
              >
                <BadgeIcon className="h-5 w-5 text-purple-600" />
                <span className="text-sm text-purple-800">{userBadge.badge?.name}</span>
              </div>
            ))}
            {(!data.badges || data.badges.length === 0) && (
              <p className="text-gray-500 text-sm">Complete training to earn badges!</p>
            )}
          </div>
        </div>

        {/* Certifications Preview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Certifications</h2>
          <div className="space-y-3">
            {data.certifications
              ?.filter((c) => c.status === "active")
              .slice(0, 3)
              .map((cert) => (
                <div key={cert.id} className="p-3 bg-green-50 rounded-lg">
                  <p className="font-medium text-green-800">{cert.track?.title}</p>
                  <p className="text-xs text-green-600">
                    Expires: {cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString() : "Never"}
                  </p>
                </div>
              ))}
            {(!data.certifications ||
              data.certifications.filter((c) => c.status === "active").length === 0) && (
              <p className="text-gray-500 text-sm">Complete certification tracks to earn certifications!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TracksTab({ tracks }: { tracks: TrainingTrackWithProgress[] }) {
  const [filter, setFilter] = useState<"all" | "public" | "law_enforcement" | "admin">("all");

  const filteredTracks = filter === "all" ? tracks : tracks.filter((t) => t.audience === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {["all", "public", "law_enforcement", "admin"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as typeof filter)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
              filter === f ? "bg-cyan-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f === "law_enforcement" ? "Law Enforcement" : f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTracks.map((track) => (
          <TrackCard key={track.id} track={track} showDetails />
        ))}
      </div>
    </div>
  );
}

function CertificationsTab({ certifications }: { certifications: TrainingCertification[] }) {
  if (!certifications || certifications.length === 0) {
    return (
      <div className="text-center py-12">
        <CertificateIcon className="h-16 w-16 text-gray-300 mx-auto" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No Certifications Yet</h3>
        <p className="mt-2 text-gray-500">Complete certification tracks to earn your first certification.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {certifications.map((cert) => (
        <div
          key={cert.id}
          className={`bg-white rounded-lg border p-6 ${
            cert.status === "active" ? "border-green-300" : "border-gray-200"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{cert.track?.title}</h3>
              <p className="text-sm text-gray-500">Certificate #{cert.certificateNumber}</p>
            </div>
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                cert.status === "active"
                  ? "bg-green-100 text-green-800"
                  : cert.status === "expired"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {cert.status}
            </span>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <p className="flex justify-between">
              <span className="text-gray-500">Issued:</span>
              <span className="text-gray-900">{new Date(cert.issuedAt).toLocaleDateString()}</span>
            </p>
            {cert.expiresAt && (
              <p className="flex justify-between">
                <span className="text-gray-500">Expires:</span>
                <span className="text-gray-900">{new Date(cert.expiresAt).toLocaleDateString()}</span>
              </p>
            )}
            {cert.finalScorePercentage && (
              <p className="flex justify-between">
                <span className="text-gray-500">Final Score:</span>
                <span className="text-gray-900">{cert.finalScorePercentage}%</span>
              </p>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <button className="flex-1 px-3 py-2 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700">
              View Certificate
            </button>
            {cert.status === "expired" && (
              <Link
                href={`/training/tracks/${cert.trackId}`}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 text-center"
              >
                Renew
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function BadgesTab({ badges }: { badges: UserBadge[] }) {
  if (!badges || badges.length === 0) {
    return (
      <div className="text-center py-12">
        <BadgeIcon className="h-16 w-16 text-gray-300 mx-auto" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No Badges Yet</h3>
        <p className="mt-2 text-gray-500">Complete training modules to earn badges.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {badges.map((userBadge) => (
        <div
          key={userBadge.id}
          className="bg-white rounded-lg border border-gray-200 p-6 text-center hover:shadow-md transition-shadow"
        >
          <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
            <BadgeIcon className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="mt-4 font-semibold text-gray-900">{userBadge.badge?.name}</h3>
          <p className="mt-1 text-sm text-gray-500">{userBadge.badge?.description}</p>
          <p className="mt-2 text-xs text-gray-400">
            Earned {new Date(userBadge.earnedAt).toLocaleDateString()}
          </p>
          {userBadge.badge?.points && userBadge.badge.points > 0 && (
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
              <StarIcon className="h-3 w-3" />
              {userBadge.badge.points} pts
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TrackCard({ track, showDetails = false }: { track: TrainingTrackWithProgress; showDetails?: boolean }) {
  const getStatusBadge = () => {
    if (track.progress?.status === "completed") {
      return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Completed</span>;
    }
    if (track.progress?.status === "in_progress") {
      return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">In Progress</span>;
    }
    if (track.isRequired) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Required</span>;
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: track.color ? `${track.color}20` : "#06b6d420" }}
        >
          <AcademicCapIcon
            className="h-6 w-6"
            style={{ color: track.color || "#0891b2" }}
          />
        </div>
        {getStatusBadge()}
      </div>
      <h3 className="mt-4 font-semibold text-gray-900">{track.title}</h3>
      {track.description && (
        <p className="mt-1 text-sm text-gray-500 line-clamp-2">{track.description}</p>
      )}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <ClockIcon className="h-4 w-4" />
          {track.estimatedDurationMinutes} min
        </span>
        {track.isCertificationTrack && (
          <span className="flex items-center gap-1">
            <CertificateIcon className="h-4 w-4" />
            Certification
          </span>
        )}
      </div>
      {track.progress && track.progress.progressPercentage > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{track.progress.progressPercentage}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-600 transition-all"
              style={{ width: `${track.progress.progressPercentage}%` }}
            />
          </div>
        </div>
      )}
      <Link
        href={`/training/tracks/${track.id}`}
        className="mt-4 block w-full px-4 py-2 bg-cyan-600 text-white text-sm text-center rounded-lg hover:bg-cyan-700 transition-colors"
      >
        {track.progress?.status === "in_progress" ? "Continue" : "Start Training"}
      </Link>
    </div>
  );
}

function TrackProgressCard({ track }: { track: TrainingTrackWithProgress }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: track.color ? `${track.color}20` : "#06b6d420" }}
      >
        <AcademicCapIcon
          className="h-7 w-7"
          style={{ color: track.color || "#0891b2" }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900">{track.title}</h3>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-600 transition-all"
              style={{ width: `${track.progress?.progressPercentage || 0}%` }}
            />
          </div>
          <span className="text-sm text-gray-500">{track.progress?.progressPercentage || 0}%</span>
        </div>
      </div>
      <Link
        href={`/training/tracks/${track.id}`}
        className="px-4 py-2 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700 transition-colors"
      >
        Continue
      </Link>
    </div>
  );
}

// Icons
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function AcademicCapIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
    </svg>
  );
}

function CertificateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
    </svg>
  );
}

function BadgeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
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
